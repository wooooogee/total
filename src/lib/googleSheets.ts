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
        const newHeaders = [...existingHeaders, ...missingHeaders];
        if (newHeaders.length > sheet.columnCount) {
          await sheet.resize({ rowCount: sheet.rowCount, columnCount: newHeaders.length });
        }
        await sheet.setHeaderRow(newHeaders);
      }
    } catch (e) {
      const newHeaders = Object.keys(data);
      if (newHeaders.length > sheet.columnCount) {
        await sheet.resize({ rowCount: sheet.rowCount, columnCount: newHeaders.length });
      }
      await sheet.setHeaderRow(newHeaders);
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

      const targetHeaders = headers.filter(h => h && /^대상자\d+$/.test(h));
      if (targetHeaders.length > 0) {
        targetHeaders.sort((a, b) => {
          const numA = parseInt(a.replace('대상자', ''), 10) || 0;
          const numB = parseInt(b.replace('대상자', ''), 10) || 0;
          return numA - numB;
        });
        targetHeaders.forEach(h => {
          const val = data[h];
          if (val) targets.push(val);
        });
      } else {
        // 각 시트별 대상자 정보 입력 열 위치에 맞게 데이터를 추출합니다. (하위 호환)
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

export async function getAllRegistrationsFromSheets(sheetTitles: string[]): Promise<any[]> {
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) return [];

  try {
    const serviceAccountAuth = new JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo(); // 1번만 로드

    const promises = sheetTitles.map(async (sheetTitle) => {
      const sheet = doc.sheetsByTitle[sheetTitle];
      if (!sheet) return [];

      const rows = await sheet.getRows();
      const headers = sheet.headerValues;

      return rows.map(row => {
        const data: any = {};
        headers.forEach(h => {
          data[h] = row.get(h) || '';
        });
        const raw = (row as any)._rawData;
        const targets: string[] = [];

        const targetHeaders = headers.filter(h => h && /^대상자\d+$/.test(h));
        if (targetHeaders.length > 0) {
          targetHeaders.sort((a, b) => {
            const numA = parseInt(a.replace('대상자', ''), 10) || 0;
            const numB = parseInt(b.replace('대상자', ''), 10) || 0;
            return numA - numB;
          });
          targetHeaders.forEach(h => {
            const val = data[h];
            if (val) targets.push(val);
          });
        } else {
          if (sheetTitle === '헬스케어580') {
            const t1 = headers[20] ? (row.get(headers[20]) || '') : (raw?.[20] || '');
            const t2 = headers[21] ? (row.get(headers[21]) || '') : (raw?.[21] || '');
            if (t1) targets.push(t1);
            if (t2) targets.push(t2);
          } else if (sheetTitle === '크루즈') {
            const t1 = headers[20] ? (row.get(headers[20]) || '') : (raw?.[20] || '');
            if (t1) targets.push(t1);
          } else {
            const t1 = headers[17] ? (row.get(headers[17]) || '') : (raw?.[17] || '');
            const t2 = headers[18] ? (row.get(headers[18]) || '') : (raw?.[18] || '');
            const t3 = headers[19] ? (row.get(headers[19]) || '') : (raw?.[19] || '');
            const t4 = headers[20] ? (row.get(headers[20]) || '') : (raw?.[20] || '');
            if (t1) targets.push(t1);
            if (t2) targets.push(t2);
            if (t3) targets.push(t3);
            if (t4) targets.push(t4);
          }
        }

        data['_targets'] = targets;
        data['_R'] = headers[17] ? (row.get(headers[17]) || '') : (raw?.[17] || '');
        data['_S'] = headers[18] ? (row.get(headers[18]) || '') : (raw?.[18] || '');
        data['_T'] = headers[19] ? (row.get(headers[19]) || '') : (raw?.[19] || '');
        data['시트구분'] = sheetTitle;
        return data;
      });
    });

    const results = await Promise.all(promises);
    return results.flat();
  } catch (error) {
    console.error(`Failed to get registrations from sheets:`, error);
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
          '상품내용고지약관', '개인정보수집이용약관', '제3자제공동의약관', '마케팅정보제공동의약관',
          '1차납입금제목', '2차납입금제목'
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
      marketingTerm: row.get('마케팅정보제공동의약관') || '',
      monthlyPayment1Title: sheet.headerValues.includes('1차납입금제목') ? (row.get('1차납입금제목') || '') : '',
      monthlyPayment2Title: sheet.headerValues.includes('2차납입금제목') ? (row.get('2차납입금제목') || '') : '',
      requireHealthcare: (() => {
        const val = row.get('헬스케어대상자입력여부');
        if (val === undefined || val === null || val === '') return true;
        return (val === true || val === 'TRUE' || val === 'true' || val === 1 || val === '1');
      })()
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
          '상품내용고지약관', '개인정보수집이용약관', '제3자제공동의약관', '마케팅정보제공동의약관',
          '1차납입금제목', '2차납입금제목', '헬스케어대상자입력여부'
        ]
      });
    }

    // 명시적으로 헤더 행 정보 로딩
    await sheet.loadHeaderRow();

    // 헤더 동적 확장
    const existingHeaders = sheet.headerValues;
    const requiredHeaders = ['1차납입금제목', '2차납입금제목', '헬스케어대상자입력여부'];
    const missingHeaders = requiredHeaders.filter(h => !existingHeaders.includes(h));
    if (missingHeaders.length > 0) {
      const newHeaders = [...existingHeaders, ...missingHeaders];
      if (newHeaders.length > sheet.columnCount) {
        await sheet.resize({ rowCount: sheet.rowCount, columnCount: newHeaders.length });
      }
      await sheet.setHeaderRow(newHeaders);
      // 헤더 갱신 후 헤더 캐시 리로드
      await sheet.loadHeaderRow();
    }

    const rows = await sheet.getRows();
    const existingRow = rows.find(r => r.get('상품ID') === config.id);

    const rowData: Record<string, string> = {
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

    if (sheet.headerValues.includes('1차납입금제목')) {
      rowData['1차납입금제목'] = config.monthlyPayment1Title || '';
    }
    if (sheet.headerValues.includes('2차납입금제목')) {
      rowData['2차납입금제목'] = config.monthlyPayment2Title || '';
    }
    if (sheet.headerValues.includes('헬스케어대상자입력여부')) {
      rowData['헬스케어대상자입력여부'] = config.requireHealthcare !== false ? 'TRUE' : 'FALSE';
    }

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
      
      if (sheet.headerValues.includes('1차납입금제목')) {
        existingRow.set('1차납입금제목', rowData['1차납입금제목']);
      }
      if (sheet.headerValues.includes('2차납입금제목')) {
        existingRow.set('2차납입금제목', rowData['2차납입금제목']);
      }
      if (sheet.headerValues.includes('헬스케어대상자입력여부')) {
        existingRow.set('헬스케어대상자입력여부', rowData['헬스케어대상자입력여부']);
      }
      await existingRow.save();
    } else {
      await sheet.addRow(rowData);
    }
    return true;
  } catch (error) {
    console.error('Failed to save product config to Sheet:', error);
    throw error;
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

export async function getSuppliersFromSheet(): Promise<any[]> {
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) return [];
  try {
    const serviceAccountAuth = new JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    let sheet = doc.sheetsByTitle['공급사설정'];
    if (!sheet) {
      sheet = await doc.addSheet({
        title: '공급사설정',
        headerValues: ['공급사명', '정산방식', '은행명', '계좌번호', '예금주', '발주서양식']
      });
      return [];
    }
    const rows = await sheet.getRows();
    const headers = sheet.headerValues;
    const clean = (str: any) => 
      str ? String(str).normalize('NFC').replace(/[\s\-_]/g, '').toLowerCase() : '';

    const findHeader = (names: string[]) => {
      return headers.find(h => names.some(n => clean(h).includes(clean(n))));
    };

    const nameKey = findHeader(['공급사명', '공급사', '업체명']) || '공급사명';
    const typeKey = findHeader(['정산방식', '정산구분', '정산']) || '정산방식';
    const bankKey = findHeader(['은행명', '은행']) || '은행명';
    const accountKey = findHeader(['계좌번호', '계좌']) || '계좌번호';
    const holderKey = findHeader(['예금주']) || '예금주';
    const templateKey = findHeader(['발주서양식', '발주서템플릿', '양식', '템플릿']) || '발주서양식';

    return rows.map(row => ({
      name: row.get(nameKey) || '',
      settlementType: row.get(typeKey) || '',
      bankName: row.get(bankKey) || '',
      accountNumber: row.get(accountKey) || '',
      accountHolder: row.get(holderKey) || '',
      template: row.get(templateKey) || ''
    }));
  } catch (error) {
    console.error('Failed to get suppliers from Sheet:', error);
    return [];
  }
}

