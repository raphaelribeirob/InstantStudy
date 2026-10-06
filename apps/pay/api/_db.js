import { neon } from "@neondatabase/serverless";

let sqlClient;
let schemaPromise;

function sql() {
  const url = String(process.env.DATABASE_URL || "").trim();
  if (!url) {
    const error = new Error("database_not_configured");
    error.code = "database_not_configured";
    throw error;
  }
  if (!sqlClient) sqlClient = neon(url);
  return sqlClient;
}

export function databaseConfigured() {
  return Boolean(String(process.env.DATABASE_URL || "").trim());
}

export async function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const q = sql();
      await q`
        CREATE TABLE IF NOT EXISTS billing_events (
          event_id TEXT PRIMARY KEY,
          event_type TEXT NOT NULL,
          occurred_at TIMESTAMPTZ,
          payload JSONB NOT NULL,
          processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await q`
        CREATE TABLE IF NOT EXISTS billing_entitlements (
          entitlement_id TEXT PRIMARY KEY,
          entitlement_key TEXT NOT NULL,
          product_key TEXT NOT NULL,
          plan_key TEXT,
          user_ref TEXT,
          email TEXT,
          paddle_customer_id TEXT,
          paddle_subscription_id TEXT,
          active BOOLEAN NOT NULL DEFAULT FALSE,
          status TEXT NOT NULL,
          expires_at TIMESTAMPTZ,
          source TEXT,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await q`CREATE INDEX IF NOT EXISTS billing_entitlements_user_ref_idx ON billing_entitlements (user_ref)`;
      await q`CREATE INDEX IF NOT EXISTS billing_entitlements_email_idx ON billing_entitlements (LOWER(email))`;
      await q`CREATE INDEX IF NOT EXISTS billing_entitlements_customer_idx ON billing_entitlements (paddle_customer_id)`;
      await q`CREATE INDEX IF NOT EXISTS billing_entitlements_subscription_idx ON billing_entitlements (paddle_subscription_id)`;
    })();
  }
  return schemaPromise;
}

export async function recordEvent({ eventId, eventType, occurredAt, payload }) {
  await ensureSchema();
  const q = sql();
  const rows = await q`
    INSERT INTO billing_events (event_id, event_type, occurred_at, payload)
    VALUES (${eventId}, ${eventType}, ${occurredAt || null}, ${JSON.stringify(payload)}::jsonb)
    ON CONFLICT (event_id) DO NOTHING
    RETURNING event_id
  `;
  return rows.length > 0;
}

export async function upsertEntitlement(input) {
  await ensureSchema();
  const q = sql();
  const identity = input.paddleCustomerId || input.userRef || input.email;
  if (!identity) throw new Error("entitlement_identity_missing");
  const entitlementId = `${identity}:${input.entitlementKey}`;

  await q`
    INSERT INTO billing_entitlements (
      entitlement_id, entitlement_key, product_key, plan_key, user_ref, email,
      paddle_customer_id, paddle_subscription_id, active, status, expires_at, source, updated_at
    )
    VALUES (
      ${entitlementId}, ${input.entitlementKey}, ${input.productKey}, ${input.planKey || null},
      ${input.userRef || null}, ${input.email || null}, ${input.paddleCustomerId || null},
      ${input.paddleSubscriptionId || null}, ${Boolean(input.active)}, ${input.status},
      ${input.expiresAt || null}, ${input.source || null}, NOW()
    )
    ON CONFLICT (entitlement_id) DO UPDATE SET
      product_key = EXCLUDED.product_key,
      plan_key = COALESCE(EXCLUDED.plan_key, billing_entitlements.plan_key),
      user_ref = COALESCE(EXCLUDED.user_ref, billing_entitlements.user_ref),
      email = COALESCE(EXCLUDED.email, billing_entitlements.email),
      paddle_customer_id = COALESCE(EXCLUDED.paddle_customer_id, billing_entitlements.paddle_customer_id),
      paddle_subscription_id = COALESCE(EXCLUDED.paddle_subscription_id, billing_entitlements.paddle_subscription_id),
      active = EXCLUDED.active,
      status = EXCLUDED.status,
      expires_at = COALESCE(EXCLUDED.expires_at, billing_entitlements.expires_at),
      source = COALESCE(EXCLUDED.source, billing_entitlements.source),
      updated_at = NOW()
  `;
}

export async function updateSubscriptionState({ subscriptionId, active, status, expiresAt }) {
  if (!subscriptionId) return;
  await ensureSchema();
  const q = sql();
  await q`
    UPDATE billing_entitlements
    SET active = ${Boolean(active)},
        status = ${status},
        expires_at = COALESCE(${expiresAt || null}, expires_at),
        updated_at = NOW()
    WHERE paddle_subscription_id = ${subscriptionId}
  `;
}

export async function entitlementsForIdentity({ userRef, email }) {
  await ensureSchema();
  const q = sql();
  const rows = await q`
    SELECT entitlement_key, product_key, plan_key, active, status, expires_at, source
    FROM billing_entitlements
    WHERE
      (${userRef || null}::text IS NOT NULL AND user_ref = ${userRef || null})
      OR
      (${email || null}::text IS NOT NULL AND LOWER(email) = LOWER(${email || null}))
    ORDER BY updated_at DESC
  `;
  return rows;
}

export async function databaseHealthy() {
  await ensureSchema();
  const q = sql();
  await q`SELECT 1 AS ok`;
  return true;
}
