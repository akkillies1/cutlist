import { db } from 'hatchable';

export const access = 'admin';
export const methods = ['GET', 'POST'];
const MAX_BYTES = 1500000;
const sizeOf = value => { try { return new TextEncoder().encode(JSON.stringify(value)).length; } catch { return MAX_BYTES + 1; } };

function publicState(payload, revisions) {
  const legacyHistory = Array.isArray(payload?.history) ? payload.history : [];
  const current = payload?.current || null;
  if (Array.isArray(current?.vendors)) current.vendors = current.vendors.filter(v => String(typeof v === 'string' ? v : v?.name || '').trim().toLowerCase() !== 'test');
  if (Array.isArray(current?.items)) current.items.forEach(item => { if (item?.rates) delete item.rates.Test; if (item?.quoteDetails) delete item.quoteDetails.Test; });
  const revisionHistory = revisions.map(row => {
    const p = row.payload || {};
    return { version: Number(row.version_no), createdAt: row.created_at || p.createdAt || null,
      status: row.status || p.status || p.current?.status || 'Draft',
      note: row.note || p.note || 'Saved hardware register revision',
      data: p.current || p.data || p };
  });
  const byVersion = new Map();
  [...legacyHistory, ...revisionHistory].forEach(entry => {
    const version = Number(entry.version);
    if (Number.isFinite(version) && version > 0) byVersion.set(version, entry);
  });
  const history = Array.from(byVersion.values()).sort((a,b) => Number(a.version)-Number(b.version));
  const maxVersion = history.reduce((n, h) => Math.max(n, Number(h.version) || 0), 0);
  return { schemaVersion: Number(payload?.schemaVersion || 2), current,
    history, nextVersion: Math.max(Number(payload?.nextVersion) || 1, maxVersion + 1) };
}

