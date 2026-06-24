require('dotenv').config({ path: '.env.local' });
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

async function dump() {
  const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
  const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  const auth = new JWT({
    email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: GOOGLE_PRIVATE_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(SPREADSHEET_ID, auth);
  await doc.loadInfo();
  
  const sheet = doc.sheetsByTitle['상품설정'];
  if (!sheet) {
    console.log('No 상품설정 sheet');
    return;
  }
  const rows = await sheet.getRows();
  rows.forEach(r => {
    console.log(`ID: ${r.get('상품ID')}, TargetSheet: ${r.get('연결시트명')}, Name: ${r.get('상품명')}`);
  });
}
dump().catch(console.error);
