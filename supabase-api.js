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
  try {
    // Delete all rows (id >= 0 covers everything)
    const delRes = await fetch(SB.url(table) + '?id=gte.0', {
      method: 'DELETE',
      headers: SB.headers
    });
    if (!delRes.ok) {
      const errText = await delRes.text();
      console.warn(`sbSave delete(${table}) failed:`, errText);
    }

    if (data.length === 0) return true;

    // Strip any local 'id' field so Supabase auto-generates it
    const clean = data.map(({ id, ...rest }) => rest);

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