export async function saveSupplierToSheet(supplier: any): Promise<boolean> {
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) return false;
  try {
    const serviceAccountAuth = new JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    let sheet = doc.sheetsByTitle['공급사설정'];
    if (!sheet) {
      sheet = await doc.addSheet({
        title: '공급사설정',
        headerValues: ['공급사명', '정산방식', '은행명', '계좌번호', '예금주', '발주서양식']
      });
    }
    const rows = await sheet.getRows();
    const headers = sheet.headerValues;
    const clean = (str: any) => 
      str ? String(str).normalize('NFC').replace(/[\s\-_]/g, '').toLowerCase() : '';

    const findHeader = (names: string[]) => {
      return headers.find(h => names.some(n => clean(h).includes(clean(n))));
    };

    const nameKey = findHeader(['공급사명', '공급사', '업체명']) || '공급사명';
    const existingRow = rows.find(r => r.get(nameKey) === supplier.name);
    const rowData = {
      '공급사명': supplier.name,
      '정산방식': supplier.settlementType,
      '은행명': supplier.bankName,
      '계좌번호': supplier.accountNumber,
      '예금주': supplier.accountHolder,
      '발주서양식': supplier.template
    };
    if (existingRow) {
      existingRow.set('정산방식', rowData['정산방식']);
      existingRow.set('은행명', rowData['은행명']);
      existingRow.set('계좌번호', rowData['계좌번호']);
      existingRow.set('예금주', rowData['예금주']);
      existingRow.set('발주서양식', rowData['발주서양식']);
      await existingRow.save();
    } else {
      await sheet.addRow(rowData);
    }
    return true;
  } catch (error) {
    console.error('Failed to save supplier to Sheet:', error);
    return false;
  }
}

