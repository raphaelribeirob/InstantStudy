import { createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";

export class DatabaseUnavailableError extends Error {
  constructor() { super("database_not_configured"); }
}
export class IdempotencyConflictError extends Error {
  constructor() { super("event_id_conflict"); }
}
export class CursorNotFoundError extends Error {
  constructor() { super("invalid_sync_cursor"); }
}

// Use a separately configured Instant Cloud Neon database. The caller's
// account identity comes ONLY from verified JWT, not from request JSON.
export function createStore(env = process.env) {
  const sql = env.INSTANT_CLOUD_DATABASE_URL
    ? neon(env.INSTANT_CLOUD_DATABASE_URL)
    : null;
  function db() { if (!sql) throw new DatabaseUnavailableError(); return sql; }

  return {
    async healthy() {
      await db()`SELECT 1 AS ok`;
      return true;
    },

    async addEvent(userId, event) {
      const payload = JSON.stringify({
        product: event.product, kind: event.kind, occurredAt: event.occurredAt,
        sourceId: event.sourceId ?? null, metrics: event.metrics,
      });
      const hash = createHash("sha256").update(payload).digest("hex");
      const q = db();
      const rows = await q`
        INSERT INTO instant_cloud_progress_events
        (user_id, id, product, kind, occurred_at, payload_hash, payload)
        VALUES (${userId}, ${event.eventId}::uuid, ${event.product},
                ${event.kind}, ${event.occurredAt}::timestamptz,
                ${hash}, ${payload}::jsonb)
        ON CONFLICT (user_id, id) DO NOTHING
        RETURNING id
      `;
      if (rows.length) return { eventId: event.eventId, created: true };
      const existing = await q`
        SELECT payload_hash FROM instant_cloud_progress_events
        WHERE user_id = ${userId} AND id = ${event.eventId}::uuid
        LIMIT 1
      `;
      if (!existing.length || existing[0].payload_hash !== hash) {
        throw new IdempotencyConflictError();
      }
      return { eventId: event.eventId, created: false };
    },

    async summary(userId) {
      return db()`
        SELECT product, COUNT(*)::int AS event_count,
          COUNT(*) FILTER (WHERE kind = 'session_completed')::int AS sessions,
          COUNT(*) FILTER (WHERE kind IN ('review_completed', 'practice_completed'))::int AS reviews,
          COALESCE(SUM((payload->'metrics'->>'durationSeconds')::integer), 0)::bigint AS duration_seconds,
          MAX(occurred_at) AS last_activity
        FROM instant_cloud_progress_events
        WHERE user_id = ${userId}
        GROUP BY product
      `;
    },

    async listEvents(userId, { afterId, limit, product }) {
      const q = db();
      let cursorDate = null;
      let cursorId = null;
      if (afterId) {
        const found = await q`
          SELECT occurred_at, id FROM instant_cloud_progress_events
          WHERE user_id = ${userId} AND id = ${afterId}::uuid
        `;
        if (!found.length) throw new CursorNotFoundError();
        cursorDate = found[0].occurred_at;
        cursorId = found[0].id;
      }
      const rows = await q`
        SELECT id, product, kind, occurred_at, payload
        FROM instant_cloud_progress_events
        WHERE user_id = ${userId}
          AND (${product || null}::text IS NULL OR product = ${product || null})
          AND (
            ${cursorId || null}::uuid IS NULL
            OR (occurred_at, id) > (${cursorDate}::timestamptz, ${cursorId}::uuid)
          )
        ORDER BY occurred_at ASC, id ASC
        LIMIT ${limit}
      `;
      return {
        events: rows.map(r => ({
          eventId: r.id, product: r.product, kind: r.kind,
          occurredAt: r.occurred_at, ...r.payload,
        })),
        nextCursor: rows.length === limit ? rows.at(-1).id : null,
      };
    },
  };
}
