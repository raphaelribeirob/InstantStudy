BEGIN;

CREATE TABLE IF NOT EXISTS instantstudy_rooms (
  id uuid PRIMARY KEY,
  code text UNIQUE NOT NULL,
  host_learner_id text NOT NULL,
  title text NOT NULL,
  material_id uuid,
  summary text NOT NULL,
  concepts_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS instantstudy_rooms_host_updated_idx
  ON instantstudy_rooms (host_learner_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS instantstudy_room_members (
  room_id uuid NOT NULL REFERENCES instantstudy_rooms(id) ON DELETE CASCADE,
  learner_id text NOT NULL,
  display_name text NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  progress double precision NOT NULL DEFAULT 0
    CHECK (progress >= 0 AND progress <= 1),
  attempts integer NOT NULL DEFAULT 0
    CHECK (attempts >= 0),
  PRIMARY KEY (room_id, learner_id)
);

CREATE INDEX IF NOT EXISTS instantstudy_room_members_learner_idx
  ON instantstudy_room_members (learner_id, joined_at DESC);

COMMIT;
