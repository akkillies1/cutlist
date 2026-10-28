-- Supplemental tables for the existing additive DCODE cloud schema.
-- dcode_projects and dcode_project_revisions are created by 0001_create_dcode_project_storage.sql.
CREATE TABLE IF NOT EXISTS dcode_project_records (
  id BIGSERIAL PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  project_id BIGINT REFERENCES dcode_projects(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL CHECK (record_type IN ('legacy_local_storage','design_snapshot','cutlist_snapshot','saved_template','kitchen_layout','room_plan','assembly','panel_geometry','settings')),
  record_key TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1 CHECK (schema_version > 0),
  payload JSONB NOT NULL,
  source_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, record_type, record_key)
);
CREATE INDEX IF NOT EXISTS idx_dcode_records_project_type ON dcode_project_records (project_id, record_type, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_dcode_records_owner_type ON dcode_project_records (owner_user_id, record_type, updated_at DESC);

CREATE TABLE IF NOT EXISTS dcode_migration_runs (
  id BIGSERIAL PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  migration_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started','completed','failed')),
  item_count INTEGER NOT NULL DEFAULT 0 CHECK (item_count >= 0),
  report JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE (owner_user_id, migration_key)
);
CREATE INDEX IF NOT EXISTS idx_dcode_migration_runs_owner ON dcode_migration_runs (owner_user_id, started_at DESC);