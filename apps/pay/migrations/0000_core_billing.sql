-- InstantPay baseline for new PREVIEW environments; no production execution.
-- Existing InstantPay DBs already created these tables at runtime.
BEGIN;
CREATE TABLE IF NOT EXISTS billing_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  occurred_at timestamptz,
  payload jsonb NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS billing_entitlements (
  entitlement_id text PRIMARY KEY,
  entitlement_key text NOT NULL,
  product_key text NOT NULL,
  plan_key text,
  user_ref text,
  email text,
  paddle_customer_id text,
  paddle_subscription_id text,
  active boolean NOT NULL DEFAULT false,
  status text NOT NULL,
  expires_at timestamptz,
  source text,
  updated_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS billing_entitlements_user_ref_idx ON billing_entitlements(user_ref);
CREATE INDEX IF NOT EXISTS billing_entitlements_email_idx ON billing_entitlements(LOWER(email));
CREATE INDEX IF NOT EXISTS billing_entitlements_customer_idx ON billing_entitlements(paddle_customer_id);
CREATE INDEX IF NOT EXISTS billing_entitlements_subscription_idx ON billing_entitlements(paddle_subscription_id);
CREATE TABLE IF NOT EXISTS billing_family_members (
  owner_key text NOT NULL,
  owner_user_ref text,
  owner_email text,
  member_email text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY(owner_key,member_email)
);
CREATE INDEX IF NOT EXISTS billing_family_members_member_idx ON billing_family_members(LOWER(member_email));
COMMIT;
