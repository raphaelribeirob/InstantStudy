import { schemaManagedExternally } from "./databasePolicy.js";
import { createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { databaseUrl } from "./databasePolicy.js";

/** Durable atomic daily quota. Fail closed to deterministic assets if unavailable. */
export async function tryConsumeAssetGeneration(learnerId: string): Promise<boolean> {
  const url = databaseUrl();
  if (!url || !learnerId.trim()) return false;
  const sql = neon(url);
  const limit = Math.max(1, Math.min(15, Number.parseInt(
    process.env.INSTANTSTUDY_AI_ASSETS_PER_DAY || "3", 10,
  ) || 3));
  const hashed = createHash("sha256").update(learnerId).digest("hex");
  const day = new Date().toISOString().slice(0, 10);
  try {
    if (!schemaManagedExternally()) await sql`
      CREATE TABLE IF NOT EXISTS instantstudy_ai_assets_quota (
        learner_hash text NOT NULL,
        day date NOT NULL,
        generated integer NOT NULL DEFAULT 0,
        PRIMARY KEY (learner_hash, day)
      )
    `;
    const rows = await sql`
      INSERT INTO instantstudy_ai_assets_quota(learner_hash, day, generated)
      VALUES (${hashed}, ${day}::date, 1)
      ON CONFLICT (learner_hash, day) DO UPDATE SET
        generated = instantstudy_ai_assets_quota.generated + 1
      WHERE instantstudy_ai_assets_quota.generated < ${limit}
      RETURNING generated
    `;
    return rows.length > 0;
  } catch {
    return false;
  }
}
