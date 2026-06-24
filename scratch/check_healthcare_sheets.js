const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.join('=').trim().replace(/^"|"$/g, '');
    }
  });
}

async function test() {
  const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || '19HQigorXz8j2K2PyQx4k4rGGUMVKk43aNSAI9sEgRyc';
  const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    console.error('Credentials missing');
    return;
  }

  const serviceAccountAuth = new JWT({
    email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: GOOGLE_PRIVATE_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
  await doc.loadInfo();

  console.log('Document Title:', doc.title);
  
  const targetSheets = ['헬스케어580', '굿라이프헬스케어'];
  for (const title of targetSheets) {
    const sheet = doc.sheetsByTitle[title];
    if (!sheet) {
      console.log(`Sheet not found: ${title}`);
      continue;
    }
    
    await sheet.loadHeaderRow();
    const headers = sheet.headerValues;
    console.log(`\n=== Sheet: ${title} ===`);
    console.log(`Total headers: ${headers.length}`);
    
    // R (18번째, index 17), S (19번째, index 18), T (20번째, index 19)
    console.log('Header at index 17 (R):', headers[17]);
    console.log('Header at index 18 (S):', headers[18]);
    console.log('Header at index 19 (T):', headers[19]);
    
    console.log('All headers:', headers.map((h, i) => `${i}:${h}`).join(', '));
    
    const rows = await sheet.getRows();
    if (rows.length > 0) {
      const firstRow = rows[0];
      console.log('Row 0 data (R):', firstRow.get(headers[17]) || firstRow._rawData[17]);
      console.log('Row 0 data (S):', firstRow.get(headers[18]) || firstRow._rawData[18]);
      console.log('Row 0 data (T):', firstRow.get(headers[19]) || firstRow._rawData[19]);
    }
  }
}

test();
