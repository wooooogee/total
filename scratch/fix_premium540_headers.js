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

async function fixHeaders() {
  const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
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

  const sheet = doc.sheetsByTitle['프리미엄540'];
  if (!sheet) {
    console.log('프리미엄540 시트를 찾을 수 없습니다.');
    return;
  }

  const columnCount = sheet.columnCount;
  console.log(`프리미엄540 시트 로드 중... (열 개수: ${columnCount})`);
  
  await sheet.loadCells({
    startRowIndex: 0,
    endRowIndex: 1,
    startColumnIndex: 0,
    endColumnIndex: columnCount
  });

  const headers = [];
  const seen = new Set();
  let duplicatesFixed = 0;

  for (let c = 0; c < columnCount; c++) {
    const cell = sheet.getCell(0, c);
    const value = cell.value;
    if (value) {
      console.log(`Column ${c} value: ${value}`);
      if (seen.has(value)) {
        console.log(`⚠️ Duplicate found at column ${c}: "${value}"`);
        const newValue = `${value}_${duplicatesFixed + 1}`;
        cell.value = newValue;
        headers.push(newValue);
        duplicatesFixed++;
      } else {
        seen.add(value);
        headers.push(value);
      }
    } else {
      headers.push('');
    }
  }

  if (duplicatesFixed > 0) {
    console.log(`Saving changes: modified ${duplicatesFixed} duplicate headers...`);
    await sheet.saveUpdatedCells();
    console.log('Successfully fixed duplicate headers!');
  } else {
    console.log('No duplicate headers found or modified.');
  }

  // 로드가 잘 되는지 테스트
  try {
    await sheet.loadHeaderRow();
    console.log('Test sheet.loadHeaderRow() SUCCESS!');
    console.log('Headers:', sheet.headerValues);
  } catch (err) {
    console.error('Test FAILED:', err.message);
  }
}

fixHeaders();
