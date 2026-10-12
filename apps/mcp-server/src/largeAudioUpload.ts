import { neon } from "@neondatabase/serverless";
import { databaseUrl } from "./databasePolicy.js";

const MAX_PARTS = 16;
const MAX_PART_BYTES = 1_750_000;
const MAX_FILE_BYTES = 25_000_000;
const EXPIRATION_HOURS = 24;

function sqlClient() {
  const url = databaseUrl();
  if (!url) throw new Error("upload_storage_unavailable");
  return neon(url);
}

async function ensureTables(sql: ReturnType<typeof sqlClient>) {
  await sql`
    CREATE TABLE IF NOT EXISTS instantstudy_large_audio_uploads (
      upload_id uuid PRIMARY KEY,
      learner_id text NOT NULL,
      file_name text NOT NULL,
      mime_type text NOT NULL,
      total_parts integer NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS instantstudy_large_audio_daily_quota (
      learner_id text NOT NULL,
      day date NOT NULL,
      accepted integer NOT NULL DEFAULT 0,
      PRIMARY KEY (learner_id, day)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS instantstudy_large_audio_parts (
      upload_id uuid NOT NULL REFERENCES instantstudy_large_audio_uploads(upload_id) ON DELETE CASCADE,
      part_index integer NOT NULL,
      bytes integer NOT NULL,
      data_base64 text NOT NULL,
      PRIMARY KEY (upload_id, part_index)
    )
  `;
}

export type LargeAudioChunkInput = {
  learnerId: string;
  uploadId: string;
  fileName: string;
  mimeType: string;
  totalParts: number;
  partIndex: number;
  inlineBase64: string;
};

export async function storeAudioChunk(input: LargeAudioChunkInput) {
  if (input.totalParts < 1 || input.totalParts > MAX_PARTS ||
      input.partIndex < 0 || input.partIndex >= input.totalParts ||
      input.inlineBase64.length > Math.ceil(MAX_PART_BYTES / 3) * 4 + 8 ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(input.inlineBase64)) {
    throw new Error("audio_upload_chunk_invalid");
  }
  const size = Buffer.from(input.inlineBase64, "base64").byteLength;
  if (!size || size > MAX_PART_BYTES) throw new Error("audio_upload_chunk_invalid");
  const sql = sqlClient();
  await ensureTables(sql);
  await sql`DELETE FROM instantstudy_large_audio_uploads
    WHERE created_at < now() - interval '24 hours'`;

  // Each learner may have at most two pending large imports. This is an
  // additional guard over the external billing entitlement and API rate limit.
  const existing = await sql`
    SELECT upload_id, learner_id, total_parts, file_name
    FROM instantstudy_large_audio_uploads
    WHERE upload_id = ${input.uploadId}::uuid
  `;
  if (!existing.length) {
    const pending = await sql`
      SELECT count(*)::int AS pending FROM instantstudy_large_audio_uploads
      WHERE learner_id = ${input.learnerId}
    `;
    if (Number(pending[0]?.pending || 0) >= 2) throw new Error("audio_upload_pending_limit");
    const admitted = await sql`
      INSERT INTO instantstudy_large_audio_daily_quota(learner_id, day, accepted)
      VALUES (${input.learnerId}, (now() AT TIME ZONE 'UTC')::date, 1)
      ON CONFLICT (learner_id, day) DO UPDATE SET
        accepted = instantstudy_large_audio_daily_quota.accepted + 1
      WHERE instantstudy_large_audio_daily_quota.accepted < 2
      RETURNING accepted
    `;
    if (admitted.length === 0) throw new Error("audio_upload_daily_limit_reached");
    await sql`
      INSERT INTO instantstudy_large_audio_uploads
      (upload_id, learner_id, file_name, mime_type, total_parts)
      VALUES (${input.uploadId}::uuid, ${input.learnerId},
        ${input.fileName}, ${input.mimeType}, ${input.totalParts})
      ON CONFLICT (upload_id) DO NOTHING
    `;
  }
  const identity = await sql`
    SELECT upload_id, learner_id, total_parts, file_name
    FROM instantstudy_large_audio_uploads
    WHERE upload_id = ${input.uploadId}::uuid
  `;
  if (identity.length !== 1 ||
      identity[0].learner_id !== input.learnerId ||
      Number(identity[0].total_parts) !== input.totalParts ||
      identity[0].file_name !== input.fileName) {
    throw new Error("audio_upload_identity_mismatch");
  }
  await sql`
    INSERT INTO instantstudy_large_audio_parts (upload_id, part_index, bytes, data_base64)
    VALUES (${input.uploadId}::uuid, ${input.partIndex}, ${size}, ${input.inlineBase64})
    ON CONFLICT (upload_id, part_index) DO UPDATE SET
      bytes = excluded.bytes,
      data_base64 = excluded.data_base64
  `;
  const totals = await sql`
    SELECT count(*)::int AS received, coalesce(sum(bytes), 0)::bigint AS bytes
    FROM instantstudy_large_audio_parts
    WHERE upload_id = ${input.uploadId}::uuid
  `;
  const bytes = Number(totals[0].bytes);
  if (bytes > MAX_FILE_BYTES) {
    await discardAudioUpload(input.learnerId, input.uploadId);
    throw new Error("audio_upload_too_large");
  }
  return { received: Number(totals[0].received), totalParts: input.totalParts, bytes };
}

export async function loadAudioUpload(learnerId: string, uploadId: string) {
  const sql = sqlClient();
  await ensureTables(sql);
  const meta = await sql`
    SELECT file_name, mime_type, total_parts
    FROM instantstudy_large_audio_uploads
    WHERE upload_id = ${uploadId}::uuid AND learner_id = ${learnerId}
    AND created_at > now() - interval '24 hours'
  `;
  if (!meta.length) throw new Error("audio_upload_not_found");
  const parts = await sql`
    SELECT part_index, bytes, data_base64
    FROM instantstudy_large_audio_parts
    WHERE upload_id = ${uploadId}::uuid
    ORDER BY part_index ASC
  `;
  if (parts.length !== Number(meta[0].total_parts)) throw new Error("audio_upload_incomplete");
  let size = 0;
  const decoded = parts.map((part, index) => {
    if (Number(part.part_index) !== index) throw new Error("audio_upload_incomplete");
    const bytes = Buffer.from(String(part.data_base64), "base64");
    size += bytes.length;
    if (size > MAX_FILE_BYTES) throw new Error("audio_upload_too_large");
    return bytes;
  });
  return {
    fileName: String(meta[0].file_name),
    mimeType: String(meta[0].mime_type),
    bytes: Buffer.concat(decoded),
  };
}

export async function discardAudioUpload(learnerId: string, uploadId: string) {
  const sql = sqlClient();
  await ensureTables(sql);
  await sql`DELETE FROM instantstudy_large_audio_uploads
    WHERE upload_id = ${uploadId}::uuid AND learner_id = ${learnerId}`;
}

export const largeAudioLimits = {
  maxParts: MAX_PARTS, maxPartBytes: MAX_PART_BYTES,
  maxFileBytes: MAX_FILE_BYTES, expirationHours: EXPIRATION_HOURS,
} as const;
