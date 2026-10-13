-- Additive FSRS due queue for InstantStudy; APPLY ONLY ON A NEON PREVIEW BRANCH.
-- The runtime code dual-writes this table in the same Neon HTTP transaction.
-- Existing session_json is retained for rollback. Run verified historical
-- backfill before enabling the indexed reads for a live account.
BEGIN;

CREATE TABLE IF NOT EXISTS instantstudy_concept_progress (
  learner_id text NOT NULL,
  concept_key text NOT NULL,
  session_id uuid NOT NULL REFERENCES instantstudy_sessions(id) ON DELETE CASCADE,
  material_id uuid,
  title text NOT NULL,
  concept_id text NOT NULL,
  label text NOT NULL,
  source_excerpt text NOT NULL,
  mastery double precision NOT NULL,
  difficulty double precision NOT NULL,
  last_seen_at timestamptz NOT NULL,
  next_review_at timestamptz NOT NULL,
  missing_concepts jsonb NOT NULL DEFAULT '[]'::jsonb,
  concept_json jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (learner_id, concept_key),
  CHECK (mastery >= 0 AND mastery <= 1)
);

CREATE INDEX IF NOT EXISTS instantstudy_concept_due_idx
  ON instantstudy_concept_progress (learner_id, next_review_at, concept_key);

CREATE INDEX IF NOT EXISTS instantstudy_concept_updated_idx
  ON instantstudy_concept_progress (learner_id, last_seen_at DESC);

COMMIT;
