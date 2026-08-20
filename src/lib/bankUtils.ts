/**
 * 은행 및 계좌번호 정규화/보정 유틸리티
 */

export const normalizeAccountNumber = (bankOrCardName: string, rawAccountNo: string): string => {
  if (!rawAccountNo || rawAccountNo === '-' || rawAccountNo === 'undefined' || rawAccountNo === 'null') return '-';
  
  const str = String(rawAccountNo).trim();
  if (!str || str === '-') return '-';

  const cleanName = String(bankOrCardName || '').replace(/[\s\-_]/g, '').toLowerCase();
  
  // 카드로 시작하는 결제정보인 경우 보정하지 않고 원본 반환
  if (cleanName.includes('카드') && !cleanName.includes('은행')) {
    return str;
  }

  const digitsOnly = str.replace(/[^0-9]/g, '');

  // 국민은행 / KB 계좌인 경우
  if (cleanName.includes('국민') || cleanName.includes('kb')) {
    if (str.includes('-')) {
      const parts = str.split('-');
      // 국민은행 구 계좌 구조 (예: 046-24-0265-841 -> 3자리-2자리-4자리-3자리)
      if (parts[0].length === 2 && digitsOnly.length === 11) {
        return '0' + str;
      }
    } else {
      // 1. 국민은행 구 계좌번호 (12자리): 앞 0이 누락되어 11자리가 된 경우 (예: 46240265841 -> 046240265841)
      if (digitsOnly.length === 11) {
        return '0' + digitsOnly;
      }
      // 2. 국민은행 신 계좌번호 (14자리): 앞 0이 누락되어 13자리가 된 경우
      if (digitsOnly.length === 13) {
        return '0' + digitsOnly;
      }
    }
  }

  // 부산은행 계좌 (예: 084120604376 -> 앞 0 누락시 84120604376로 11자리가 됨)
  if (cleanName.includes('부산')) {
    if (digitsOnly.length === 11 && digitsOnly.startsWith('84')) {
      return '0' + digitsOnly;
    }
  }

  // 은행명이 명시되지 않았거나 '국민' 키워드가 들어간 11자리 계좌 (46..., 47... 시작)
  if (digitsOnly.length === 11) {
    if (cleanName.includes('부산') || digitsOnly.startsWith('84')) {
      return '0' + digitsOnly;
    }
    if (cleanName.includes('국민') || cleanName.includes('kb') || !cleanName || cleanName === '-') {
      if (/^(46|47|48|41|42|43|45)/.test(digitsOnly)) {
        return '0' + digitsOnly;
      }
    }
    if (cleanName.includes('기업') || cleanName.includes('ibk')) {
      return '0' + digitsOnly;
    }
  }

  // 13자리 숫자인 계좌 (기업/신한 등 앞 0 누락 보정)
  // 농협 계좌는 13자리가 정상 계좌(351, 352, 356, 301, 302, 173 등)이므로 앞 0을 붙이지 않음
  if (digitsOnly.length === 13) {
    if (cleanName.includes('기업') || cleanName.includes('ibk') || cleanName.includes('신한')) {
      return '0' + digitsOnly;
    }
  }

  return str;
};
