'use server';

import { createEformsignDocument } from '@/lib/eformsign';
import { addRegistrationToSheet } from '@/lib/googleSheets';

function formatBirth8(birth: string) {
  if (!birth || birth.length !== 6) return birth;
  const year = parseInt(birth.substring(0, 2));
  // 26년 이전이면 2000년대, 그 이후면 1900년대로 판단
  const prefix = year <= 26 ? '20' : '19';
  return prefix + birth;
}

function getKoreanDateTime() {
  const now = new Date();
  const kst = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  
  const year = kst.getUTCFullYear();
  const month = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kst.getUTCDate()).padStart(2, '0');
  let hour = kst.getUTCHours();
  const minute = String(kst.getUTCMinutes()).padStart(2, '0');
  const second = String(kst.getUTCSeconds()).padStart(2, '0');

  const ampm = hour < 12 ? '오전' : '오후';
  if (hour > 12) hour -= 12;
  if (hour === 0) hour = 12;

  return `${year}. ${month}. ${day}. ${ampm} ${hour}:${minute}:${second}`;
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

    // Google Sheets에 데이터 기록
    try {
      const sheetData: any = {
        '신청일시': getKoreanDateTime(),
        '유입링크': data.linkId || '직접접속',
        '상품명': data.product,
        '제품명': data.hasMultipleProducts ? `${data.productName}, ${data.productName2}` : (data.productName || ''),
        '계약자': data.name,
        '연락처': data.phone,
        '주소': `${data.address} ${data.addressDetail || ''}`.trim(),
        '기업명': data.companyName || '',
        '사업자등록번호': data.businessNumber || '',
        '구좌수': data.productCount,
        '결제정보(카드/cms)': data.paymentMethod === 'card' ? '카드' : 'CMS',
        '카드사/은행명': data.paymentMethod === 'card' ? data.paymentInfo.cardCompany : data.paymentInfo.bankName,
        '카드번호/계좌번호': data.paymentMethod === 'card' ? data.paymentInfo.cardNumber : data.paymentInfo.accountNumber,
        '유효기간': data.paymentMethod === 'card' ? data.paymentInfo.cardExpiry : '',
        '결제일': data.paymentDate,
        '영업자소속': data.salesAffiliation,
        '영업자': data.salesName,
        '영업자연락처': data.salesPhone,
        'document_id': eformResult.document_id,
        '상태': '신청완료'
      };

      // 헬스케어 대상자 정보 추가
      if (data.healthcareTargets && Array.isArray(data.healthcareTargets)) {
        data.healthcareTargets.forEach((target: any, index: number) => {
          if (target.name && target.birth) {
            const birth8 = formatBirth8(target.birth);
            const genderDigit = target.gender === '남' ? '1' : '2';
            sheetData[`대상자${index + 1}`] = `${target.name} ${birth8}-${genderDigit} ${target.phone}`;
          }
        });
      }
      
      let sheetName = '헬스케어580';
      if (data.product === '더좋은하이브리드698') {
        sheetName = '하이브리드698';
      } else if (data.product === '더좋은프리미엄540') {
        sheetName = '프리미엄540';
      } else if (data.product === '더좋은통신결합') {
        sheetName = '통신결합';
      } else if (data.product === '더좋은라이즈498') {
        sheetName = '라이즈498';
      } else if (data.product === '좋은건강크루즈' || data.product === '더좋은크루즈') {
        sheetName = '크루즈';
      } else if (data.product === '굿라이프헬스케어') {
        sheetName = '굿라이프헬스케어';
      }

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
