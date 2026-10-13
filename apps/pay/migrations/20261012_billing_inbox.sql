-- InstantPay: additive durable webhook inbox and ordering.
-- Apply on a dedicated Neon PREVIEW branch and verify before deployment.
-- Intentionally separate from InstantStudy migrations (separate Neon project).
-- Do not execute this directly from a request handler.
BEGIN;

ALTER TABLE billing_events
  ADD COLUMN IF NOT EXISTS processing_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS processing_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error text;

ALTER TABLE billing_events
  ADD CONSTRAINT billing_events_processing_status_check
  CHECK (processing_status IN ('pending','processing','failed','applied')) NOT VALID;

-- Legacy events with a processed_at timestamp might have failed after inbox
-- insert; leave their new status 'pending' so replay can safely reconcile.
UPDATE billing_events
SET processing_status = 'pending', processing_started_at = NULL
WHERE processing_status NOT IN ('applied','processing','failed');

CREATE INDEX IF NOT EXISTS billing_events_recovery_idx
ON billing_events (processing_status, processing_started_at)
WHERE processing_status <> 'applied';

ALTER TABLE billing_entitlements
  ADD COLUMN IF NOT EXISTS provider_occurred_at timestamptz;

COMMIT;
