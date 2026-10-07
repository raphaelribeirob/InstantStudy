import { neon } from "@neondatabase/serverless";

let sqlClient;
let readyPromise;

function databaseUrl() {
  return String(
    process.env.INSTANT_PAY_DATABASE_URL ||
      process.env.DATABASE_URL ||
      "",
  ).trim();
}

export function billingDbConfigured() {
  return Boolean(databaseUrl());
}

export function billingSql() {
  const url = databaseUrl();
  if (!url) throw new Error("instant_pay_database_not_configured");
  if (!sqlClient) sqlClient = neon(url);
  return sqlClient;
}

export async function ensureBillingSchema() {
  if (readyPromise) return readyPromise;
  readyPromise = (async () => {
    const sql = billingSql();
    await sql`
      CREATE TABLE IF NOT EXISTS instant_pay_events (
        event_id text PRIMARY KEY,
        event_type text NOT NULL,
        payload_hash text NOT NULL,
        received_at timestamptz NOT NULL DEFAULT now(),
        processed_at timestamptz,
        last_error text
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS instant_pay_entitlements (
        subject_id text NOT NULL,
        entitlement_key text NOT NULL,
        active boolean NOT NULL DEFAULT false,
        status text NOT NULL,
        provider text NOT NULL DEFAULT 'paddle',
        product_key text,
        plan_key text,
        external_transaction_id text,
        external_subscription_id text,
        expires_at timestamptz,
        updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (subject_id, entitlement_key)
      )
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS ix_instant_pay_entitlements_subject
      ON instant_pay_entitlements (subject_id)
    `;
  })().catch((error) => {
    readyPromise = null;
    throw error;
  });
  return readyPromise;
}
