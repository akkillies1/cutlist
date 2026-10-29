# DCODE Cutlist database backup for Supabase

Snapshot date: 2026-10-29  
Source: private Hatchable working-copy database archive, captured before Phase 1 implementation.  
Tables archived: 13  
Rows archived: 183

## Files
- `migrations/001_schema.sql` — table and index definitions.
- `seed.sql` — captured rows, including hardware register, vendor records, supplier quotes, rates, GST, discounts, freight, quote references, validity dates, and history.
- `database-backup/manifest.json` — source table counts and capture timestamps.

## Restore to a fresh Supabase project
1. Review the SQL and ensure the target project is empty or table conflicts are understood.
2. Open Supabase SQL Editor.
3. Run `migrations/001_schema.sql`.
4. Run `seed.sql`.
5. Verify row counts and review the application's auth/RLS model before connecting the app.

The seed uses `ON CONFLICT DO NOTHING`, so it will not overwrite existing rows. It preserves IDs and resets generated ID sequences after inserts. For a clean restore, use a new database; for an existing database, reconcile conflicts and sequence state manually.

## Security notice
This repository is public. The snapshot includes vendor contact fields and commercial pricing because the repository owner explicitly requested full vendor fields. Do not commit credentials, Supabase service-role keys, access tokens, or customer personal data. Consider moving the full commercial snapshot to a private repository if visibility requirements change.

## Scope and limitations
This is a table/index and data snapshot, not a full `pg_dump`. It does not recreate auth users, storage objects, RLS policies, grants, triggers, functions, or external secrets. Those must be added after reviewing the target Supabase app architecture. Empty tables are created but contribute no seed rows.
