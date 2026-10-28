import { db } from 'hatchable';

export const access = 'admin';
export const methods = ['GET', 'POST'];

const ALLOWED_KEYS = new Set([
  'dcode-cutting-list-draft-v1',
  'dcode-interior-design-v1',
  'dcode-interior-projects-v2',
  'dcode-designer-cutlist-v1',
  'dcode-assembly-studio-v1',
  'dcode-room-planner-v1',
  'dcode-kitchen-plan-v1',
  'dcode-panel-geometry-v1',
  'dcode-interior-saved-templates-v1',
  'dcode-saved-kitchen-layouts-v1'
]);
const TYPE_BY_KEY = {
  'dcode-cutting-list-draft-v1': 'cutlist_snapshot',
  'dcode-interior-design-v1': 'design_snapshot',
  'dcode-interior-projects-v2': 'design_snapshot',
  'dcode-designer-cutlist-v1': 'cutlist_snapshot',
  'dcode-assembly-studio-v1': 'assembly',
  'dcode-room-planner-v1': 'room_plan',
  'dcode-kitchen-plan-v1': 'design_snapshot',
  'dcode-panel-geometry-v1': 'panel_geometry',
  'dcode-interior-saved-templates-v1': 'saved_template',
  'dcode-saved-kitchen-layouts-v1': 'kitchen_layout'
};
const MAX_ITEMS = 10;
const MAX_BYTES = 1500000;

function jsonSize(value) {
  try { return new TextEncoder().encode(JSON.stringify(value)).length; }
  catch { return MAX_BYTES + 1; }
}

export default async function (req, res) {
  const ownerId = String(req.member?.id || '').trim();
  if (!ownerId) return res.status(401).json({ error: 'Sign in to access cloud project data.' });

  if (req.method === 'GET') {
    const result = await db.query(
      'SELECT migration_key, status, item_count, report, started_at, completed_at FROM dcode_migration_runs WHERE owner_user_id = $1 ORDER BY started_at DESC LIMIT 20',
      [ownerId]
    );
    const count = await db.query(
      'SELECT record_type, count(*)::int AS count FROM dcode_project_records WHERE owner_user_id = $1 GROUP BY record_type ORDER BY record_type',
      [ownerId]
    );
    return res.json({ migrations: result.rows, records: count.rows, supportedKeys: [...ALLOWED_KEYS] });
  }

  const body = req.body || {};
  if (body.action !== 'import-local-storage') return res.status(400).json({ error: 'Unsupported action.' });
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > MAX_ITEMS) return res.status(400).json({ error: 'Expected 1–10 supported local-storage items.' });
  if (jsonSize(body.items) > MAX_BYTES) return res.status(413).json({ error: 'Import is too large. Export a JSON backup and import smaller groups.' });

  const items = [];
  const seen = new Set();
  for (const item of body.items) {
    if (!item || typeof item.key !== 'string' || !ALLOWED_KEYS.has(item.key) || seen.has(item.key)) {
      return res.status(400).json({ error: 'Import contains an unsupported or duplicate key.' });
    }
    seen.add(item.key);
    if (!Object.prototype.hasOwnProperty.call(item, 'value')) return res.status(400).json({ error: 'Each item must include its value.' });
    if (jsonSize(item.value) > 500000) return res.status(413).json({ error: 'A single saved item exceeds 500 KB.' });
    items.push(item);
  }

  const migrationKey = 'local-storage-v1-' + items.map(x => x.key).sort().join('|');
  await db.query(
    "INSERT INTO dcode_migration_runs (owner_user_id, migration_key, status, item_count, report) VALUES ($1,$2,'started',0,$3::jsonb) ON CONFLICT (owner_user_id,migration_key) DO UPDATE SET status='started', report=EXCLUDED.report, started_at=now(), completed_at=NULL",
    [ownerId, migrationKey, JSON.stringify({ keys: items.map(x => x.key), localDataRetained: true })]
  );

  const projectName = String(items.find(x => x.key === 'dcode-interior-projects-v2')?.value?.projects?.[0]?.name || 'Imported DCODE workspace').slice(0, 160);
  const projectKey = 'local-storage-import';
  const p = await db.query(
    "INSERT INTO dcode_projects (owner_user_id, legacy_key, name, metadata) VALUES ($1,$2,$3,$4::jsonb) ON CONFLICT (owner_user_id,legacy_key) DO UPDATE SET name=EXCLUDED.name, metadata=dcode_projects.metadata || EXCLUDED.metadata, updated_at=now() RETURNING id",
    [ownerId, projectKey, projectName, JSON.stringify({ importedFrom: 'browser-local-storage', importFormat: 1 })]
  );
  const projectId = p.rows[0].id;

  let saved = 0;
  for (const item of items) {
    const type = TYPE_BY_KEY[item.key] || 'legacy_local_storage';
    const payload = { sourceKey: item.key, value: item.value, importedAt: new Date().toISOString() };
    await db.query(
      "INSERT INTO dcode_project_records (owner_user_id,project_id,record_type,record_key,schema_version,payload,source_updated_at) VALUES ($1,$2,$3,$4,1,$5::jsonb,$6) ON CONFLICT (owner_user_id,record_type,record_key) DO UPDATE SET project_id=EXCLUDED.project_id, schema_version=EXCLUDED.schema_version, payload=EXCLUDED.payload, source_updated_at=EXCLUDED.source_updated_at, updated_at=now()",
      [ownerId, projectId, type, item.key, JSON.stringify(payload), item.savedAt || null]
    );
    saved++;
  }

  const revision = await db.query('SELECT COALESCE(MAX(revision_no),0)::int AS n FROM dcode_project_revisions WHERE project_id=$1', [projectId]);
  const nextRevision = Number(revision.rows[0].n) + 1;
  await db.query(
    'INSERT INTO dcode_project_revisions (project_id,revision_no,schema_version,snapshot,provenance,created_by) VALUES ($1,$2,1,$3::jsonb,$4::jsonb,$5)',
    [projectId, nextRevision, JSON.stringify({ importedKeys: items.map(x => x.key), itemCount: saved, localDataRetained: true }), JSON.stringify({ source: 'browser-local-storage', importFormat: 1 }), ownerId]
  );
  const report = { projectId, itemCount: saved, keys: items.map(x => x.key), localDataRetained: true, revisionNo: nextRevision };
  await db.query(
    "UPDATE dcode_migration_runs SET status='completed', item_count=$3, report=$4::jsonb, completed_at=now() WHERE owner_user_id=$1 AND migration_key=$2",
    [ownerId, migrationKey, saved, JSON.stringify(report)]
  );
  return res.status(200).json({ ok: true, ...report });
}