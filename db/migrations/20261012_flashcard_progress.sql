-- Additional per-learner flashcard state. Additive; no existing data touched.
CREATE TABLE IF NOT EXISTS public.instantstudy_flashcard_progress (
  learner_id text NOT NULL,
  material_id uuid NOT NULL,
  card_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('known', 'learning')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (learner_id, material_id, card_id)
);
