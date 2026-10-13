-- Proposed schema for a dedicated Instant Cloud Neon database. NOT APPLIED.
-- The API is the ONLY data boundary. Never grant direct client SQL/Data API access.
BEGIN;
CREATE TABLE IF NOT EXISTS instant_cloud_progress_events (
  user_id text NOT NULL CHECK (user_id ~ '^[0-9a-f]{64}$'),
  id uuid NOT NULL,
  product text NOT NULL CHECK (product IN ('instant_speak','instant_study','instant_bible')),
  kind text NOT NULL CHECK (kind IN (
    'session_completed','review_completed','lesson_completed',
    'practice_completed','goal_updated'
  )),
  occurred_at timestamptz NOT NULL,
  payload_hash text NOT NULL CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
  payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS instant_cloud_progress_user_time_idx
  ON instant_cloud_progress_events(user_id, occurred_at, id);
CREATE INDEX IF NOT EXISTS instant_cloud_progress_user_product_time_idx
  ON instant_cloud_progress_events(user_id, product, occurred_at DESC);

-- In production, use a restricted DB user and never expose DATABASE_URL to devices.
-- This service derives user_id from a validated JWT; its SQL always filters by user_id.
-- A separate least-privilege/RLS policy rollout is required before multi-tenant release.
COMMIT;
