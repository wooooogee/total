const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const fs = require('fs');
const path = require('path');

// Manually read .env.local
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
  console.log('--- Google Sheets Connection Test ---');
  const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || '19HQigorXz8j2K2PyQx4k4rGGUMVKk43aNSAI9sEgRyc';
  const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    console.error('Credentials missing in .env.local');
    return;
  }

  try {
    const serviceAccountAuth = new JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    console.log('Successfully connected to Spreadsheet:', doc.title);

    const sheetName = '하이브리드698';
    console.log(`Checking for sheet: "${sheetName}"...`);
    
    let sheet = doc.sheetsByTitle[sheetName];
    if (!sheet) {
      console.log(`Sheet "${sheetName}" not found. Trying to create it...`);
      sheet = await doc.addSheet({ 
        title: sheetName, 
        headerValues: ['테스트시간', '상태', '메시지'] 
      });
      console.log(`Sheet "${sheetName}" created successfully!`);
    } else {
      console.log(`Sheet "${sheetName}" already exists.`);
    }

    await sheet.addRow({
      '테스트시간': new Date().toLocaleString('ko-KR'),
      '상태': '성공',
      '메시지': '디버깅 테스트 로우 추가'
    });
    console.log('Row added successfully!');

  } catch (error) {
    console.error('Error during test:', error.message);
    if (error.message.includes('403')) {
      console.error('--- Hint: Please share the spreadsheet with the service account email as EDITOR. ---');
      console.error('Email:', GOOGLE_SERVICE_ACCOUNT_EMAIL);
    }
  }
}

test();
