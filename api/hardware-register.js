import { db } from 'hatchable';

export const access = 'public';
export const methods = ['GET', 'POST'];
const MAX_BYTES = 1500000;
const sizeOf = value => { try { return new TextEncoder().encode(JSON.stringify(value)).length; } catch { return MAX_BYTES + 1; } };

export default async function (req, res) {
  if (req.method === 'GET') {
    const result = await db.query('SELECT payload, updated_at FROM dcode_hardware_register_state WHERE id = TRUE LIMIT 1');
    if (!result.rows.length) return res.status(404).json({ error: 'Hardware register database has not been seeded.' });
    return res.status(200).json({ ok: true, state: result.rows[0].payload, updatedAt: result.rows[0].updated_at, storage: 'postgresql' });
  }
  const origin = String(req.headers?.origin || req.headers?.Origin || '');
  const allowedOrigins = new Set(['https://dcode-cutting-list.hatchable.site']);
  if (!allowedOrigins.has(origin)) return res.status(403).json({ error: 'A valid same-origin request is required to write the register.' });
  const body = req.body || {};
  if (body.action !== 'save' || !body.state || !body.state.current || !Array.isArray(body.state.current.items) || !Array.isArray(body.state.current.vendors)) {
    return res.status(400).json({ error: 'Expected a complete hardware register state.' });
  }
  if (sizeOf(body.state) > MAX_BYTES) return res.status(413).json({ error: 'Register is too large to save.' });
  const state = body.state;
  const data = state.current;
  const vendors = data.vendors.map(v => ({
    name: String(typeof v === 'string' ? v : v.name || '').trim(),
    active: typeof v === 'string' ? true : v.active !== false,
    contact: typeof v === 'string' ? '' : String(v.contact || ''),
    email: typeof v === 'string' ? '' : String(v.email || ''),
    phone: typeof v === 'string' ? '' : String(v.phone || ''),
    gstin: typeof v === 'string' ? '' : String(v.gstin || ''),
    notes: typeof v === 'string' ? '' : String(v.notes || '')
  })).filter(v => v.name);
  const items = data.items.map((it, index) => ({
    id: String(it.id || ('HW-' + String(index + 1).padStart(3, '0'))),
    description: String(it.description || '').trim(),
    category: String(it.category || 'Other'),
    model: String(it.model || ''),
    primary_vendor_name: String(it.primaryVendor || ''),
    quantity: Math.max(0, Number(it.qty ?? it.quantity ?? 1) || 0),
    unit: String(it.unit || 'nos'),
    gst_rate: Math.min(100, Math.max(0, Number(it.gstRate ?? data.gstRate ?? 18))),
    online_purchase: Boolean(it.onlinePurchase),
    purchase_url: String(it.purchaseUrl || ''),
    notes: String(it.notes || ''),
    status: String(it.status || 'Draft')
  })).filter(it => it.description);
  const quotes = [];
  for (const it of data.items) {
    for (const v of vendors) {
      const raw = it.rates && it.rates[v.name];
      const detail = (it.quoteDetails && it.quoteDetails[v.name]) || {};
      quotes.push({
        item_id: String(it.id),
        vendor_name: v.name,
        unit_rate: raw === '' || raw === undefined || raw === null || !Number.isFinite(Number(raw)) ? null : Math.max(0, Number(raw)),
        gst_rate: Math.min(100, Math.max(0, Number(it.gstRate ?? detail.gstRate ?? data.gstRate ?? 18))),
        source_type: detail.sourceType === 'online' ? 'online' : 'supplier',
        product_url: String(detail.productUrl || ''),
        pack_size: Math.max(0.001, Number(detail.packSize) || 1),
        freight: Math.max(0, Number(detail.freight) || 0),
        discount: Math.max(0, Number(detail.discount) || 0),
        quotation_ref: String(detail.quotationRef || ''),
        notes: String(detail.notes || '')
      });
    }
  }
  // Bulk upserts keep autosave practical while the browser edits one or more fields.
  await db.query(
    `INSERT INTO dcode_hardware_vendors(name,active,contact,email,phone,gstin,notes)
     SELECT x.name,x.active,x.contact,x.email,x.phone,x.gstin,x.notes
     FROM jsonb_to_recordset($1::jsonb) AS x(name text,active boolean,contact text,email text,phone text,gstin text,notes text)
     ON CONFLICT(name) DO UPDATE SET active=EXCLUDED.active,contact=EXCLUDED.contact,email=EXCLUDED.email,phone=EXCLUDED.phone,gstin=EXCLUDED.gstin,notes=EXCLUDED.notes,updated_at=now()`,
    [JSON.stringify(vendors)]
  );
  await db.query(
    `INSERT INTO dcode_hardware_items(id,description,category,model,primary_vendor_id,quantity,unit,gst_rate,online_purchase,purchase_url,notes,status)
     SELECT x.id,x.description,x.category,x.model,v.id,x.quantity,x.unit,x.gst_rate,x.online_purchase,x.purchase_url,x.notes,x.status
     FROM jsonb_to_recordset($1::jsonb) AS x(id text,description text,category text,model text,primary_vendor_name text,quantity numeric,unit text,gst_rate numeric,online_purchase boolean,purchase_url text,notes text,status text)
     LEFT JOIN dcode_hardware_vendors v ON v.name=NULLIF(x.primary_vendor_name,'')
     ON CONFLICT(id) DO UPDATE SET description=EXCLUDED.description,category=EXCLUDED.category,model=EXCLUDED.model,primary_vendor_id=EXCLUDED.primary_vendor_id,quantity=EXCLUDED.quantity,unit=EXCLUDED.unit,gst_rate=EXCLUDED.gst_rate,online_purchase=EXCLUDED.online_purchase,purchase_url=EXCLUDED.purchase_url,notes=EXCLUDED.notes,status=EXCLUDED.status,updated_at=now()`,
    [JSON.stringify(items)]
  );
  await db.query(
    `INSERT INTO dcode_hardware_quotes(item_id,vendor_id,unit_rate,gst_rate,source_type,product_url,pack_size,freight,discount,quotation_ref,notes,updated_at)
     SELECT x.item_id,v.id,x.unit_rate,x.gst_rate,x.source_type,x.product_url,x.pack_size,x.freight,x.discount,x.quotation_ref,x.notes,now()
     FROM jsonb_to_recordset($1::jsonb) AS x(item_id text,vendor_name text,unit_rate numeric,gst_rate numeric,source_type text,product_url text,pack_size numeric,freight numeric,discount numeric,quotation_ref text,notes text)
     JOIN dcode_hardware_vendors v ON v.name=x.vendor_name
     JOIN dcode_hardware_items i ON i.id=x.item_id
     ON CONFLICT(item_id,vendor_id) DO UPDATE SET unit_rate=EXCLUDED.unit_rate,gst_rate=EXCLUDED.gst_rate,source_type=EXCLUDED.source_type,product_url=EXCLUDED.product_url,pack_size=EXCLUDED.pack_size,freight=EXCLUDED.freight,discount=EXCLUDED.discount,quotation_ref=EXCLUDED.quotation_ref,notes=EXCLUDED.notes,updated_at=now()`,
    [JSON.stringify(quotes)]
  );
  // Keep the normalized item/quote tables in sync with the current saved register.
  // Deleting an item from the working register removes its normalized row and cascaded quotes;
  // vendor records are retained for historical continuity and should be marked inactive instead.
  await db.query(
    'DELETE FROM dcode_hardware_items WHERE NOT EXISTS (SELECT 1 FROM jsonb_to_recordset($1::jsonb) AS x(id text) WHERE x.id=dcode_hardware_items.id)',
    [JSON.stringify(items.map(it => ({ id: it.id })))]
  );
  await db.query('INSERT INTO dcode_hardware_register_state(id,schema_version,payload,updated_at) VALUES(TRUE,2,$1::jsonb,now()) ON CONFLICT(id) DO UPDATE SET schema_version=2,payload=EXCLUDED.payload,updated_at=now()', [JSON.stringify(state)]);
  if (body.saveRevision) {
    const rev = await db.query('SELECT COALESCE(MAX(version_no),0)::int AS n FROM dcode_hardware_register_revisions');
    const version = Number(rev.rows[0].n) + 1;
    await db.query('INSERT INTO dcode_hardware_register_revisions(version_no,status,note,payload) VALUES($1,$2,$3,$4::jsonb)', [version, String(data.status || 'Draft'), String(body.note || 'Saved hardware rate register revision'), JSON.stringify(state)]);
  }
  return res.status(200).json({ ok: true, storage: 'postgresql', vendors: vendors.length, items: items.length, quotes: quotes.length });
}