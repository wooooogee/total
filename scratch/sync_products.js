require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

async function sync() {
  const data = fs.readFileSync(path.join(process.cwd(), 'data', 'products.json'), 'utf-8');
  const products = JSON.parse(data);

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
  if (!sheet) return;
  
  const rows = await sheet.getRows();
  for (const p of products) {
    const rowData = {
      '상품ID': p.id,
      '상품명': p.name,
      '총액': p.totalPrice,
      '1차납입금': p.monthlyPayment1,
      '2차납입금': p.monthlyPayment2,
      '환급금안내': p.refundNotice,
      '이폼사인템플릿ID': p.eformTemplateId,
      '연결시트명': p.targetSheetName || '',
      '상품내용고지약관': p.productNoticeTerm,
      '개인정보수집이용약관': p.privacyTerm,
      '제3자제공동의약관': p.thirdPartyTerm,
      '마케팅정보제공동의약관': p.marketingTerm
    };

    const existingRow = rows.find(r => r.get('상품ID') === p.id);
    if (existingRow) {
      existingRow.set('상품명', rowData['상품명']);
      existingRow.set('총액', rowData['총액']);
      existingRow.set('1차납입금', rowData['1차납입금']);
      existingRow.set('2차납입금', rowData['2차납입금']);
      existingRow.set('환급금안내', rowData['환급금안내']);
      existingRow.set('이폼사인템플릿ID', rowData['이폼사인템플릿ID']);
      existingRow.set('연결시트명', rowData['연결시트명']);
      existingRow.set('상품내용고지약관', rowData['상품내용고지약관']);
      existingRow.set('개인정보수집이용약관', rowData['개인정보수집이용약관']);
      existingRow.set('제3자제공동의약관', rowData['제3자제공동의약관']);
      existingRow.set('마케팅정보제공동의약관', rowData['마케팅정보제공동의약관']);
      await existingRow.save();
      console.log(`Synced: ${p.id} - TargetSheet: ${rowData['연결시트명']}`);
    } else {
      await sheet.addRow(rowData);
      console.log(`Added: ${p.id} - TargetSheet: ${rowData['연결시트명']}`);
    }
  }
}
sync().catch(console.error);
