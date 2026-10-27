# Database migration plan — DCODE Low Balance

## Status
Draft foundation migration; not applied to any database. The current app persists data in browser local storage. This repository change proposes a PostgreSQL schema; it does not switch the app to cloud persistence and does not import user data.

## Target and prerequisites
- Target: PostgreSQL with Supabase Auth (auth.users, auth.uid()) and row-level security.
- Migration: supabase/migrations/202610270001_initial_project_schema.sql.
- Apply to a disposable development project first; do not apply to production until reviewed and tested.
- Never commit project URLs containing secrets, API keys, customer data, or service-role credentials.

## Included schema areas
Workspaces and roles; projects and rooms; designs and immutable JSONB revision snapshots; assemblies and components; materials and hardware models; manufacturing operations; cut-list revisions; validation results; file metadata; audit events. Dimensions use millimetres. RLS policies scope project records to workspace membership.

## Deliberate limits
- The frontend is not wired to this schema.
- No storage bucket is created and no source files are uploaded.
- The migration does not import localStorage data or approve dimensions/designs/cut lists.
- The full field mapping for all local-storage keys still needs verification before an importer is written.
- Hardware clearances, hinge/sliding deductions, runner deductions, machining/toolpaths and nesting are not inferred by this schema.

## Before applying
1. Test on a disposable development database and inspect SQL/policies against the target PostgreSQL/Supabase version.
2. Test workspace isolation with two users and owner/admin/editor/viewer roles.
3. Add tests for membership creation, revision immutability, foreign-key behavior and approval/release invariants.
4. Enforce immutability of approved revisions and released cut lists before production; this draft records approval metadata but does not yet make those records immutable.
5. Add a separate importer only after documenting real legacy object shapes and schema versions.
6. Export local data before any frontend cutover. Keep originals until counts, values and a restore drill pass.

## Local-data migration contract (planned, not implemented)
- Read existing keys without deleting or overwriting them.
- Preserve original JSON and record source key/version, import timestamp and validation findings.
- Generate stable IDs and explicit mappings for project/room/design/part references.
- Normalize dimensions to mm only when source units are known; unknown units require review.
- Preserve provenance: extracted, generated, manually entered and human-approved.
- Make imports idempotent; retries must not duplicate records.
- Report rejected records and allow reviewed retries.
- Compare project, room, design, part and template counts; dimensions; materials; finishes; edge banding; snapshots before cloud saves are enabled.
- Keep rollback to local-only mode until restore testing passes.

## Review notes
This is a starting schema, not a claim that every current app object maps cleanly to normalized rows. JSONB snapshots intentionally preserve legacy module state while the detailed mapping is researched. Review role management, RLS tests, immutable revision enforcement, storage access policies, retention/deletion rules and audit completeness before production.