export default async function (req, res) {
  if (req.method === 'GET') {
    const result = await db.query('SELECT payload, updated_at FROM dcode_hardware_register_state WHERE id = TRUE LIMIT 1');
    if (!result.rows.length) return res.status(404).json({ error: 'Hardware register database has not been seeded.' });
    const revisions = await db.query('SELECT version_no, status, note, payload, created_at FROM dcode_hardware_register_revisions ORDER BY version_no ASC');
    return res.status(200).json({ ok: true, state: publicState(result.rows[0].payload, revisions.rows), updatedAt: result.rows[0].updated_at, storage: 'postgresql' });
  }

  const body = req.body || {};
  if (body.action !== 'save' || !body.state || !body.state.current || !Array.isArray(body.state.current.items) || !Array.isArray(body.state.current.vendors))
    return res.status(400).json({ error: 'Expected a complete hardware register state.' });
  const incoming = body.state, current = incoming.current, state = { schemaVersion: 2, current };
  if (sizeOf(state) > MAX_BYTES) return res.status(413).json({ error: 'Current register data is too large to save.' });

  const vendors = current.vendors.map(v => ({
    name: String(typeof v === 'string' ? v : v.name || '').trim(), active: typeof v === 'string' ? true : v.active !== false,
    contact: typeof v === 'string' ? '' : String(v.contact || ''), email: typeof v === 'string' ? '' : String(v.email || ''),
    phone: typeof v === 'string' ? '' : String(v.phone || ''), gstin: typeof v === 'string' ? '' : String(v.gstin || ''),
    notes: typeof v === 'string' ? '' : String(v.notes || '')
  })).filter(v => v.name);
  const items = current.items.map((it, index) => ({
    id: String(it.id || ('HW-' + String(index + 1).padStart(3, '0'))), description: String(it.description || '').trim(),
    category: String(it.category || 'Other'), model: String(it.model || ''), primary_vendor_name: String(it.primaryVendor || ''),
    quantity: Math.max(0, Number(it.qty ?? it.quantity ?? 1) || 0), unit: String(it.unit || 'nos'),
    gst_rate: Math.min(100, Math.max(0, Number(it.gstRate ?? current.gstRate ?? 18))), online_purchase: Boolean(it.onlinePurchase),
    purchase_url: String(it.purchaseUrl || ''), notes: String(it.notes || ''), status: String(it.status || 'Draft')
  })).filter(it => it.description);
  const quotes = [];
  for (const item of current.items) for (const vendor of vendors) {
    const raw = item.rates && item.rates[vendor.name], detail = (item.quoteDetails && item.quoteDetails[vendor.name]) || {};
    quotes.push({ item_id: String(item.id), vendor_name: vendor.name,
      unit_rate: raw === '' || raw === undefined || raw === null || !Number.isFinite(Number(raw)) ? null : Math.max(0, Number(raw)),
      gst_rate: Math.min(100, Math.max(0, Number(item.gstRate ?? detail.gstRate ?? current.gstRate ?? 18))),
      source_type: detail.sourceType === 'online' ? 'online' : 'supplier', product_url: String(detail.productUrl || ''),
      pack_size: Math.max(0.001, Number(detail.packSize) || 1), freight: Math.max(0, Number(detail.freight) || 0),
      discount: Math.max(0, Number(detail.discount) || 0), quotation_ref: String(detail.quotationRef || ''), notes: String(detail.notes || '') });
  }

  const expectedUpdatedAt = body.expectedUpdatedAt ? String(body.expectedUpdatedAt) : null;
  const statements = [
    { sql: 'SELECT pg_advisory_xact_lock(741902611)' },
    { sql: 'SELECT CASE WHEN $1::timestamptz IS NULL OR NOT EXISTS (SELECT 1 FROM dcode_hardware_register_state WHERE id=TRUE) OR EXISTS (SELECT 1 FROM dcode_hardware_register_state WHERE id=TRUE AND updated_at=$1::timestamptz) THEN 1 ELSE 1/0 END AS version_check', params: [expectedUpdatedAt] },
    { sql: "INSERT INTO dcode_hardware_register_revisions(version_no,status,note,payload,created_at) SELECT x.version,x.status,x.note,jsonb_build_object('current',x.data),COALESCE(x.createdAt,now()) FROM dcode_hardware_register_state s CROSS JOIN LATERAL jsonb_to_recordset(CASE WHEN jsonb_typeof(s.payload->'history')='array' THEN s.payload->'history' ELSE '[]'::jsonb END) AS x(version integer,status text,note text,data jsonb,createdAt timestamptz) WHERE s.id=TRUE AND NOT EXISTS (SELECT 1 FROM dcode_hardware_register_revisions r WHERE r.version_no=x.version) ON CONFLICT(version_no) DO NOTHING" },
    { sql: "INSERT INTO dcode_hardware_vendors(name,active,contact,email,phone,gstin,notes) SELECT x.name,x.active,x.contact,x.email,x.phone,x.gstin,x.notes FROM jsonb_to_recordset($1::jsonb) AS x(name text,active boolean,contact text,email text,phone text,gstin text,notes text) ON CONFLICT(name) DO UPDATE SET active=EXCLUDED.active,contact=EXCLUDED.contact,email=EXCLUDED.email,phone=EXCLUDED.phone,gstin=EXCLUDED.gstin,notes=EXCLUDED.notes,updated_at=now()", params: [JSON.stringify(vendors)] },
    { sql: "INSERT INTO dcode_hardware_items(id,description,category,model,primary_vendor_id,quantity,unit,gst_rate,online_purchase,purchase_url,notes,status) SELECT x.id,x.description,x.category,x.model,v.id,x.quantity,x.unit,x.gst_rate,x.online_purchase,x.purchase_url,x.notes,x.status FROM jsonb_to_recordset($1::jsonb) AS x(id text,description text,category text,model text,primary_vendor_name text,quantity numeric,unit text,gst_rate numeric,online_purchase boolean,purchase_url text,notes text,status text) LEFT JOIN dcode_hardware_vendors v ON v.name=NULLIF(x.primary_vendor_name,'') ON CONFLICT(id) DO UPDATE SET description=EXCLUDED.description,category=EXCLUDED.category,model=EXCLUDED.model,primary_vendor_id=EXCLUDED.primary_vendor_id,quantity=EXCLUDED.quantity,unit=EXCLUDED.unit,gst_rate=EXCLUDED.gst_rate,online_purchase=EXCLUDED.online_purchase,purchase_url=EXCLUDED.purchase_url,notes=EXCLUDED.notes,status=EXCLUDED.status,updated_at=now()", params: [JSON.stringify(items)] },
    { sql: "INSERT INTO dcode_hardware_quotes(item_id,vendor_id,unit_rate,gst_rate,source_type,product_url,pack_size,freight,discount,quotation_ref,notes,updated_at) SELECT x.item_id,v.id,x.unit_rate,x.gst_rate,x.source_type,x.product_url,x.pack_size,x.freight,x.discount,x.quotation_ref,x.notes,now() FROM jsonb_to_recordset($1::jsonb) AS x(item_id text,vendor_name text,unit_rate numeric,gst_rate numeric,source_type text,product_url text,pack_size numeric,freight numeric,discount numeric,quotation_ref text,notes text) JOIN dcode_hardware_vendors v ON v.name=x.vendor_name JOIN dcode_hardware_items i ON i.id=x.item_id ON CONFLICT(item_id,vendor_id) DO UPDATE SET unit_rate=EXCLUDED.unit_rate,gst_rate=EXCLUDED.gst_rate,source_type=EXCLUDED.source_type,product_url=EXCLUDED.product_url,pack_size=EXCLUDED.pack_size,freight=EXCLUDED.freight,discount=EXCLUDED.discount,quotation_ref=EXCLUDED.quotation_ref,notes=EXCLUDED.notes,updated_at=now()", params: [JSON.stringify(quotes)] },
    { sql: 'DELETE FROM dcode_hardware_items WHERE NOT EXISTS (SELECT 1 FROM jsonb_to_recordset($1::jsonb) AS x(id text) WHERE x.id=dcode_hardware_items.id)', params: [JSON.stringify(items.map(it => ({ id: it.id })))] },
    { sql: "INSERT INTO dcode_hardware_register_state(id,schema_version,payload,updated_at) VALUES(TRUE,2,$1::jsonb,now()) ON CONFLICT(id) DO UPDATE SET schema_version=2,payload=EXCLUDED.payload,updated_at=now()", params: [JSON.stringify(state)] }
  ];
  if (body.saveRevision) statements.push({
    sql: "INSERT INTO dcode_hardware_register_revisions(version_no,status,note,payload,created_at) SELECT COALESCE(MAX(version_no),0)+1,$1,$2,jsonb_build_object('current',$3::jsonb),now() FROM dcode_hardware_register_revisions",
    params: [String(current.status || 'Draft'), String(body.note || 'Saved hardware rate register revision'), JSON.stringify(current)]
  });
  try {
    await db.transaction(statements);
  } catch (error) {
    if (/division by zero/i.test(String(error))) return res.status(409).json({ error: 'The register changed in another tab or session. Reload the register before saving again.' });
    throw error;
  }
  const saved = await db.query('SELECT updated_at FROM dcode_hardware_register_state WHERE id=TRUE');
  return res.status(200).json({ ok: true, storage: 'postgresql', historyStorage: 'revision-table', atomic: true, updatedAt: saved.rows[0]?.updated_at || null, vendors: vendors.length, items: items.length, quotes: quotes.length });
}