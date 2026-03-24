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

// Delete all rows then insert fresh data (same pattern as gsheets saveToSheet)
async function sbSave(table, data) {
  // Strip any local 'id' field so Supabase auto-generates it
  const clean = data.map(({ id, _i, ...rest }) => rest);

  try {
    // If there's data, do a dry-run insert first (single row) to catch schema errors
    // before we delete anything
    if (clean.length > 0) {
      const testRes = await fetch(SB.url(table), {
        method: 'POST',
        headers: { ...SB.headers, 'Prefer': 'return=minimal,tx=rollback' },
        body: JSON.stringify([clean[0]])
      });
      if (!testRes.ok) {
        const errText = await testRes.text();
        console.warn(`sbSave pre-check(${table}) failed:`, errText);
        alert(`⚠️ Save failed — schema error on table "${table}".\n\nDetails: ${errText}\n\nYour data was NOT deleted. Please check your Supabase table columns.`);
        return false;
      }
    }

    // Safe to delete now
    const delRes = await fetch(SB.url(table) + '?id=gte.0', {
      method: 'DELETE',
      headers: SB.headers
    });
    if (!delRes.ok) {
      const errText = await delRes.text();
      console.warn(`sbSave delete(${table}) failed:`, errText);
    }

    if (clean.length === 0) return true;

    const insRes = await fetch(SB.url(table), {
      method: 'POST',
      headers: { ...SB.headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify(clean)
    });
    if (!insRes.ok) throw new Error(await insRes.text());
    return true;
  } catch (e) {
    console.warn(`sbSave(${table}) failed:`, e);
    return false;
  }
}

// Expose same interface shape as gsheets so index-new.html needs minimal changes
window.supabase = {
  load: () => Promise.resolve(true), // no auth needed
  authorize: () => {},
  isAuthorized: () => true,
  save: sbSave,
  loadData: sbLoad,
  setupHeaders: () => Promise.resolve(true)
};
