const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

async function test() {
  console.log('--- Google Sheets Connection Test ---');
  console.log('ID:', SPREADSHEET_ID);
  console.log('Email:', GOOGLE_SERVICE_ACCOUNT_EMAIL);
  
  if (!SPREADSHEET_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    console.error('Missing credentials in .env.local');
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
    console.log('Successfully loaded doc:', doc.title);

    let sheet = doc.sheetsByTitle['신청현황'] || doc.sheetsByTitle['시트1'] || doc.sheetsByIndex[0];
    console.log('Selected sheet:', sheet.title);

    // Try adding a test row
    const testData = {
      Timestamp: new Date().toLocaleString('ko-KR'),
      Name: 'TEST_USER',
      Status: 'TEST_SUCCESS'
    };

    // Initialize headers if empty
    try {
      await sheet.loadHeaderRow();
    } catch (e) {
      console.log('Sheet is empty or no headers.');
    }

    if (!sheet.headerValues || sheet.headerValues.length === 0) {
      console.log('Setting headers:', Object.keys(testData));
      await sheet.setHeaderRow(Object.keys(testData));
    }

    console.log('Adding row...');
    const result = await sheet.addRow(testData);
    console.log('Result Row Number:', result.rowNumber);
    console.log('SUCCESS! Check your Google Sheet.');

  } catch (error) {
    console.error('TEST FAILED:', error.message);
    if (error.response) {
      console.error('Response details:', error.response.data);
    }
  }
}

test();
