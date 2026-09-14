/**
 * 은행 및 계좌번호 정규화/보정 유틸리티
 */

export const normalizeAccountNumber = (bankOrCardName: string, rawAccountNo: string): string => {
  if (!rawAccountNo || rawAccountNo === '-' || rawAccountNo === 'undefined' || rawAccountNo === 'null') return '-';
  
  // 구글 시트 텍스트 탈출용 작은따옴표/큰따옴표 및 앞뒤 공백 제거
  let str = String(rawAccountNo).trim().replace(/^['"]+|['"]+$/g, '');
  if (!str || str === '-') return '-';

  const cleanName = String(bankOrCardName || '').replace(/[\s\-_]/g, '').toLowerCase();
  
  // 카드로 시작하는 결제정보인 경우 보정하지 않고 원본 반환
  if (cleanName.includes('카드') && !cleanName.includes('은행')) {
    return str;
  }

  const digitsOnly = str.replace(/[^0-9]/g, '');
  if (!digitsOnly) return str;

  // 이미 0으로 시작하는 경우: 앞 0이 살아있으므로 원본 반환
  if (digitsOnly.startsWith('0')) {
    return str;
  }

  // --- 1. 전 은행 공통: 휴대폰 번호 기반 평생계좌 (010...) ---
  // 휴대폰 번호(11자리)가 숫자로 파싱되어 앞 0이 누락된 10자리(10XXXXXXXX)
  if (digitsOnly.length === 10 && digitsOnly.startsWith('10')) {
    if (str.includes('-')) {
      return '0' + str;
    }
    return '0' + digitsOnly;
  }

  // --- 2. 하나은행 / KEB하나 (표준 14자리, 구 외환 13자리) ---
  // 14자리 계좌 중 앞 0 누락되어 13자리가 된 경우 (예: 1034480006007 -> 01034480006007)
  if (cleanName.includes('하나') || cleanName.includes('keb')) {
    if (digitsOnly.length === 13) {
      if (str.includes('-')) {
        const parts = str.split('-');
        if (parts[0].length === 2) return '0' + str;
      }
      return '0' + digitsOnly;
    }
    // 구 외환 13자리 계좌 누락 시 12자리
    if (digitsOnly.length === 12) {
      return '0' + (str.includes('-') ? str : digitsOnly);
    }
  }

  // --- 3. 국민은행 / KB (신 14자리, 구 12자리) ---
  if (cleanName.includes('국민') || cleanName.includes('kb')) {
    // 하이픈이 있는 경우
    if (str.includes('-')) {
      const parts = str.split('-');
      // 예: 46-24-0265-841 (앞자리 2자리 + 총 11자리) -> 046-24-0265-841
      if (parts[0].length === 2 && (digitsOnly.length === 11 || digitsOnly.length === 13)) {
        return '0' + str;
      }
    }
    // 1. 구 계좌번호 (12자리 -> 앞 0 누락 시 11자리)
    if (digitsOnly.length === 11) {
      return '0' + digitsOnly;
    }
    // 2. 신 계좌번호 (14자리 -> 앞 0 누락 시 13자리)
    if (digitsOnly.length === 13) {
      return '0' + digitsOnly;
    }
  }

  // --- 4. 우체국 (표준 14자리, 구 13자리 - 거의 대부분 01, 02 등 0으로 시작) ---
  if (cleanName.includes('우체국') || cleanName.includes('epost') || cleanName.includes('post')) {
    if (digitsOnly.length === 13 || digitsOnly.length === 12) {
      if (str.includes('-')) {
        const parts = str.split('-');
        if (parts[0].length === 2 || parts[0].length === 5) return '0' + str;
      }
      return '0' + digitsOnly;
    }
  }

  // --- 5. IBK기업은행 (표준 14자리, 구 12자리) ---
  if (cleanName.includes('기업') || cleanName.includes('ibk')) {
    if (digitsOnly.length === 13 || digitsOnly.length === 11) {
      if (str.includes('-')) {
        const parts = str.split('-');
        if (parts[0].length === 2) return '0' + str;
      }
      return '0' + digitsOnly;
    }
  }

  // --- 6. 우리은행 (13자리, 14자리) ---
  if (cleanName.includes('우리')) {
    if (digitsOnly.length === 12 || digitsOnly.length === 13) {
      if (str.includes('-')) {
        const parts = str.split('-');
        if (parts[0].length === 2) return '0' + str;
      }
      return '0' + digitsOnly;
    }
  }

  // --- 7. 신한은행 (12자리 표준, 14자리 특수) ---
  if (cleanName.includes('신한')) {
    // 12자리 표준 계좌에서 앞 0 누락되어 11자리 된 경우
    if (digitsOnly.length === 11) {
      if (str.includes('-')) {
        const parts = str.split('-');
        if (parts[0].length === 2) return '0' + str;
      }
      return '0' + digitsOnly;
    }
    // 14자리 특수 계좌에서 앞 0 누락되어 13자리 된 경우
    if (digitsOnly.length === 13) {
      return '0' + (str.includes('-') ? str : digitsOnly);
    }
  }

  // --- 8. 부산은행 (13자리 신계좌, 12자리 구계좌) ---
  if (cleanName.includes('부산')) {
    // 13자리 신계좌 앞 0 누락 시 12자리 (예: 084... -> 84...)
    if (digitsOnly.length === 12) {
      return '0' + (str.includes('-') ? str : digitsOnly);
    }
    // 12자리 구계좌 앞 0 누락 시 11자리 (예: 84120604376 -> 084120604376)
    if (digitsOnly.length === 11 && digitsOnly.startsWith('84')) {
      return '0' + (str.includes('-') ? str : digitsOnly);
    }
  }

  // --- 9. 경남은행 (13자리) ---
  if (cleanName.includes('경남')) {
    if (digitsOnly.length === 12) {
      return '0' + (str.includes('-') ? str : digitsOnly);
    }
  }

  // --- 10. 신협 (13자리 - 0으로 시작하는 조합코드 다수) ---
  if (cleanName.includes('신협') || cleanName.includes('신용협동')) {
    if (digitsOnly.length === 12) {
      if (str.includes('-')) {
        const parts = str.split('-');
        if (parts[0].length === 4) return '0' + str; // 01010-XX-XXXXXX 등
      }
      return '0' + digitsOnly;
    }
  }

  // --- 11. 새마을금고 (13자리, 14자리) ---
  if (cleanName.includes('새마을') || cleanName.includes('kfcc')) {
    if (digitsOnly.length === 12 || digitsOnly.length === 13) {
      return '0' + (str.includes('-') ? str : digitsOnly);
    }
  }

  // --- 12. 수협 / 수협은행 (12자리, 14자리) ---
  if (cleanName.includes('수협')) {
    if (digitsOnly.length === 11 || digitsOnly.length === 13) {
      return '0' + (str.includes('-') ? str : digitsOnly);
    }
  }

  // --- 13. 대구은행(iM뱅크) / 광주은행 / 전북은행 (12자리, 14자리) ---
  if (cleanName.includes('대구') || cleanName.includes('im') || cleanName.includes('광주') || cleanName.includes('전북')) {
    if (digitsOnly.length === 11 || (cleanName.includes('대구') && digitsOnly.length === 13)) {
      return '0' + (str.includes('-') ? str : digitsOnly);
    }
  }

  // --- 14. SC제일은행 (11자리) ---
  if (cleanName.includes('제일') || cleanName.includes('sc')) {
    if (digitsOnly.length === 10) {
      return '0' + (str.includes('-') ? str : digitsOnly);
    }
  }

  // --- 15. 씨티은행 (10자리, 12자리) / 제주은행 (10자리) ---
  if (cleanName.includes('제주') && digitsOnly.length === 9) {
    return '0' + (str.includes('-') ? str : digitsOnly);
  }
  if ((cleanName.includes('씨티') || cleanName.includes('citi')) && (digitsOnly.length === 9 || digitsOnly.length === 11)) {
    return '0' + (str.includes('-') ? str : digitsOnly);
  }

  // --- 16. 농협 (NH농협은행 / 단위농협) ---
  if (cleanName.includes('농협') || cleanName.includes('nh') || cleanName.includes('축협')) {
    // 신계좌 13자리(301, 302, 312, 322, 351, 352, 355, 356, 357, 903, 173, 170 등)는 정상 13자리이므로 유지!
    const isNhNew13 = /^(301|302|312|322|361|351|352|355|356|357|903|173|170)/.test(digitsOnly);
    if (digitsOnly.length === 13 && !isNhNew13) {
      // 14자리 구계좌에서 앞 0이 누락된 경우
      return '0' + (str.includes('-') ? str : digitsOnly);
    }
    if (digitsOnly.length === 10) {
      // 11자리 구계좌에서 앞 0이 누락된 경우
      return '0' + (str.includes('-') ? str : digitsOnly);
    }
  }

  // --- 17. 은행명이 명시되지 않았거나 기타인 경우 (안전 패턴 기반 보정) ---
  // 11자리 계좌 (국민/부산/기업 등)
  if (digitsOnly.length === 11) {
    if (/^(46|47|48|41|42|43|45|84)/.test(digitsOnly)) {
      return '0' + (str.includes('-') ? str : digitsOnly);
    }
  }

  // 13자리 계좌 (하나/국민/기업/우체국 등 14자리 계좌의 앞 0 누락)
  // 단, 농협 신계좌 패턴(351, 301 등)은 제외
  if (digitsOnly.length === 13) {
    const isNhNew13 = /^(301|302|312|322|361|351|352|355|356|357|903|173|170)/.test(digitsOnly);
    if (!isNhNew13 && /^(10|01|46|47|48|84|20|62|04)/.test(digitsOnly)) {
      return '0' + (str.includes('-') ? str : digitsOnly);
    }
  }

  return str;
};

/**
 * 농협 계좌번호 및 기관명으로 011(NH농협은행/중앙회) vs 012(단위농협/지역농축협) 판별
 */
export const identifyNhBankCode = (bankName: string, accountNo: string): string => {
  const cleanName = String(bankName || '').replace(/[\s\-_]/g, '').toLowerCase();
  const rawNum = String(accountNo || '').trim();
  const cleanNum = rawNum.replace(/[^0-9]/g, '');

  // 1. 명칭에 단위농협/지역농협/축협/농축협/조합 명시된 경우 -> 무조건 012
  if (cleanName.includes('단위') || cleanName.includes('지역') || cleanName.includes('축협') || cleanName.includes('농축협') || cleanName.includes('조합')) {
    return '012';
  }

  // 2. 계좌번호가 있는 경우 계좌 패턴 정밀 분석
  if (cleanNum) {
    // 2-1. 신계좌 앞 3자리 (농협은행: 301, 302, 312, 322, 361 / 단위농협: 351, 352, 355, 356, 357)
    if (/^(351|352|355|356|357)/.test(cleanNum)) return '012';
    if (/^(301|302|312|322|361)/.test(cleanNum)) return '011';

    // 2-2. 농협 가상/특수 계좌 프리픽스
    if (/^(903|173|170)/.test(cleanNum)) return '012';

    // 과목코드 정규식
    // 중앙회/농협은행(011): 01, 02, 03, 04, 05, 06, 07, 08, 11, 12, 21, 23, 24
    const nhCentralSubjectRegex = /^(01|02|03|04|05|06|07|08|11|12|21|23|24)$/;
    // 단위농협/지역농축협(012): 51, 52, 53, 55, 56, 79, 81, 82, 83, 15, 17, 48
    const nhLocalSubjectRegex = /^(51|52|53|55|56|79|81|82|83|15|17|48)$/;

    // 2-3. 하이픈(-)이 포함된 경우 과목코드(두 번째 세그먼트) 분석
    // 예: 815-01-209211 (11자리), 901060-52-029652 (14자리)
    if (rawNum.includes('-')) {
      const parts = rawNum.split('-').filter(Boolean);
      if (parts.length === 3 && parts[1].length === 2) {
        const sub = parts[1];
        if (nhLocalSubjectRegex.test(sub)) return '012';
        if (nhCentralSubjectRegex.test(sub)) return '011';
      }
    }

    // 2-4. 자릿수별 구계좌 분석 (하이픈 없는 순수 숫자 기준)
    // A. 14자리 구계좌: 지점(6자리) + 과목(2자리) + 일련번호(6자리)
    // 예: 90106052029652 -> cleanNum.slice(6, 8) === '52' -> 012
    if (cleanNum.length === 14) {
      const sub14 = cleanNum.slice(6, 8);
      if (nhLocalSubjectRegex.test(sub14)) return '012';
      if (nhCentralSubjectRegex.test(sub14)) return '011';
    }

    // B. 11자리 구계좌: 지점(3자리) + 과목(2자리) + 일련번호(6자리)
    // 예: 81501209211 -> cleanNum.slice(3, 5) === '01' -> 011
    if (cleanNum.length === 11) {
      const sub11 = cleanNum.slice(3, 5);
      if (nhCentralSubjectRegex.test(sub11)) return '011';
      if (nhLocalSubjectRegex.test(sub11)) return '012';
    }

    // C. 12자리 구계좌: 3-2-7 또는 4-2-6 형태
    if (cleanNum.length === 12) {
      const sub35 = cleanNum.slice(3, 5);
      if (nhLocalSubjectRegex.test(sub35)) return '012';
      if (nhCentralSubjectRegex.test(sub35)) return '011';
      const sub46 = cleanNum.slice(4, 6);
      if (nhLocalSubjectRegex.test(sub46)) return '012';
      if (nhCentralSubjectRegex.test(sub46)) return '011';
    }
  }

  // 3. 은행명에 중앙회 또는 은행 명시된 경우 -> 011
  if (cleanName.includes('중앙회') || cleanName.includes('은행')) {
    return '011';
  }

  // 기본 농협 코드: 011
  return '011';
};

/**
 * 은행명 및 계좌번호를 통한 기관 고유코드(3자리) 판별 유틸리티
 */
export const getBankCode = (bankOrCardName: string, accountNumberOrCardNumber?: string): string => {
  const cleanName = String(bankOrCardName || '').replace(/[\s\-_]/g, '').toLowerCase();
  const rawNum = String(accountNumberOrCardNumber || '').trim();
  const cleanNum = rawNum.replace(/[^0-9]/g, '');

  if (!cleanName && !cleanNum) return '-';

  if (cleanName.includes('국민') || cleanName.includes('kb')) {
    if (cleanName.includes('카드')) return '008';
    return '004';
  }
  if (cleanName.includes('기업') || cleanName.includes('ibk')) return '003';
  if (cleanName.includes('산업') || cleanName.includes('kdb')) return '002';

  // 농협 (011: NH농협은행 / 012: 단위농협·지역농축협)
  if (cleanName.includes('농협') || cleanName.includes('nh') || cleanName.includes('축협')) {
    return identifyNhBankCode(cleanName, rawNum);
  }

  if (cleanName.includes('우리')) return '020';
  if (cleanName.includes('신한')) {
    if (cleanName.includes('카드')) return '041';
    return '088';
  }
  if (cleanName.includes('하나') || cleanName.includes('keb')) return '081';
  if (cleanName.includes('카카오') || cleanName.includes('kakaobank')) return '090';
  if (cleanName.includes('케이') || cleanName.includes('kbank')) return '089';
  if (cleanName.includes('토스') || cleanName.includes('toss')) return '092';
  if (cleanName.includes('제일') || cleanName.includes('sc')) return '023';
  if (cleanName.includes('씨티') || cleanName.includes('citi')) return '027';
  if (cleanName.includes('수협')) return '007';
  if (cleanName.includes('대구') || cleanName.includes('im')) return '031';
  if (cleanName.includes('부산')) return '032';
  if (cleanName.includes('광주')) return '034';
  if (cleanName.includes('제주')) return '035';
  if (cleanName.includes('전북')) return '037';
  if (cleanName.includes('경남')) return '039';
  if (cleanName.includes('새마을')) return '045';
  if (cleanName.includes('신협')) return '048';
  if (cleanName.includes('우체국')) return '071';
  if (cleanName.includes('저축')) return '050';
  if (cleanName.includes('산림')) return '064';
  if (cleanName.includes('삼성')) return '016';
  if (cleanName.includes('현대')) return '029';
  if (cleanName.includes('롯데')) return '027';
  if (cleanName.includes('비씨') || cleanName.includes('bc')) return '026';

  // 기관명이 없는 경우 계좌번호 형태 기반 추정
  if (cleanNum.startsWith('3333')) return '090';
  if (cleanNum.startsWith('1000')) return '092';

  // 계좌번호 패턴 기반 농협 추정
  if (cleanNum.startsWith('351') || cleanNum.startsWith('352') || cleanNum.startsWith('355') || cleanNum.startsWith('356') || cleanNum.startsWith('357') || cleanNum.startsWith('903') || cleanNum.startsWith('173') || cleanNum.startsWith('170')) {
    return '012';
  }
  if (cleanNum.startsWith('301') || cleanNum.startsWith('302') || cleanNum.startsWith('312') || cleanNum.startsWith('322') || cleanNum.startsWith('361')) {
    return '011';
  }
  if (cleanNum.length === 14 && /^(51|52|53|55|56|79|81|82|83|15|17|48)$/.test(cleanNum.slice(6, 8))) {
    return '012';
  }
  if (cleanNum.length === 11 && /^(01|02|03|04|05|06|07|08|11|12|21|23|24)$/.test(cleanNum.slice(3, 5))) {
    return '011';
  }

  const codeMatch = cleanName.match(/\d{3}/);
  if (codeMatch) return codeMatch[0];

  return '-';
};
