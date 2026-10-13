-- Phase 2 additive index for stable, metadata-only material library pages.
-- Preview only until owner-bound queries and EXPLAIN plans are verified.
-- For a large production table use CONCURRENTLY outside a transaction after
-- reviewing lock and recovery implications; do not run this automatically.
CREATE INDEX IF NOT EXISTS instantstudy_materials_learner_cursor_idx
ON instantstudy_materials (learner_id, updated_at DESC, id DESC);
