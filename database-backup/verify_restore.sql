-- Restore smoke test for the public DCODE Cutlist backup.
-- Runs only in the disposable PostgreSQL service created by GitHub Actions.

DO $$
DECLARE
  v_count bigint;
  v_next bigint;
BEGIN
  SELECT count(*) INTO v_count FROM public."dcode_hardware_items";
  IF v_count <> 35 THEN RAISE EXCEPTION 'hardware items count: expected 35, got %', v_count; END IF;

  SELECT count(*) INTO v_count FROM public."dcode_hardware_quotes";
  IF v_count <> 140 THEN RAISE EXCEPTION 'hardware quotes count: expected 140, got %', v_count; END IF;

  SELECT count(*) INTO v_count FROM public."dcode_hardware_register_revisions";
  IF v_count <> 3 THEN RAISE EXCEPTION 'hardware register revisions count: expected 3, got %', v_count; END IF;

  SELECT count(*) INTO v_count FROM public."dcode_hardware_register_state";
  IF v_count <> 1 THEN RAISE EXCEPTION 'hardware register state count: expected 1, got %', v_count; END IF;

  SELECT count(*) INTO v_count FROM public."dcode_hardware_vendors";
  IF v_count <> 4 THEN RAISE EXCEPTION 'hardware vendors count: expected 4, got %', v_count; END IF;

  SELECT count(*) INTO v_count FROM pg_indexes
   WHERE schemaname = 'public'
     AND tablename IN (
       'dcode_cutlist_revisions','dcode_hardware_items','dcode_hardware_quotes',
       'dcode_hardware_register_revisions','dcode_hardware_register_state',
       'dcode_hardware_vendors','dcode_legacy_records','dcode_local_imports',
       'dcode_migration_runs','dcode_project_records','dcode_project_revisions',
       'dcode_projects','dcode_saved_templates'
     );
  IF v_count <> 36 THEN RAISE EXCEPTION 'index count: expected 36, got %', v_count; END IF;

  SELECT count(*) INTO v_count
    FROM public."dcode_hardware_quotes" q
    LEFT JOIN public."dcode_hardware_items" i ON i.id = q.item_id
   WHERE i.id IS NULL;
  IF v_count <> 0 THEN RAISE EXCEPTION 'supplier quotes with missing hardware item: %', v_count; END IF;

  SELECT count(*) INTO v_count
    FROM public."dcode_hardware_quotes" q
    LEFT JOIN public."dcode_hardware_vendors" v ON v.id = q.vendor_id
   WHERE v.id IS NULL;
  IF v_count <> 0 THEN RAISE EXCEPTION 'supplier quotes with missing vendor: %', v_count; END IF;

  SELECT count(*) INTO v_count
    FROM public."dcode_hardware_items" i
    LEFT JOIN public."dcode_hardware_vendors" v ON v.id = i.primary_vendor_id
   WHERE i.primary_vendor_id IS NOT NULL AND v.id IS NULL;
  IF v_count <> 0 THEN RAISE EXCEPTION 'hardware items with missing primary vendor: %', v_count; END IF;

  v_next := nextval(pg_get_serial_sequence('public.dcode_hardware_quotes', 'id'));
  IF v_next <= (SELECT max(id) FROM public."dcode_hardware_quotes") THEN
    RAISE EXCEPTION 'hardware quotes identity sequence is not ahead of existing IDs';
  END IF;

  v_next := nextval(pg_get_serial_sequence('public.dcode_hardware_register_revisions', 'id'));
  IF v_next <= (SELECT max(id) FROM public."dcode_hardware_register_revisions") THEN
    RAISE EXCEPTION 'hardware register revisions identity sequence is not ahead of existing IDs';
  END IF;

  v_next := nextval(pg_get_serial_sequence('public.dcode_hardware_vendors', 'id'));
  IF v_next <= (SELECT max(id) FROM public."dcode_hardware_vendors") THEN
    RAISE EXCEPTION 'hardware vendors identity sequence is not ahead of existing IDs';
  END IF;
END
$$;

SELECT 'Restore validation passed: 13 tables, 183 rows, 36 indexes, references and identity sequences verified.' AS result;
