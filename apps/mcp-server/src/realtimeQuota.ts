import { createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { databaseUrl } from "./databasePolicy.js";

/**
 * Server-enforced, atomic admission counter in durable Neon.
 * Limits new voice conversations (not live-session minutes or raw OpenAI spend).
 * Production requires an OpenAI project-level budget and monitoring as a second guardrail.
 */
export async function consumeRealtimeVoiceStart(learnerId: string) {
  const url = databaseUrl();
  if (!url) throw new Error("realtime_quota_storage_unavailable");

  const sql = neon(url);
  const maxPerDay = Math.max(1, Math.min(10,
    Number.parseInt(process.env.INSTANTSTUDY_REALTIME_SESSIONS_PER_DAY || "3", 10) || 3));
  const identityHash = createHash("sha256").update(learnerId).digest("hex");
  const day = new Date().toISOString().slice(0, 10);
  await sql`
    CREATE TABLE IF NOT EXISTS instantstudy_realtime_quota (
      learner_hash text NOT NULL,
      day date NOT NULL,
      attempts integer NOT NULL DEFAULT 0,
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (learner_hash, day)
    )
  `;
  const rows = await sql`
    INSERT INTO instantstudy_realtime_quota (learner_hash, day, attempts)
    VALUES (${identityHash}, ${day}::date, 1)
    ON CONFLICT (learner_hash, day) DO UPDATE SET
      attempts = instantstudy_realtime_quota.attempts + 1,
      updated_at = now()
    WHERE instantstudy_realtime_quota.attempts < ${maxPerDay}
    RETURNING attempts
  `;
  return {
    allowed: rows.length > 0,
    used: rows.length ? Number(rows[0].attempts) : maxPerDay,
    limit: maxPerDay,
    hashedLearnerId: identityHash,
  };
}
