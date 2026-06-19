import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { ProductConfig } from './db';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || '19HQigorXz8j2K2PyQx4k4rGGUMVKk43aNSAI9sEgRyc';
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY
  ?.replace(/^"|"$/g, '')
  ?.replace(/\\n/g, '\n');

export async function verifyEmployee(searchTerm: string) {
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    console.warn('Google Sheets credentials are not set.');
    return { success: false, error: 'credentials_missing' };
  }

  try {
    const serviceAccountAuth = new JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo();

    const sheet = doc.sheetsByTitle['회원코드'];
    if (!sheet) {
      throw new Error("'회원코드' 시트를 찾을 수 없습니다.");
    }

    const rows = await sheet.getRows();
    const headers = sheet.headerValues;

    const clean = (str: any) => 
      str ? String(str).normalize('NFC').replace(/[\s\-_]/g, '').toLowerCase() : '';

    const findIndex = (name: string, defaultIdx: number) => {
      const idx = headers.findIndex(h => clean(h).includes(clean(name)));
      return idx !== -1 ? idx : defaultIdx;
    };

    const idx = {
      code: findIndex('사원코드', 1),
      name: findIndex('사원명', 5),
      status: findIndex('재직구분', 8),
      phone: findIndex('휴대폰번호', 11)
    };

    const target = clean(searchTerm);
    
    const foundRow = rows.find((row) => {
      // Use official .get() method instead of private _rawData
      const status = clean(row.get(headers[idx.status]));
      const code = clean(row.get(headers[idx.code]));
      const name = clean(row.get(headers[idx.name]));
      const phone = clean(row.get(headers[idx.phone]));
      
      if (!name && !code && !phone) return false;

      const nameMatch = name && (name === target || name.includes(target));
      const codeMatch = code && (code === target);
      const phoneMatch = phone && (phone === target || phone.includes(target));
      
      if (nameMatch || codeMatch || phoneMatch) {
         const isEmployed = status.includes('재직');
         if (isEmployed) return true;
      }
      return false;
    });

    if (foundRow) {
      const display = (str: any) => str ? String(str).normalize('NFC').trim() : '';

      const code = display(foundRow.get(headers[idx.code]));
      const name = display(foundRow.get(headers[idx.name]));
      const phone = display(foundRow.get(headers[idx.phone]));
      
      console.log(`[verifyEmployee] Match found: ${code}(${name})`);
      return { 
        success: true, 
        employeeInfo: `${code}(${name}) ${phone}` 
      };
    }

    return { success: false, error: 'not_found' };
  } catch (error) {
    console.error('Error verifying employee:', error);
    throw error;
  }
}

export async function addRegistrationToSheet(data: any, sheetTitle: string = '신청현황') {
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    console.warn('Google Sheets credentials are not set.');
    return { success: false, error: 'credentials_missing' };
  }

  try {
    const serviceAccountAuth = new JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo();

    let sheet = doc.sheetsByTitle[sheetTitle];
    if (!sheet) {
      sheet = await doc.addSheet({ title: sheetTitle, headerValues: Object.keys(data) });
    }

    try {
      await sheet.loadHeaderRow();
      const existingHeaders = sheet.headerValues;
      const dataKeys = Object.keys(data);
      const missingHeaders = dataKeys.filter(key => !existingHeaders.includes(key));
      
      if (missingHeaders.length > 0) {
        await sheet.setHeaderRow([...existingHeaders, ...missingHeaders]);
      }
    } catch (e) {
      await sheet.setHeaderRow(Object.keys(data));
    }

    const result = await sheet.addRow(data);
    return { success: true, rowNumber: result.rowNumber };
  } catch (error: any) {
    console.error('Google Sheets AddRow Error:', error);
    throw error;
  }
}

export async function getLinkConfigsFromSheet(): Promise<any[]> {
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    console.warn('Google Sheets credentials are not set. Using local DB.');
    return [];
  }

  try {
    const serviceAccountAuth = new JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo();

    const sheet = doc.sheetsByTitle['링크설정'];
    if (!sheet) {
      // 링크설정 시트가 없으면 생성하고 헤더 지정
      const newSheet = await doc.addSheet({
        title: '링크설정',
        headerValues: ['링크ID', '링크명', '노출상품목록', '활성화여부', '생성일시']
      });
      return [];
    }

    const rows = await sheet.getRows();
    return rows.map(row => ({
      id: row.get('링크ID'),
      title: row.get('링크명'),
      products: (row.get('노출상품목록') || '').split(',').map((p: string) => p.trim()).filter(Boolean),
      isActive: row.get('활성화여부') === 'true' || row.get('활성화여부') === 'TRUE',
      createdAt: row.get('생성일시')
    }));
  } catch (error) {
    console.error('Failed to get link configs from Sheet:', error);
    return [];
  }
}

