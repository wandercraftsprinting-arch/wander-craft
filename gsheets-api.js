// Google Sheets API Helper Functions
let gapiLoaded = false;
let gisLoaded = false;
let tokenClient;
let accessToken = null;

// Load Google API scripts
function loadGoogleAPIs() {
  return new Promise((resolve) => {
    const gapiScript = document.createElement('script');
    gapiScript.src = 'https://apis.google.com/js/api.js';
    gapiScript.onload = () => {
      gapi.load('client', () => {
        gapiLoaded = true;
        checkAndInit();
      });
    };
    document.head.appendChild(gapiScript);

    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.onload = () => {
      gisLoaded = true;
      checkAndInit();
    };
    document.head.appendChild(gisScript);

    function checkAndInit() {
      if (gapiLoaded && gisLoaded) {
        initGoogleSheets().then(resolve);
      }
    }
  });
}

// Initialize Google Sheets API
async function initGoogleSheets() {
  try {
    console.log('Initializing Google Sheets API...');
    await gapi.client.init({
      apiKey: GSHEETS_CONFIG.API_KEY,
      discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
    });
    console.log('gapi.client initialized');

    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GSHEETS_CONFIG.CLIENT_ID,
      scope: GSHEETS_CONFIG.SCOPES,
      callback: (response) => {
        if (response.error) {
          console.error('OAuth error:', response.error, response.error_description);
          window.dispatchEvent(new CustomEvent('gsheetsError', { detail: response.error }));
          return;
        }
        if (response.access_token) {
          accessToken = response.access_token;
          console.log('✅ Google Sheets connected!');
          window.dispatchEvent(new CustomEvent('gsheetsConnected'));
        }
      },
      error_callback: (err) => {
        console.error('Token client error:', err);
        window.dispatchEvent(new CustomEvent('gsheetsError', { detail: err.type || 'unknown error' }));
      }
    });
    console.log('tokenClient initialized');

    return true;
  } catch (error) {
    console.error('Google Sheets init failed:', error);
    return false;
  }
}

// Request authorization
function authorizeGoogleSheets() {
  if (!tokenClient) {
    console.warn('Google Sheets not initialized');
    return;
  }
  tokenClient.requestAccessToken();
}

// Save data to Google Sheet
async function saveToSheet(sheetName, data) {
  if (!accessToken) {
    console.warn('Not authorized. Saving to localStorage only.');
    return false;
  }

  try {
    // Always clear existing data rows first to avoid stale rows after deletes
    await gapi.client.sheets.spreadsheets.values.clear({
      spreadsheetId: GSHEETS_CONFIG.SPREADSHEET_ID,
      range: `${sheetName}!A2:Z`,
    });

    if (data.length === 0) return true;

    const keys = Object.keys(data[0]);
    const rows = data.map(item => keys.map(key => item[key] ?? ''));

    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: GSHEETS_CONFIG.SPREADSHEET_ID,
      range: `${sheetName}!A2`,
      valueInputOption: 'RAW',
      resource: { values: rows },
    });

    return true;
  } catch (error) {
    console.warn(`Failed to save to ${sheetName}:`, error);
    return false;
  }
}

// Load data from Google Sheet
async function loadFromSheet(sheetName) {
  if (!accessToken) {
    return null;
  }

  try {
    const response = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: GSHEETS_CONFIG.SPREADSHEET_ID,
      range: `${sheetName}!A1:Z`,
    });

    const rows = response.result.values;
    if (!rows || rows.length < 2) {
      return [];
    }

    const headers = rows[0];
    const data = rows.slice(1).map(row => {
      const obj = {};
      headers.forEach((header, i) => {
        obj[header] = row[i] ?? '';
      });
      return obj;
    });

    return data;
  } catch (error) {
    console.warn(`Failed to load from ${sheetName}:`, error);
    return null;
  }
}

// Setup sheet headers
async function setupSheetHeaders() {
  if (!accessToken) return;

  const headers = {
    materials: ['date', 'shop', 'name', 'variation', 'qty', 'price', 'pricePerQty'],
    products: ['name', 'cost', 'markup', 'discount', 'tax', 'priceBeforeTax', 'taxAmt', 'selling', 'profit', 'margin'],
    equipment: ['date', 'shop', 'name', 'variation', 'qty', 'price'],
    overhead: ['date', 'desc', 'qty', 'amount', 'amountPerQty'],
    orders: ['customer', 'product', 'qty', 'price', 'total']
  };

  try {
    for (const [sheetName, cols] of Object.entries(headers)) {
      await gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: GSHEETS_CONFIG.SPREADSHEET_ID,
        range: `${sheetName}!A1`,
        valueInputOption: 'RAW',
        resource: { values: [cols] },
      });
    }
    console.log('✅ Sheet headers set up');
  } catch (error) {
    console.warn('Failed to setup headers:', error);
  }
}

// Export functions
window.gsheets = {
  load: loadGoogleAPIs,
  authorize: authorizeGoogleSheets,
  save: saveToSheet,
  loadData: loadFromSheet,
  setupHeaders: setupSheetHeaders,
  isAuthorized: () => !!accessToken
};
