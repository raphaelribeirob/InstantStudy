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
      await q`
        CREATE TABLE IF NOT EXISTS billing_checkout_intents (
          intent_nonce TEXT PRIMARY KEY,
          user_ref TEXT NOT NULL,
          offer_key TEXT NOT NULL,
          claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await q`CREATE INDEX IF NOT EXISTS billing_entitlements_user_ref_idx ON billing_entitlements (user_ref)`;
      await q`CREATE INDEX IF NOT EXISTS billing_entitlements_email_idx ON billing_entitlements (LOWER(email))`;
      await q`CREATE INDEX IF NOT EXISTS billing_entitlements_customer_idx ON billing_entitlements (paddle_customer_id)`;
      await q`CREATE INDEX IF NOT EXISTS billing_entitlements_subscription_idx ON billing_entitlements (paddle_subscription_id)`;
      await q`
        CREATE TABLE IF NOT EXISTS billing_family_members (
          owner_key TEXT NOT NULL,
          owner_user_ref TEXT,
          owner_email TEXT,
          member_email TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'active',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (owner_key, member_email)
        )
      `;
      await q`CREATE INDEX IF NOT EXISTS billing_family_members_member_idx ON billing_family_members (LOWER(member_email))`;
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


function ownerKey(identity) {
  return String(identity?.userRef || identity?.email || "").trim().toLowerCase();
}

export async function hasActiveFamilyEntitlement(identity) {
  await ensureSchema();
  const q = sql();
  const rows = await q`
    SELECT 1
    FROM billing_entitlements
    WHERE entitlement_key = 'instant_study.family'
      AND active = TRUE
      AND (
        (${identity?.userRef || null}::text IS NOT NULL AND user_ref = ${identity?.userRef || null})
        OR
        (${identity?.email || null}::text IS NOT NULL AND LOWER(email) = LOWER(${identity?.email || null}))
      )
    LIMIT 1
  `;
  return rows.length > 0;
}

export async function listFamilyMembers(identity) {
  await ensureSchema();
  const q = sql();
  const key = ownerKey(identity);
  if (!key) return [];
  return q`
    SELECT member_email, status, created_at, updated_at
    FROM billing_family_members
    WHERE owner_key = ${key}
      AND status = 'active'
    ORDER BY created_at ASC
  `;
}

export async function addFamilyMember(identity, memberEmail) {
  await ensureSchema();
  const q = sql();
  const key = ownerKey(identity);
  const email = String(memberEmail || "").trim().toLowerCase();
  if (!key || !email) throw new Error("family_identity_missing");
  if (!(await hasActiveFamilyEntitlement(identity))) {
    const error = new Error("family_plan_required");
    error.code = "family_plan_required";
    throw error;
  }
  if (identity?.email && email === String(identity.email).toLowerCase()) {
    const error = new Error("family_owner_cannot_invite_self");
    error.code = "family_owner_cannot_invite_self";
    throw error;
  }

  const countRows = await q`
    SELECT COUNT(*)::int AS count
    FROM billing_family_members
    WHERE owner_key = ${key}
      AND status = 'active'
      AND LOWER(member_email) <> LOWER(${email})
  `;
  if (Number(countRows[0]?.count || 0) >= 4) {
    const error = new Error("family_member_limit_reached");
    error.code = "family_member_limit_reached";
    throw error;
  }

  await q`
    INSERT INTO billing_family_members (
      owner_key, owner_user_ref, owner_email, member_email, status, updated_at
    )
    VALUES (
      ${key},
      ${identity?.userRef || null},
      ${identity?.email || null},
      ${email},
      'active',
      NOW()
    )
    ON CONFLICT (owner_key, member_email) DO UPDATE SET
      status = 'active',
      owner_user_ref = COALESCE(EXCLUDED.owner_user_ref, billing_family_members.owner_user_ref),
      owner_email = COALESCE(EXCLUDED.owner_email, billing_family_members.owner_email),
      updated_at = NOW()
  `;

  return listFamilyMembers(identity);
}

export async function removeFamilyMember(identity, memberEmail) {
  await ensureSchema();
  const q = sql();
  const key = ownerKey(identity);
  const email = String(memberEmail || "").trim().toLowerCase();
  if (!key || !email) throw new Error("family_identity_missing");

  await q`
    UPDATE billing_family_members
    SET status = 'removed', updated_at = NOW()
    WHERE owner_key = ${key}
      AND LOWER(member_email) = LOWER(${email})
  `;

  return listFamilyMembers(identity);
}

export async function familyAccessForIdentity(identity) {
  await ensureSchema();
  const q = sql();
  const email = String(identity?.email || "").trim().toLowerCase();
  if (!email) return null;

  const rows = await q`
    SELECT fm.owner_key
    FROM billing_family_members fm
    WHERE LOWER(fm.member_email) = LOWER(${email})
      AND fm.status = 'active'
      AND EXISTS (
        SELECT 1
        FROM billing_entitlements be
        WHERE be.entitlement_key = 'instant_study.family'
          AND be.active = TRUE
          AND (
            (fm.owner_user_ref IS NOT NULL AND be.user_ref = fm.owner_user_ref)
            OR
            (fm.owner_email IS NOT NULL AND LOWER(be.email) = LOWER(fm.owner_email))
          )
      )
    LIMIT 1
  `;

  return rows[0] ? { ownerKey: String(rows[0].owner_key) } : null;
}

/** One-time checkout nonce. In a replay or database outage, fail closed. */
export async function claimSpeakCheckoutIntent({nonce,userRef,offer}) {
  await ensureSchema();
  const q = sql();
  const rows = await q`
    INSERT INTO billing_checkout_intents (intent_nonce,user_ref,offer_key,claimed_at)
    VALUES (${nonce},${userRef},${offer},NOW())
    ON CONFLICT (intent_nonce) DO NOTHING
    RETURNING intent_nonce
  `;
  return rows.length === 1;
}