export async function saveLinkConfigToSheet(config: any): Promise<boolean> {
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) return false;

  try {
    const serviceAccountAuth = new JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo();

    let sheet = doc.sheetsByTitle['링크설정'];
    if (!sheet) {
      sheet = await doc.addSheet({
        title: '링크설정',
        headerValues: ['링크ID', '링크명', '노출상품목록', '활성화여부', '생성일시']
      });
    }

    const rows = await sheet.getRows();
    const existingRow = rows.find(r => r.get('링크ID') === config.id);

    const rowData = {
      '링크ID': config.id,
      '링크명': config.title,
      '노출상품목록': config.products.join(','),
      '활성화여부': String(config.isActive),
      '생성일시': config.createdAt || new Date().toISOString()
    };

    if (existingRow) {
      existingRow.set('링크명', rowData['링크명']);
      existingRow.set('노출상품목록', rowData['노출상품목록']);
      existingRow.set('활성화여부', rowData['활성화여부']);
      await existingRow.save();
    } else {
      await sheet.addRow(rowData);
    }
    return true;
  } catch (error) {
    console.error('Failed to save link config to Sheet:', error);
    return false;
  }
}

export async function deleteLinkConfigFromSheet(id: string): Promise<boolean> {
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) return false;

  try {
    const serviceAccountAuth = new JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo();

    const sheet = doc.sheetsByTitle['링크설정'];
    if (!sheet) return false;

    const rows = await sheet.getRows();
    const existingRow = rows.find(r => r.get('링크ID') === id);

    if (existingRow) {
      await existingRow.delete();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to delete link config from Sheet:', error);
    return false;
  }
}

export async function getRegistrationsFromSheet(sheetTitle: string): Promise<any[]> {
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) return [];

  try {
    const serviceAccountAuth = new JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo();

    const sheet = doc.sheetsByTitle[sheetTitle];
    if (!sheet) return [];

    const rows = await sheet.getRows();
    const headers = sheet.headerValues;

    return rows.map(row => {
      const data: any = {};
      headers.forEach(h => {
        data[h] = row.get(h) || '';
      });
      // 각 시트의 R, S, T열 값을 물리 셀 위치 기준(index 17, 18, 19)으로 그대로 가져옵니다.
      // TypeScript 컴파일러의 private 속성 접근 경고를 우회하기 위해 type casting을 적용합니다.
      const raw = (row as any)._rawData;
      const targets: string[] = [];

      // 각 시트별 대상자 정보 입력 열 위치에 맞게 데이터를 추출합니다.
      if (sheetTitle === '헬스케어580') {
        // 대상자1: U열(20), 대상자2: V열(21)
        const t1 = headers[20] ? (row.get(headers[20]) || '') : (raw?.[20] || '');
        const t2 = headers[21] ? (row.get(headers[21]) || '') : (raw?.[21] || '');
        if (t1) targets.push(t1);
        if (t2) targets.push(t2);
      } else if (sheetTitle === '크루즈') {
        // 대상자1: U열(20)
        const t1 = headers[20] ? (row.get(headers[20]) || '') : (raw?.[20] || '');
        if (t1) targets.push(t1);
      } else {
        // 하이브리드698, 프리미엄540, 라이즈498, 굿라이프헬스케어 등
        // R열(17), S열(18), T열(19), U열(20)에 대상자1~4가 위치함
        const t1 = headers[17] ? (row.get(headers[17]) || '') : (raw?.[17] || '');
        const t2 = headers[18] ? (row.get(headers[18]) || '') : (raw?.[18] || '');
        const t3 = headers[19] ? (row.get(headers[19]) || '') : (raw?.[19] || '');
        const t4 = headers[20] ? (row.get(headers[20]) || '') : (raw?.[20] || '');
        if (t1) targets.push(t1);
        if (t2) targets.push(t2);
        if (t3) targets.push(t3);
        if (t4) targets.push(t4);
      }

      data['_targets'] = targets;
      data['_R'] = headers[17] ? (row.get(headers[17]) || '') : (raw?.[17] || '');
      data['_S'] = headers[18] ? (row.get(headers[18]) || '') : (raw?.[18] || '');
      data['_T'] = headers[19] ? (row.get(headers[19]) || '') : (raw?.[19] || '');
      return data;
    });
  } catch (error) {
    console.error(`Failed to get registrations from sheet ${sheetTitle}:`, error);
    return [];
  }
}

