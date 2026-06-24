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

  console.log('=== Google Spreadsheet Sheets Check ===');
  console.log('Doc Title:', doc.title);
  
  // 전체 시트 목록 확인
  const allSheets = doc.sheetsByIndex.map(s => s.title);
  console.log('Available Sheets in Doc:', allSheets);

  const checkSheets = [
    '하이브리드698',
    '프리미엄540',
    '통신결합',
    '라이즈498',
    '크루즈',
    '굿라이프헬스케어',
    '헬스케어580'
  ];

  for (const title of checkSheets) {
    const sheet = doc.sheetsByTitle[title];
    if (!sheet) {
      console.log(`\n❌ Sheet NOT FOUND: "${title}"`);
      continue;
    }
    
    try {
      await sheet.loadHeaderRow();
      const headers = sheet.headerValues;
      const rows = await sheet.getRows();
      console.log(`\n✅ Sheet: "${title}" (Rows: ${rows.length})`);
      
      // 대상자 또는 대상 관련 키워드 찾기
      const targetIndices = [];
      headers.forEach((h, idx) => {
        if (h.includes('대상자') || h.includes('피보험자')) {
          targetIndices.push(`${idx}:${h}`);
        }
      });
      console.log('Target/Healthcare Related Columns:', targetIndices.join(', ') || 'None');
      
      // R, S, T열 인덱스 및 컬럼명
      console.log(`R(17): ${headers[17] || 'N/A'}`);
      console.log(`S(18): ${headers[18] || 'N/A'}`);
      console.log(`T(19): ${headers[19] || 'N/A'}`);
      if (headers.length > 20) {
        console.log(`U(20): ${headers[20] || 'N/A'}`);
        console.log(`V(21): ${headers[21] || 'N/A'}`);
        console.log(`W(22): ${headers[22] || 'N/A'}`);
      }
    } catch (err) {
      console.error(`❌ Error loading sheet "${title}":`, err.message);
    }
  }
}

test();
