-- DCODE Low Balance: explicit primary-supplier relationship and quote lookup indexes.
-- Legacy rows remain valid without a primary supplier; new UI-created items require one.
ALTER TABLE dcode_hardware_items
  ADD COLUMN IF NOT EXISTS primary_vendor_id BIGINT REFERENCES dcode_hardware_vendors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_dcode_hardware_items_primary_vendor
  ON dcode_hardware_items(primary_vendor_id);

CREATE INDEX IF NOT EXISTS idx_dcode_hardware_quotes_vendor_priced
  ON dcode_hardware_quotes(vendor_id, item_id)
  WHERE unit_rate IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dcode_hardware_quotes_source
  ON dcode_hardware_quotes(source_type);