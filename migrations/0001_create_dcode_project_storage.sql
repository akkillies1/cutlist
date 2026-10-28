CREATE TABLE dcode_projects (
  id BIGSERIAL PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  legacy_key TEXT,
  name TEXT NOT NULL DEFAULT 'Untitled project',
  room TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, legacy_key)
);

CREATE INDEX idx_dcode_projects_owner_updated
  ON dcode_projects(owner_user_id, updated_at DESC);

CREATE TABLE dcode_project_revisions (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES dcode_projects(id) ON DELETE CASCADE,
  revision_no INTEGER NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  snapshot JSONB NOT NULL,
  provenance JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, revision_no)
);

CREATE INDEX idx_dcode_project_revisions_project_created
  ON dcode_project_revisions(project_id, created_at DESC);

CREATE TABLE dcode_cutlist_revisions (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES dcode_projects(id) ON DELETE CASCADE,
  revision_no INTEGER NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  parts JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  approval_status TEXT NOT NULL DEFAULT 'draft',
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, revision_no),
  CHECK (approval_status IN ('draft', 'review', 'approved', 'rejected'))
);

CREATE INDEX idx_dcode_cutlist_revisions_project_created
  ON dcode_cutlist_revisions(project_id, created_at DESC);

CREATE TABLE dcode_local_imports (
  id BIGSERIAL PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  source_key TEXT NOT NULL,
  source_version INTEGER,
  payload_hash TEXT NOT NULL,
  record_count INTEGER NOT NULL DEFAULT 0,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, source_key)
);

CREATE TABLE dcode_saved_templates (
  id BIGSERIAL PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  legacy_key TEXT,
  name TEXT NOT NULL,
  template_type TEXT NOT NULL DEFAULT 'cabinet',
  schema_version INTEGER NOT NULL DEFAULT 1,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, legacy_key)
);

CREATE INDEX idx_dcode_saved_templates_owner
  ON dcode_saved_templates(owner_user_id, updated_at DESC);