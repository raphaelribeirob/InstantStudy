-- InstantStudy™ durable core storage (idempotent, additive).
-- Matches studyPersistence.ts and materialStore.ts. Apply on a validated
-- Neon preview branch before production promotion; never use as a billing migration.
CREATE TABLE IF NOT EXISTS public.instantstudy_sessions (
  id uuid PRIMARY KEY,
  learner_id text,
  status text NOT NULL,
  mode text NOT NULL,
  title text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  session_json jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS instantstudy_sessions_learner_updated_idx
  ON public.instantstudy_sessions (learner_id, updated_at DESC);
CREATE TABLE IF NOT EXISTS public.instantstudy_materials (
  id uuid PRIMARY KEY,
  learner_id text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  source_type text NOT NULL,
  source_names jsonb NOT NULL DEFAULT '[]'::jsonb,
  assets_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS instantstudy_materials_learner_updated_idx
  ON public.instantstudy_materials (learner_id, updated_at DESC);
