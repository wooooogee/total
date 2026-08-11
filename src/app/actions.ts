'use server';

import { createEformsignDocument } from '@/lib/eformsign';
import { parseDateStringToMs } from '@/lib/dateUtils';
import { 
  addRegistrationToSheet, 
  getProductConfigsFromSheet, 
  savePrefillDataToSheet, 
  savePrefillBatchToSheet,
  getPrefillDataFromSheet, 
  updatePrefillStatusInSheet, 
  deletePrefillDataFromSheet 
} from '@/lib/googleSheets';
import { 
  getProductConfigs, 
  savePrefillConfig, 
  getPrefillConfigs, 
  getPrefillConfigByToken, 
  deletePrefillConfig 
} from '@/lib/db';

function formatBirth8(birth: string) {
  if (!birth || birth.length !== 6) return birth;
  const year = parseInt(birth.substring(0, 2));
  // 26년 이전이면 2000년대, 그 이후면 1900년대로 판단
  const prefix = year <= 26 ? '20' : '19';
  return prefix + birth;
}

function getKoreanDateTime() {
  const formatter = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  
  const parts = formatter.formatToParts(new Date());
  const dateObj: any = {};
  parts.forEach(p => { dateObj[p.type] = p.value; });
  
  return `${dateObj.year}-${dateObj.month}-${dateObj.day} ${dateObj.hour}:${dateObj.minute}:${dateObj.second}`;
}

