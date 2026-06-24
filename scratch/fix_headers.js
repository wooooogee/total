require('dotenv').config({ path: '.env.local' });
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

async function fix() {
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
  
  await sheet.setHeaderRow([
    '상품ID', '상품명', '총액', '1차납입금', '2차납입금', '환급금안내', '이폼사인템플릿ID', '연결시트명',
    '상품내용고지약관', '개인정보수집이용약관', '제3자제공동의약관', '마케팅정보제공동의약관'
  ]);
  console.log('Headers updated successfully!');
}
fix().catch(console.error);
