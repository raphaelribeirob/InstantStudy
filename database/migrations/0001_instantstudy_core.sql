BEGIN;

CREATE TABLE IF NOT EXISTS instantstudy_sessions (
  id uuid PRIMARY KEY,
  learner_id text,
  status text NOT NULL,
  mode text NOT NULL,
  title text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  session_json jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS instantstudy_sessions_learner_updated_idx
  ON instantstudy_sessions (learner_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS instantstudy_materials (
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
  ON instantstudy_materials (learner_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS instantstudy_entitlements (
  learner_id text PRIMARY KEY,
  plan text NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'plus', 'unlimited')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS instantstudy_usage (
  learner_id text NOT NULL,
  period text NOT NULL,
  learn_rounds integer NOT NULL DEFAULT 0 CHECK (learn_rounds >= 0),
  practice_tests integer NOT NULL DEFAULT 0 CHECK (practice_tests >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (learner_id, period)
);

COMMIT;