export async function createPrefillLinkAction(inputData: any, customBatchName?: string) {
  try {
    const items = Array.isArray(inputData) ? inputData : [inputData];
    const createdList: any[] = [];

    const now = getKoreanDateTime();
    const batchId = `b_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const batchName = customBatchName || `${now.slice(0, 16)} (${items.length}건 묶음)`;

    for (const item of items) {
      const randomStr = Math.random().toString(36).substring(2, 8);
      const token = `p_${Date.now().toString().slice(-6)}_${randomStr}`;

      const config = {
        token,
        batchId,
        batchName,
        name: item.name || '',
        birth: item.birth || '',
        phone: item.phone || '',
        address: item.address || '',
        addressDetail: item.addressDetail || '',
        product: item.product || '더좋은프리미엄540',
        productCount: Number(item.productCount || 1),
        productName: item.productName || '',
        productName2: item.productName2 || '',
        salesAffiliation: item.salesAffiliation || '',
        salesName: item.salesName || '',
        salesPhone: item.salesPhone || '',
        companyName: item.companyName || '',
        businessNumber: item.businessNumber || '',
        status: '대기',
        createdAt: now
      };

      // 1. Local DB / memory 저장
      savePrefillConfig(config as any);
      createdList.push(config);
    }

    // 2. Google Sheets 일괄 저장 (Batch - 1회 API 호출로 초고속 처리)
    savePrefillBatchToSheet(createdList).catch(sheetErr => {
      console.error('Failed to batch save prefill to Sheet:', sheetErr);
    });

    return {
      success: true,
      data: createdList,
      batchId,
      batchName,
      message: `${createdList.length}건의 사전신청 맞춤 링크가 성공적으로 생성되었습니다.`
    };
  } catch (error: any) {
    console.error('createPrefillLinkAction error:', error);
    return { success: false, message: error.message || '링크 생성 중 오류가 발생했습니다.' };
  }
}

export async function getPrefillDataAction(token: string) {
  try {
    // 1. Google Sheets에서 조회 시도
    let data = await getPrefillDataFromSheet(token);
    if (!data) {
      // 2. Local DB 폴백
      data = getPrefillConfigByToken(token);
    }
    if (!data) {
      return { success: false, message: '유효하지 않은 신청 링크이거나 삭제된 링크입니다.' };
    }
    return { success: true, data };
  } catch (error: any) {
    console.error('getPrefillDataAction error:', error);
    // Local DB 폴백
    const data = getPrefillConfigByToken(token);
    if (data) return { success: true, data };
    return { success: false, message: '사전 입력 데이터를 불러오는 중 오류가 발생했습니다.' };
  }
}

function sortPrefillNewestFirst(list: any[]) {
  if (!Array.isArray(list)) return [];
  return [...list].sort((a, b) => {
    const timeA = parseDateStringToMs(a.createdAt);
    const timeB = parseDateStringToMs(b.createdAt);
    if (timeA !== timeB) {
      return timeB - timeA;
    }
    const tokA = a.token ? parseInt(String(a.token).split('_')[1] || '0', 10) : 0;
    const tokB = b.token ? parseInt(String(b.token).split('_')[1] || '0', 10) : 0;
    if (tokA !== tokB && !isNaN(tokA) && !isNaN(tokB)) {
      return tokB - tokA;
    }
    return 0;
  });
}

export async function getPrefillListAction() {
  try {
    let list = await getPrefillDataFromSheet();
    if (!list || list.length === 0) {
      list = getPrefillConfigs();
    }
    return { success: true, data: sortPrefillNewestFirst(list) };
  } catch (error: any) {
    console.error('getPrefillListAction error:', error);
    const list = getPrefillConfigs();
    return { success: true, data: sortPrefillNewestFirst(list) };
  }
}

export async function deletePrefillLinkAction(token: string) {
  try {
    deletePrefillConfig(token);
    await deletePrefillDataFromSheet(token).catch(() => {});
    return { success: true, message: '사전 신청 링크가 삭제되었습니다.' };
  } catch (error: any) {
    return { success: false, message: error.message || '삭제 중 오류가 발생했습니다.' };
  }
}

export async function registerAction(data: any) {
  try {
    console.log('--- Register Action Started ---');

    const eformResult = await createEformsignDocument(data);

    if (!eformResult.success) {
      return {
        success: false,
        message: '이폼사인 전송 중 오류가 발생했습니다: ' + eformResult.message,
      };
    }

    // 사전 등록 토큰이 있는 경우 사전 신청 목록 상태 업데이트
    if (data.prefillToken) {
      try {
        const token = data.prefillToken;
        // Local DB 업데이트
        const prefill = getPrefillConfigByToken(token);
        if (prefill) {
          prefill.status = '작성완료';
          prefill.documentId = eformResult.document_id;
          savePrefillConfig(prefill);
        }
        // Google Sheets 업데이트
        await updatePrefillStatusInSheet(token, '작성완료', eformResult.document_id);
      } catch (err) {
        console.error('Failed to update prefill status:', err);
      }
    }

    // Google Sheets에 데이터 기록
    try {
      let configs = getProductConfigs();
      try {
        const sheetConfigs = await getProductConfigsFromSheet();
        if (sheetConfigs && sheetConfigs.length > 0) {
          configs = sheetConfigs;
        }
      } catch (e) {
        console.error('Failed to get configs from Google Sheets in actions:', e);
      }
      
      const productConfig = configs.find(c => c.id === data.product);

      let sheetData: any = {
        '신청일시': getKoreanDateTime(),
        '유입링크': data.prefillToken ? `사전등록(${data.prefillToken})` : (data.linkId || '직접접속'),
        '상품명': productConfig ? productConfig.name : data.product,
        '제품명': data.hasMultipleProducts ? `${data.productName}, ${data.productName2}` : (data.productName || ''),
        '계약자': data.name,
        '생년월일': data.residentId || '',
        '연락처': data.phone,
        '주소': `${data.address} ${data.addressDetail || ''}`.trim(),
        '기업명': data.companyName || '',
        '사업자등록번호': data.businessNumber || '',
        '구좌수': data.productCount,
        '영업자소속': data.salesAffiliation,
        '영업자': data.salesName,
        '영업자연락처': data.salesPhone,
        'document_id': eformResult.document_id,
        '상태': '신청완료',
        '회원증서수령방법': !data.certificateDeliveryMethod || data.certificateDeliveryMethod === 'alimtalk' ? '알림톡' : data.certificateDeliveryMethod === 'email' ? `이메일 (${data.certificateEmail || ''})` : '우편'
      };

      if (data.product === '좋은건강크루즈') {
        sheetData['결제정보(카드/cms)'] = '';
        sheetData['카드사/은행명'] = '';
        sheetData['카드번호/계좌번호'] = '';
        sheetData['유효기간'] = '';
        sheetData['결제일'] = data.paymentDate;

        sheetData['1회차 납부방법'] = data.paymentMethod1 === 'card' ? '카드결제' : '계좌이체';
        sheetData['1회차 카드사/은행명'] = data.paymentMethod1 === 'card' ? data.paymentInfo1.cardCompany : '국민은행';
        sheetData['1회차 계좌/카드번호'] = data.paymentMethod1 === 'card' ? data.paymentInfo1.cardNumber : '476101-01-413681';
        sheetData['1회차 유효기간'] = data.paymentMethod1 === 'card' ? data.paymentInfo1.cardExpiry : '';

        sheetData['2~101회차 납부방법'] = data.paymentMethod2 === 'card' ? '카드결제' : 'CMS';
        sheetData['2~101회차 카드사/은행명'] = data.paymentMethod2 === 'card' ? data.paymentInfo2.cardCompany : data.paymentInfo2.bankName;
        sheetData['2~101회차 계좌/카드번호'] = data.paymentMethod2 === 'card' ? data.paymentInfo2.cardNumber : data.paymentInfo2.accountNumber;
        sheetData['2~101회차 유효기간'] = data.paymentMethod2 === 'card' ? data.paymentInfo2.cardExpiry : '';
      } else {
        sheetData['결제정보(카드/cms)'] = data.paymentMethod === 'card' ? '카드' : 'CMS';
        sheetData['카드사/은행명'] = data.paymentMethod === 'card' ? data.paymentInfo.cardCompany : data.paymentInfo.bankName;
        sheetData['카드번호/계좌번호'] = data.paymentMethod === 'card' ? data.paymentInfo.cardNumber : data.paymentInfo.accountNumber;
        sheetData['유효기간'] = data.paymentMethod === 'card' ? data.paymentInfo.cardExpiry : '';
        sheetData['결제일'] = data.paymentDate;
      }

      if (data.healthcareTargets && Array.isArray(data.healthcareTargets)) {
        data.healthcareTargets.forEach((target: any, index: number) => {
          if (target.name && target.birth) {
            const birth8 = formatBirth8(target.birth);
            const genderDigit = target.gender === '남' ? '1' : '2';
            sheetData[`대상자${index + 1}`] = `${target.name} ${birth8}-${genderDigit} ${target.phone}`;
          }
        });
      }
      
      let sheetName = '통합신청내역';

      await addRegistrationToSheet(sheetData, sheetName);
      console.log(`Google Sheets 기록 완료 (${sheetName} 시트)`);
    } catch (sheetError) {
      console.error('Google Sheets 기록 중 실패 (프로세스는 계속됨):', sheetError);
    }

    console.log('문서 생성 완료, document_id:', eformResult.document_id);
    console.log('--- Register Action Completed ---');

    return {
      success: true,
      documentId: eformResult.document_id,
      message: '가입 신청 및 전자 서명이 완료되었습니다.',
    };
  } catch (error: any) {
    console.error('--- Register Action Fatal Error ---', error);
    return { success: false, message: error.message || '등록 중 오류가 발생했습니다.' };
  }
}