export async function deleteSupplierFromSheet(name: string): Promise<boolean> {
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) return false;
  try {
    const serviceAccountAuth = new JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['공급사설정'];
    if (!sheet) return false;
    const rows = await sheet.getRows();
    const headers = sheet.headerValues;
    const clean = (str: any) => 
      str ? String(str).normalize('NFC').replace(/[\s\-_]/g, '').toLowerCase() : '';

    const findHeader = (names: string[]) => {
      return headers.find(h => names.some(n => clean(h).includes(clean(n))));
    };

    const nameKey = findHeader(['공급사명', '공급사', '업체명']) || '공급사명';
    const existingRow = rows.find(r => r.get(nameKey) === name);
    if (existingRow) {
      await existingRow.delete();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to delete supplier from Sheet:', error);
    return false;
  }
}

export async function getSupplyProductsFromSheet(): Promise<any[]> {
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) return [];
  try {
    const serviceAccountAuth = new JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    let sheet = doc.sheetsByTitle['공급제품리스트'];
    if (!sheet) {
      sheet = await doc.addSheet({
        title: '공급제품리스트',
        headerValues: ['제품명', '공급사명', '공급가']
      });
      return [];
    }
    const rows = await sheet.getRows();
    const headers = sheet.headerValues;
    const clean = (str: any) => 
      str ? String(str).normalize('NFC').replace(/[\s\-_]/g, '').toLowerCase() : '';

    const findHeader = (names: string[]) => {
      return headers.find(h => names.some(n => clean(h).includes(clean(n))));
    };

    const nameKey = findHeader(['제품명', '상품명', '제품', '상품']) || '제품명';
    const supplierKey = findHeader(['공급사명', '공급사', '제조사', '업체명', '업체', '공급처', '공급업체']) || '공급사명';
    const priceKey = findHeader(['공급가', '공급가격', '원가', '단가', '가격']) || '공급가';

    return rows.map(row => ({
      name: row.get(nameKey) || '',
      supplierName: row.get(supplierKey) || '',
      price: row.get(priceKey) || ''
    }));
  } catch (error) {
    console.error('Failed to get supply products from Sheet:', error);
    return [];
  }
}

