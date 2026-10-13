-- Canonical study migration: flashcard state. The older db/migrations file
-- is retained only as a historical compatibility reference; do not run both.
CREATE TABLE IF NOT EXISTS public.instantstudy_flashcard_progress (
  learner_id text NOT NULL,
  material_id uuid NOT NULL,
  card_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('known', 'learning')),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (learner_id, material_id, card_id)
);
