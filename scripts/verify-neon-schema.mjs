#!/usr/bin/env node
/** Read-only live Neon schema gate. This never prints DATABASE_URL. */
import { neon } from "@neondatabase/serverless";

const connection = process.env.DATABASE_URL?.trim();
if (!connection) {
  console.error("Neon readiness: DATABASE_URL not configured");
  process.exit(2);
}
try {
  const sql = neon(connection);
  const rows = await sql`SELECT current_database() AS database,
    to_regclass('public.instantstudy_sessions')::text AS sessions,
    to_regclass('public.instantstudy_materials')::text AS materials,
    to_regclass('public.instantstudy_sessions_learner_updated_idx')::text AS sessions_index,
    to_regclass('public.instantstudy_materials_learner_updated_idx')::text AS materials_index`;
  const row = rows[0] ?? {};
  const ready = Boolean(row.sessions && row.materials && row.sessions_index && row.materials_index);
  console.log(JSON.stringify({ database: row.database || "unknown", storage: "neon", schemaReady: ready }));
  if (!ready) process.exitCode = 1;
} catch {
  console.error("Neon readiness: schema could not be verified");
  process.exitCode = 1;
}
