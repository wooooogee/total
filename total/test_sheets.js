const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const fs = require('fs');
const path = require('path');

// Manually read .env.local
const envPath = path.resolve(__dirname, './.env.local');
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
  const SPREADSHEET_ID = '19HQigorXz8j2K2PyQx4k4rGGUMVKk43aNSAI9sEgRyc';
  const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    console.error('Credentials missing in .env.local');
    return;
  }

  const serviceAccountAuth = new JWT({
    email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: GOOGLE_PRIVATE_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
  await doc.loadInfo();

  console.log('Sheet Title:', doc.title);
  const sheet = doc.sheetsByTitle['회원코드'];
  if (!sheet) {
    console.error("'회원코드' 시트를 찾을 수 없습니다.");
    console.log('Available sheets:', doc.sheetsByIndex.map(s => s.title));
    return;
  }

  const rows = await sheet.getRows();
  console.log('Total Rows:', rows.length);
  
  if (rows.length > 0) {
    console.log('Headers (from first row):', rows[0]._sheet.headerValues);
    console.log('First Row Data (raw):', rows[0]._rawData);
    
    rows.slice(0, 3).forEach((row, i) => {
      console.log(`Row ${i} - B(1): ${row._rawData[1]}, F(5): ${row._rawData[5]}, I(8): ${row._rawData[8]}, L(11): ${row._rawData[11]}`);
    });
  }
}

test();
