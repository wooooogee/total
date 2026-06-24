require('dotenv').config({ path: '.env.local' });
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

async function testLimits() {
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
  
  const sheet = doc.sheetsByTitle['크루즈'];
  try {
    await sheet.resize({ rowCount: sheet.rowCount, columnCount: 35 });
    console.log('Resized columns to 35 successfully.');
  } catch (e) {
    console.error('Resize failed:', e.message);
  }
}
testLimits().catch(console.error);