export async function getProductConfigsFromSheet(): Promise<ProductConfig[]> {
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    console.warn('Google Sheets credentials are not set. Using local DB.');
    return [];
  }

  try {
    const serviceAccountAuth = new JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo();

    const sheet = doc.sheetsByTitle['상품설정'];
    if (!sheet) {
      // 상품설정 시트가 없으면 생성하고 헤더 지정
      await doc.addSheet({
        title: '상품설정',
        headerValues: [
          '상품ID', '상품명', '총액', '1차납입금', '2차납입금', '환급금안내', '이폼사인템플릿ID', '연결시트명',
          '상품내용고지약관', '개인정보수집이용약관', '제3자제공동의약관', '마케팅정보제공동의약관'
        ]
      });
      return [];
    }

    const rows = await sheet.getRows();
    return rows.map(row => ({
      id: row.get('상품ID') || '',
      name: row.get('상품명') || '',
      totalPrice: row.get('총액') || '',
      monthlyPayment1: row.get('1차납입금') || '',
      monthlyPayment2: row.get('2차납입금') || '',
      refundNotice: row.get('환급금안내') || '',
      eformTemplateId: row.get('이폼사인템플릿ID') || '',
      targetSheetName: row.get('연결시트명') || '',
      productNoticeTerm: row.get('상품내용고지약관') || '',
      privacyTerm: row.get('개인정보수집이용약관') || '',
      thirdPartyTerm: row.get('제3자제공동의약관') || '',
      marketingTerm: row.get('마케팅정보제공동의약관') || ''
    }));
  } catch (error) {
    console.error('Failed to get product configs from Sheet:', error);
    return [];
  }
}

export async function saveProductConfigToSheet(config: ProductConfig): Promise<boolean> {
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) return false;

  try {
    const serviceAccountAuth = new JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo();

    let sheet = doc.sheetsByTitle['상품설정'];
    if (!sheet) {
      sheet = await doc.addSheet({
        title: '상품설정',
        headerValues: [
          '상품ID', '상품명', '총액', '1차납입금', '2차납입금', '환급금안내', '이폼사인템플릿ID', '연결시트명',
          '상품내용고지약관', '개인정보수집이용약관', '제3자제공동의약관', '마케팅정보제공동의약관'
        ]
      });
    }

    const rows = await sheet.getRows();
    const existingRow = rows.find(r => r.get('상품ID') === config.id);

    const rowData = {
      '상품ID': config.id,
      '상품명': config.name,
      '총액': config.totalPrice,
      '1차납입금': config.monthlyPayment1,
      '2차납입금': config.monthlyPayment2,
      '환급금안내': config.refundNotice,
      '이폼사인템플릿ID': config.eformTemplateId,
      '연결시트명': config.targetSheetName,
      '상품내용고지약관': config.productNoticeTerm,
      '개인정보수집이용약관': config.privacyTerm,
      '제3자제공동의약관': config.thirdPartyTerm,
      '마케팅정보제공동의약관': config.marketingTerm
    };

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
    } else {
      await sheet.addRow(rowData);
    }
    return true;
  } catch (error) {
    console.error('Failed to save product config to Sheet:', error);
    return false;
  }
}

export async function deleteProductConfigFromSheet(id: string): Promise<boolean> {
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) return false;

  try {
    const serviceAccountAuth = new JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo();

    const sheet = doc.sheetsByTitle['상품설정'];
    if (!sheet) return false;

    const rows = await sheet.getRows();
    const existingRow = rows.find(r => r.get('상품ID') === id);

    if (existingRow) {
      await existingRow.delete();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to delete product config from Sheet:', error);
    return false;
  }
}