export async function saveSupplyProductToSheet(product: any): Promise<boolean> {
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) return false;
  try {
    const serviceAccountAuth = new JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    let sheet = doc.sheetsByTitle['공급제품리스트'];
    if (!sheet) {
      sheet = await doc.addSheet({
        title: '공급제품리스트',
        headerValues: ['제품명', '공급사명', '공급가']
      });
    }
    const rows = await sheet.getRows();
    const headers = sheet.headerValues;
    const clean = (str: any) => 
      str ? String(str).normalize('NFC').replace(/[\s\-_]/g, '').toLowerCase() : '';

    const findHeader = (names: string[]) => {
      return headers.find(h => names.some(n => clean(h).includes(clean(n))));
    };

    const nameKey = findHeader(['제품명', '상품명', '제품', '상품']) || '제품명';
    const supplierKey = findHeader(['공급사명', '공급사', '제조사', '업체명', '업체', '공급처', '공급업체']) || '공급사명';
    const priceKey = findHeader(['공급가', '공급가격', '원가', '단가', '가격']) || '공급가';

    const existingRow = rows.find(r => r.get(nameKey) === product.name);
    if (existingRow) {
      existingRow.set(supplierKey, product.supplierName);
      existingRow.set(priceKey, product.price);
      await existingRow.save();
    } else {
      const rowData: Record<string, any> = {};
      rowData[nameKey] = product.name;
      rowData[supplierKey] = product.supplierName;
      rowData[priceKey] = product.price;
      await sheet.addRow(rowData);
    }
    return true;
  } catch (error) {
    console.error('Failed to save supply product to Sheet:', error);
    return false;
  }
}

export async function deleteSupplyProductFromSheet(name: string): Promise<boolean> {
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) return false;
  try {
    const serviceAccountAuth = new JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['공급제품리스트'];
    if (!sheet) return false;
    const rows = await sheet.getRows();
    const headers = sheet.headerValues;
    const clean = (str: any) => 
      str ? String(str).normalize('NFC').replace(/[\s\-_]/g, '').toLowerCase() : '';

    const findHeader = (names: string[]) => {
      return headers.find(h => names.some(n => clean(h).includes(clean(n))));
    };

    const nameKey = findHeader(['제품명', '상품명', '제품', '상품']) || '제품명';
    const existingRow = rows.find(r => r.get(nameKey) === name);
    if (existingRow) {
      await existingRow.delete();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to delete supply product from Sheet:', error);
    return false;
  }
}

