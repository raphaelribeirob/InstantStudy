-- Additive, idempotent preview schema for offer-driven Orbita plans, uploads and metering.
-- No rows are deleted, no columns dropped, no table truncated.
CREATE TABLE IF NOT EXISTS instantstudy_agent_plans (
  id uuid PRIMARY KEY,
  learner_id text NOT NULL,
  material_id uuid NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  plan_json jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS instantstudy_agent_plans_learner_idx
  ON instantstudy_agent_plans (learner_id, material_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS instantstudy_ai_assets_quota (
  learner_hash text NOT NULL,
  day date NOT NULL,
  generated integer NOT NULL DEFAULT 0,
  PRIMARY KEY (learner_hash, day)
);

CREATE TABLE IF NOT EXISTS instantstudy_realtime_quota (
  learner_hash text NOT NULL,
  day date NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (learner_hash, day)
);

CREATE TABLE IF NOT EXISTS instantstudy_large_audio_uploads (
  upload_id uuid PRIMARY KEY,
  learner_id text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  total_parts integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS instantstudy_large_audio_daily_quota (
  learner_id text NOT NULL,
  day date NOT NULL,
  accepted integer NOT NULL DEFAULT 0,
  PRIMARY KEY (learner_id, day)
);
CREATE TABLE IF NOT EXISTS instantstudy_large_audio_parts (
  upload_id uuid NOT NULL REFERENCES instantstudy_large_audio_uploads(upload_id) ON DELETE CASCADE,
  part_index integer NOT NULL,
  bytes integer NOT NULL,
  data_base64 text NOT NULL,
  PRIMARY KEY (upload_id, part_index)
);
CREATE INDEX IF NOT EXISTS instantstudy_audio_uploads_learner_idx
  ON instantstudy_large_audio_uploads (learner_id, created_at DESC);
