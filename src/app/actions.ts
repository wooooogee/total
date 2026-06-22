'use server';

import { createEformsignDocument } from '@/lib/eformsign';
import { addRegistrationToSheet } from '@/lib/googleSheets';
import { getProductConfigs } from '@/lib/db';

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
      let sheetData: any = {
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
        '영업자소속': data.salesAffiliation,
        '영업자': data.salesName,
        '영업자연락처': data.salesPhone,
        'document_id': eformResult.document_id,
        '상태': '신청완료'
      };

      if (data.product === '좋은건강크루즈') {
        // 크루즈 상품인 경우: 1회차 및 2~101회차 분리 저장
        // 1) 기존 컬럼(결제정보, 카드사 등)은 크루즈에서는 1,2차로 분리되어 있으므로 중복 방지를 위해 비워둠 (결제일은 유지)
        sheetData['결제정보(카드/cms)'] = '';
        sheetData['카드사/은행명'] = '';
        sheetData['카드번호/계좌번호'] = '';
        sheetData['유효기간'] = '';
        sheetData['결제일'] = data.paymentDate;

        // 2) 크루즈 상세 컬럼 추가 기록
        sheetData['1회차 납부방법'] = data.paymentMethod1 === 'card' ? '카드결제' : '계좌이체';
        sheetData['1회차 카드사/은행명'] = data.paymentMethod1 === 'card' ? data.paymentInfo1.cardCompany : '국민은행';
        sheetData['1회차 계좌/카드번호'] = data.paymentMethod1 === 'card' ? data.paymentInfo1.cardNumber : '476101-01-413681';
        sheetData['1회차 유효기간'] = data.paymentMethod1 === 'card' ? data.paymentInfo1.cardExpiry : '';

        sheetData['2~101회차 납부방법'] = data.paymentMethod2 === 'card' ? '카드결제' : 'CMS';
        sheetData['2~101회차 카드사/은행명'] = data.paymentMethod2 === 'card' ? data.paymentInfo2.cardCompany : data.paymentInfo2.bankName;
        sheetData['2~101회차 계좌/카드번호'] = data.paymentMethod2 === 'card' ? data.paymentInfo2.cardNumber : data.paymentInfo2.accountNumber;
        sheetData['2~101회차 유효기간'] = data.paymentMethod2 === 'card' ? data.paymentInfo2.cardExpiry : '';
      } else {
        // 일반 상품인 경우 기존 매핑 유지
        sheetData['결제정보(카드/cms)'] = data.paymentMethod === 'card' ? '카드' : 'CMS';
        sheetData['카드사/은행명'] = data.paymentMethod === 'card' ? data.paymentInfo.cardCompany : data.paymentInfo.bankName;
        sheetData['카드번호/계좌번호'] = data.paymentMethod === 'card' ? data.paymentInfo.cardNumber : data.paymentInfo.accountNumber;
        sheetData['유효기간'] = data.paymentMethod === 'card' ? data.paymentInfo.cardExpiry : '';
        sheetData['결제일'] = data.paymentDate;
      }

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
      const configs = getProductConfigs();
      const productConfig = configs.find(c => c.name === data.product);
      
      // 크루즈 상품은 최우선적으로 '크루즈' 시트로 강제 라우팅 처리
      if (data.product === '좋은건강크루즈' || data.product === '더좋은크루즈' || data.product?.includes('크루즈')) {
        sheetName = '크루즈';
      } else if (productConfig && productConfig.targetSheetName) {
        sheetName = productConfig.targetSheetName;
      } else {
        if (data.product === '더좋은하이브리드698') {
          sheetName = '하이브리드698';
        } else if (data.product === '더좋은프리미엄540') {
          sheetName = '프리미엄540';
        } else if (data.product === '더좋은통신결합') {
          sheetName = '통신결합';
        } else if (data.product === '더좋은라이즈498') {
          sheetName = '라이즈498';
        } else if (data.product === '굿라이프헬스케어') {
          sheetName = '굿라이프헬스케어';
        }
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
