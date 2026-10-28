/* DCODE browser-to-database migration helper.
 * Copies existing localStorage values to the authenticated Hatchable API.
 * Never deletes local values; repeat imports are safe/idempotent per key.
 */
(() => {
  const KEYS = [
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
  ];
  const $ = (s) => document.querySelector(s);
  function addMigrationPanel() {
    if ($('#dbMigrationPanel')) return;
    const panel = document.createElement('section');
    panel.id = 'dbMigrationPanel';
    panel.className = 'panel db-migration-panel';
    panel.innerHTML = '<div class="panel-head"><div><h3>Cloud data & migration</h3><p>Copy this browser’s saved drafts to your secured project database. Local data stays in place until you verify the import.</p></div><span class="page-state">Database</span></div><div class="db-migration-actions"><button id="dbExportLocal" class="light-btn" type="button">Download local backup</button><button id="dbImportLocal" class="dark-btn" type="button">Import local data to cloud</button><button id="dbCheckCloud" class="light-btn" type="button">Check cloud records</button></div><p id="dbMigrationStatus" class="muted" role="status">Not yet checked. Sign in to the app to use cloud storage.</p><div id="dbMigrationDetails" class="candidate-list"></div><small>Safety: import is a copy, not a move. AI provider keys are sensitive; remove saved API keys from browser storage before importing if you do not want them stored in the project database.</small>';
    const host = $('#designPage') || $('#cutlistPage') || $('main') || document.body;
    host.prepend(panel);
    $('#dbExportLocal').addEventListener('click', exportLocal);
    $('#dbImportLocal').addEventListener('click', importLocal);
    $('#dbCheckCloud').addEventListener('click', checkCloud);
  }
  function localItems() {
    return KEYS.filter(key => localStorage.getItem(key) !== null).map(key => {
      const raw = localStorage.getItem(key);
      let value;
      try { value = JSON.parse(raw); } catch { value = raw; }
      return { key, value, savedAt: value?.savedAt || value?.updatedAt || null };
    });
  }
  function setStatus(message, error = false) {
    const el = $('#dbMigrationStatus');
    if (el) { el.textContent = message; el.style.color = error ? '#b42318' : ''; }
  }
  function download(filename, content) {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function exportLocal() {
    const items = localItems();
    const backup = { format: 'dcode-local-backup', version: 1, exportedAt: new Date().toISOString(), itemCount: items.length, items };
    download('dcode-local-backup-' + new Date().toISOString().slice(0,10) + '.json', JSON.stringify(backup, null, 2));
    setStatus('Backup prepared with ' + items.length + ' saved item(s). Keep this file somewhere safe.');
  }
  async function importLocal() {
    const items = localItems();
    if (!items.length) { setStatus('No supported saved data found in this browser.', true); return; }
    const includesKey = items.some(x => x.key === 'dcode-nemotron-ocr-byok-v1');
    const warning = 'This copies ' + items.length + ' saved item(s) to the cloud database. Your local data will NOT be deleted.' +
      (includesKey ? '\n\nA saved Nemotron API key was found. It will be copied too. Cancel and use “Forget saved key” in Advanced tools if you do not want that secret copied.' : '') +
      '\n\nContinue only on your trusted account.';
    if (!window.confirm(warning)) return;
    const btn = $('#dbImportLocal'); btn.disabled = true; setStatus('Importing local records…');
    try {
      const response = await fetch('/api/project-data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'import-local-storage', items }) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || ('HTTP ' + response.status));
      setStatus('Cloud import complete: ' + result.itemCount + ' item(s), revision ' + result.revisionNo + '. Local drafts remain untouched.');
      const details = $('#dbMigrationDetails');
      if (details) details.textContent = 'Imported keys: ' + result.keys.join(', ');
    } catch (error) {
      setStatus('Import failed: ' + (error?.message || 'Unknown error') + '. Your local data is unchanged.', true);
    } finally { btn.disabled = false; }
  }
  async function checkCloud() {
    setStatus('Checking cloud records…');
    try {
      const response = await fetch('/api/project-data', { headers: { 'Accept': 'application/json' } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || ('HTTP ' + response.status));
      setStatus('Cloud database responds. ' + result.migrations.length + ' migration run(s) recorded.');
      const details = $('#dbMigrationDetails');
      if (details) details.textContent = result.records.map(x => x.record_type + ': ' + x.count).join(' · ') || 'No imported records yet.';
    } catch (error) { setStatus('Cloud check failed: ' + (error?.message || 'Sign in first, then retry.'), true); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addMigrationPanel, { once: true });
  else addMigrationPanel();
})();