export async function getOrdersFromSheet(): Promise<any[]> {
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) return [];
  try {
    const serviceAccountAuth = new JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    let sheet = doc.sheetsByTitle['발주내역'];
    if (!sheet) {
      sheet = await doc.addSheet({
        title: '발주내역',
        headerValues: ['발주ID', '발주일시', '고객명', '연락처', '주소', '공급사명', '제품명', '공급가', '정산방식', '정산상태', '메모', '택배사', '운송장번호']
      });
      return [];
    }
    const rows = await sheet.getRows();
    const headers = sheet.headerValues;
    const clean = (str: any) => 
      str ? String(str).normalize('NFC').replace(/[\s\-_]/g, '').toLowerCase() : '';

    const findHeader = (names: string[]) => {
      return headers.find(h => names.some(n => clean(h).includes(clean(n))));
    };

    const idKey = findHeader(['발주id', 'id', '발주번호']) || '발주ID';
    const timeKey = findHeader(['발주일시', '일시', '발주일자', '등록일시']) || '발주일시';
    const customerKey = findHeader(['고객명', '계약자명', '성명', '고객']) || '고객명';
    const phoneKey = findHeader(['연락처', '전화번호', '휴대폰', '휴대폰번호']) || '연락처';
    const addressKey = findHeader(['주소', '배송지', '배송지주소']) || '주소';
    const supplierKey = findHeader(['공급사명', '공급사', '업체명', '업체']) || '공급사명';
    const productKey = findHeader(['제품명', '상품명', '제품', '상품']) || '제품명';
    const priceKey = findHeader(['공급가', '공급가격', '원가', '단가', '가격', '금액']) || '공급가';
    const settlementKey = findHeader(['정산방식', '정산구분', '정산']) || '정산방식';
    const statusKey = findHeader(['정산상태', '상태']) || '정산상태';
    const memoKey = findHeader(['메모', '비고', '특이사항']) || '메모';
    const deliveryCompanyKey = findHeader(['택배사', '배송사']) || '택배사';
    const trackingNumberKey = findHeader(['운송장번호', '송장번호']) || '운송장번호';
    const deliveredAtKey = findHeader(['배송완료일자', '배송완료일', '배송완료일시', '완료일자', '완료일']) || '배송완료일자';

    return rows.map(row => ({
      id: row.get(idKey) || '',
      createdAt: row.get(timeKey) || '',
      customerName: row.get(customerKey) || '',
      customerPhone: row.get(phoneKey) || '',
      customerAddress: row.get(addressKey) || '',
      supplierName: row.get(supplierKey) || '',
      productName: row.get(productKey) || '',
      price: row.get(priceKey) || '',
      settlementType: row.get(settlementKey) || '',
      status: row.get(statusKey) || '정산대기',
      memo: row.get(memoKey) || '',
      deliveryCompany: row.get(deliveryCompanyKey) || '',
      trackingNumber: row.get(trackingNumberKey) || '',
      deliveredAt: row.get(deliveredAtKey) || ''
    }));
  } catch (error) {
    console.error('Failed to get orders from Sheet:', error);
    return [];
  }
}

