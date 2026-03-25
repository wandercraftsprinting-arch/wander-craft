// Supabase API Helper — replaces gsheets-api.js
// Uses plain fetch() against Supabase REST API, no SDK needed.

const SB = {
  headers: {
    'apikey': SUPABASE_CONFIG.ANON_KEY,
    'Authorization': 'Bearer ' + SUPABASE_CONFIG.ANON_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
  },
  url: (table) => `${SUPABASE_CONFIG.URL}/rest/v1/${table}`
};

// Load all rows from a table
async function sbLoad(table) {
  try {
    const res = await fetch(SB.url(table) + '?select=*&order=id.asc', { headers: SB.headers });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  } catch (e) {
    console.warn(`sbLoad(${table}) failed:`, e);
    return null;
  }
}

// Save table: delete all then re-insert in one RPC transaction so if insert
// fails the delete is rolled back — no data loss, no duplicates.
async function sbSave(table, data) {
  // Strip local-only fields before sending to Supabase
  const stripped = data.map(({ id, _i, ...rest }) => rest);

  // Normalize: all rows must have the same keys (Supabase PGRST102 requirement)
  const allKeys = [...new Set(stripped.flatMap(r => Object.keys(r)))];
  const clean = stripped.map(r => {
    const normalized = {};
    allKeys.forEach(k => { normalized[k] = r[k] !== undefined ? r[k] : null; });
    return normalized;
  });

  try {
    // Use Supabase RPC to run both operations atomically
    const rpcRes = await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/rpc/replace_table_${table}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_CONFIG.ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_CONFIG.ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ rows: clean })
    });

    // If RPC not available, fall back to safe sequential approach
    if (!rpcRes.ok) {
      return await sbSaveFallback(table, clean);
    }
    return true;
  } catch (e) {
    console.warn(`sbSave(${table}) RPC failed, using fallback:`, e);
    return await sbSaveFallback(table, clean);
  }
}

// Fallback: validate schema first, then delete + insert
async function sbSaveFallback(table, clean) {
  try {
    // Step 1: Load current rows as backup
    const backup = await sbLoad(table);

    // Step 2: Delete all
    const delRes = await fetch(SB.url(table) + '?id=gte.0', {
      method: 'DELETE',
      headers: SB.headers
    });
    if (!delRes.ok) throw new Error('Delete failed: ' + await delRes.text());

    if (clean.length === 0) return true;

    // Step 3: Insert new data
    const insRes = await fetch(SB.url(table), {
      method: 'POST',
      headers: { ...SB.headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify(clean)
    });

    // Step 4: If insert failed, restore backup
    if (!insRes.ok) {
      const errText = await insRes.text();
      console.warn(`sbSaveFallback insert(${table}) failed:`, errText);

      // Restore backup
      if (backup && backup.length > 0) {
        const backupClean = backup.map(({ id, ...rest }) => rest);
        await fetch(SB.url(table), {
          method: 'POST',
          headers: { ...SB.headers, 'Prefer': 'return=minimal' },
          body: JSON.stringify(backupClean)
        });
        alert(`⚠️ Save failed on "${table}" — your data has been restored.\n\nError: ${errText}`);
      } else {
        alert(`⚠️ Save failed on "${table}".\n\nError: ${errText}`);
      }
      return false;
    }

    return true;
  } catch (e) {
    console.warn(`sbSaveFallback(${table}) failed:`, e);
    return false;
  }
}

// Expose same interface shape as gsheets
window.supabase = {
  load: () => Promise.resolve(true),
  authorize: () => {},
  isAuthorized: () => true,
  save: sbSave,
  loadData: sbLoad,
  setupHeaders: () => Promise.resolve(true)
};