export async function saveOrderToSheet(order: any): Promise<boolean> {
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) return false;
  try {
    const serviceAccountAuth = new JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    let sheet = doc.sheetsByTitle['발주내역'];
    if (!sheet) {
      sheet = await doc.addSheet({
        title: '발주내역',
        headerValues: ['발주ID', '발주일시', '고객명', '연락처', '주소', '공급사명', '제품명', '공급가', '정산방식', '정산상태', '메모', '택배사', '운송장번호', '배송완료일자']
      });
    }
    const rows = await sheet.getRows();
    const headers = sheet.headerValues;
    const clean = (str: any) => 
      str ? String(str).normalize('NFC').replace(/[\s\-_]/g, '').toLowerCase() : '';

    const findHeader = (names: string[]) => {
      return headers.find(h => names.some(n => clean(h).includes(clean(n))));
    };

    const idKey = findHeader(['발주id', 'id', '발주번호']) || '발주ID';
    const existingRow = rows.find(r => r.get(idKey) === order.id);
    const rowData: Record<string, string> = {
      '발주ID': order.id || `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      '발주일시': order.createdAt || new Date().toISOString(),
      '고객명': order.customerName || '',
      '연락처': order.customerPhone || '',
      '주소': order.customerAddress || '',
      '공급사명': order.supplierName || '',
      '제품명': order.productName || '',
      '공급가': order.price || '',
      '정산방식': order.settlementType || '',
      '정산상태': order.status || '정산대기',
      '메모': order.memo || '',
      '택배사': order.deliveryCompany || '',
      '운송장번호': order.trackingNumber || '',
      '배송완료일자': order.deliveredAt || ''
    };
    if (existingRow) {
      existingRow.set('발주일시', rowData['발주일시']);
      existingRow.set('고객명', rowData['고객명']);
      existingRow.set('연락처', rowData['연락처']);
      existingRow.set('주소', rowData['주소']);
      existingRow.set('공급사명', rowData['공급사명']);
      existingRow.set('제품명', rowData['제품명']);
      existingRow.set('공급가', rowData['공급가']);
      existingRow.set('정산방식', rowData['정산방식']);
      existingRow.set('정산상태', rowData['정산상태']);
      existingRow.set('메모', rowData['메모']);
      existingRow.set('택배사', rowData['택배사']);
      existingRow.set('운송장번호', rowData['운송장번호']);
      existingRow.set('배송완료일자', rowData['배송완료일자']);
      await existingRow.save();
    } else {
      await sheet.addRow(rowData);
    }
    return true;
  } catch (error) {
    console.error('Failed to save order to Sheet:', error);
    return false;
  }
}

export async function updateOrderInSheet(orderId: string, updates: {status?: string, deliveryCompany?: string, trackingNumber?: string, deliveredAt?: string}): Promise<boolean> {
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) return false;
  try {
    const serviceAccountAuth = new JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['발주내역'];
    if (!sheet) return false;

    await sheet.loadHeaderRow().catch(() => {});
    let currentHeaders = sheet.headerValues || [];
    let needsUpdate = false;
    if (!currentHeaders.includes('택배사')) {
      currentHeaders.push('택배사');
      needsUpdate = true;
    }
    if (!currentHeaders.includes('운송장번호')) {
      currentHeaders.push('운송장번호');
      needsUpdate = true;
    }
    if (!currentHeaders.includes('배송완료일자')) {
      currentHeaders.push('배송완료일자');
      needsUpdate = true;
    }
    if (needsUpdate) {
      if (currentHeaders.length > sheet.columnCount) {
        await sheet.resize({ rowCount: sheet.rowCount || 100, columnCount: currentHeaders.length });
      }
      await sheet.setHeaderRow(currentHeaders);
    }

    const rows = await sheet.getRows();
    const headers = sheet.headerValues;
    const clean = (str: any) => 
      str ? String(str).normalize('NFC').replace(/[\s\-_]/g, '').toLowerCase() : '';

    const findHeader = (names: string[]) => {
      return headers.find(h => names.some(n => clean(h).includes(clean(n))));
    };

    const idKey = findHeader(['발주id', 'id', '발주번호']) || '발주ID';
    const statusKey = findHeader(['정산상태', '상태']) || '정산상태';
    const deliveryCompanyKey = findHeader(['택배사', '배송사']) || '택배사';
    const trackingNumberKey = findHeader(['운송장번호', '송장번호']) || '운송장번호';
    const deliveredAtKey = findHeader(['배송완료일자', '배송완료일', '배송완료일시', '완료일자', '완료일']) || '배송완료일자';
    
    const existingRow = rows.find(r => r.get(idKey) === orderId);
    if (existingRow) {
      if (updates.status !== undefined) existingRow.set(statusKey, updates.status);
      if (updates.deliveryCompany !== undefined) existingRow.set(deliveryCompanyKey, updates.deliveryCompany);
      if (updates.trackingNumber !== undefined) existingRow.set(trackingNumberKey, updates.trackingNumber);
      if (updates.deliveredAt !== undefined) existingRow.set(deliveredAtKey, updates.deliveredAt);
      await existingRow.save();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to update order in Sheet:', error);
    return false;
  }
}

export async function deleteOrderFromSheet(orderId: string): Promise<boolean> {
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) return false;
  try {
    const serviceAccountAuth = new JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['발주내역'];
    if (!sheet) return false;
    const rows = await sheet.getRows();
    const headers = sheet.headerValues;
    const clean = (str: any) => 
      str ? String(str).normalize('NFC').replace(/[\s\-_]/g, '').toLowerCase() : '';

    const findHeader = (names: string[]) => {
      return headers.find(h => names.some(n => clean(h).includes(clean(n))));
    };

    const idKey = findHeader(['발주id', 'id', '발주번호']) || '발주ID';
    const existingRow = rows.find(r => r.get(idKey) === orderId);
    if (existingRow) {
      await existingRow.delete();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to delete order from Sheet:', error);
    return false;
  }
}

export async function getPrefillDataFromSheet(token?: string): Promise<any> {
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) return token ? null : [];
  try {
    const serviceAccountAuth = new JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo();

    let sheet = doc.sheetsByTitle['사전신청목록'];
    if (!sheet) {
      sheet = await doc.addSheet({
        title: '사전신청목록',
        headerValues: ['토큰ID', '계약자', '생년월일', '연락처', '주소', '상세주소', '상품ID', '구좌수', '영업자소속', '영업자명', '영업자연락처', '기업명', '사업자등록번호', '제품명1', '제품명2', '상태', '문서ID', '생성일시']
      });
      return token ? null : [];
    }

    const rows = await sheet.getRows();
    const list = rows.map(r => ({
      token: r.get('토큰ID'),
      name: r.get('계약자'),
      birth: r.get('생년월일'),
      phone: r.get('연락처'),
      address: r.get('주소'),
      addressDetail: r.get('상세주소') || '',
      product: r.get('상품ID'),
      productCount: Number(r.get('구좌수') || 1),
      salesAffiliation: r.get('영업자소속') || '',
      salesName: r.get('영업자명') || '',
      salesPhone: r.get('영업자연락처') || '',
      companyName: r.get('기업명') || '',
      businessNumber: r.get('사업자등록번호') || '',
      productName: r.get('제품명1') || '',
      productName2: r.get('제품명2') || '',
      status: r.get('상태') || '대기',
      documentId: r.get('문서ID') || '',
      createdAt: r.get('생성일시')
    }));

    if (token) {
      return list.find(item => item.token === token) || null;
    }
    return list;
  } catch (error) {
    console.error('Failed to get prefill data from Sheet:', error);
    return token ? null : [];
  }
}

export async function savePrefillDataToSheet(config: any): Promise<boolean> {
  return savePrefillBatchToSheet([config]);
}

export async function savePrefillBatchToSheet(configs: any[]): Promise<boolean> {
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY || !configs || configs.length === 0) return false;
  try {
    const serviceAccountAuth = new JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo();

    let sheet = doc.sheetsByTitle['사전신청목록'];
    if (!sheet) {
      sheet = await doc.addSheet({
        title: '사전신청목록',
        headerValues: ['토큰ID', '계약자', '생년월일', '연락처', '주소', '상세주소', '상품ID', '구좌수', '영업자소속', '영업자명', '영업자연락처', '기업명', '사업자등록번호', '제품명1', '제품명2', '상태', '문서ID', '생성일시']
      });
    }

    const rowsData = configs.map(config => ({
      '토큰ID': config.token,
      '계약자': config.name || '',
      '생년월일': config.birth || '',
      '연락처': config.phone || '',
      '주소': config.address || '',
      '상세주소': config.addressDetail || '',
      '상품ID': config.product || '',
      '구좌수': String(config.productCount || 1),
      '영업자소속': config.salesAffiliation || '',
      '영업자명': config.salesName || '',
      '영업자연락처': config.salesPhone || '',
      '기업명': config.companyName || '',
      '사업자등록번호': config.businessNumber || '',
      '제품명1': config.productName || '',
      '제품명2': config.productName2 || '',
      '상태': config.status || '대기',
      '문서ID': config.documentId || '',
      '생성일시': config.createdAt || new Date().toISOString()
    }));

    await sheet.addRows(rowsData);
    return true;
  } catch (error) {
    console.error('Failed to save prefill batch data to Sheet:', error);
    return false;
  }
}

export async function updatePrefillStatusInSheet(token: string, status: string, documentId?: string): Promise<boolean> {
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) return false;
  try {
    const serviceAccountAuth = new JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo();

    const sheet = doc.sheetsByTitle['사전신청목록'];
    if (!sheet) return false;

    const rows = await sheet.getRows();
    const existingRow = rows.find(r => r.get('토큰ID') === token);
    if (existingRow) {
      existingRow.set('상태', status);
      if (documentId) {
        existingRow.set('문서ID', documentId);
      }
      await existingRow.save();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to update prefill status in Sheet:', error);
    return false;
  }
}

export async function deletePrefillDataFromSheet(token: string): Promise<boolean> {
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) return false;
  try {
    const serviceAccountAuth = new JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo();

    const sheet = doc.sheetsByTitle['사전신청목록'];
    if (!sheet) return false;

    const rows = await sheet.getRows();
    const existingRow = rows.find(r => r.get('토큰ID') === token);
    if (existingRow) {
      await existingRow.delete();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to delete prefill data from Sheet:', error);
    return false;
  }
}


