import { NextResponse } from 'next/server';
import { getRegistrationsFromSheet, getPrefillDataFromSheet } from '@/lib/googleSheets';
import { getPrefillConfigs } from '@/lib/db';

export const dynamic = 'force-dynamic';

function parseKoreanDate(dateStr: string) {
  if (!dateStr) return 0;
  
  const time = new Date(dateStr).getTime();
  if (!isNaN(time)) return time;

  const s = String(dateStr).trim();
  
  const regex = /(\d{4})[\.\-\/]\s*(\d{1,2})[\.\-\/]\s*(\d{1,2})[\.\-\/]?\s*(오전|오후)?\s*(\d{1,2}):(\d{1,2}):(\d{1,2})/;
  const match = s.match(regex);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    const ampm = match[4];
    let hour = parseInt(match[5], 10);
    const minute = parseInt(match[6], 10);
    const second = parseInt(match[7], 10);

    if (ampm === '오후' && hour < 12) hour += 12;
    if (ampm === '오전' && hour === 12) hour = 0;

    return new Date(year, month, day, hour, minute, second).getTime();
  }

  const regexNoSec = /(\d{4})[\.\-\/]\s*(\d{1,2})[\.\-\/]\s*(\d{1,2})[\.\-\/]?\s*(오전|오후)?\s*(\d{1,2}):(\d{1,2})/;
  const matchNoSec = s.match(regexNoSec);
  if (matchNoSec) {
    const year = parseInt(matchNoSec[1], 10);
    const month = parseInt(matchNoSec[2], 10) - 1;
    const day = parseInt(matchNoSec[3], 10);
    const ampm = matchNoSec[4];
    let hour = parseInt(matchNoSec[5], 10);
    const minute = parseInt(matchNoSec[6], 10);

    if (ampm === '오후' && hour < 12) hour += 12;
    if (ampm === '오전' && hour === 12) hour = 0;

    return new Date(year, month, day, hour, minute, 0).getTime();
  }

  const regexDateOnly = /(\d{4})[\.\-\/]\s*(\d{1,2})[\.\-\/]\s*(\d{1,2})/;
  const matchDateOnly = s.match(regexDateOnly);
  if (matchDateOnly) {
    const year = parseInt(matchDateOnly[1], 10);
    const month = parseInt(matchDateOnly[2], 10) - 1;
    const day = parseInt(matchDateOnly[3], 10);
    return new Date(year, month, day).getTime();
  }

  return 0;
}

export async function GET() {
  try {
    const rawLogs = await getRegistrationsFromSheet('통합신청내역');
    let prefillList: any[] = [];
    try {
      prefillList = await getPrefillDataFromSheet();
      if (!prefillList || prefillList.length === 0) {
        prefillList = getPrefillConfigs();
      }
    } catch (e) {
      prefillList = getPrefillConfigs();
    }

    const prefillMap = new Map<string, any>();
    if (Array.isArray(prefillList)) {
      prefillList.forEach(item => {
        if (item.token) prefillMap.set(item.token, item);
      });
    }

    // 하위 호환성 및 사전등록 생년월일 보완 매핑
    const flatLogs = rawLogs.map(log => {
      let birth = log['생년월일'] || log['주민번호'] || log['계약자생년월일'] || log['residentId'] || log['birth'] || '';
      
      if (!birth || birth === '-') {
        const link = String(log['유입링크'] || '');
        const tokenMatch = link.match(/사전등록\((p_[^)]+)\)/);
        if (tokenMatch && tokenMatch[1]) {
          const matchedPrefill = prefillMap.get(tokenMatch[1]);
          if (matchedPrefill && matchedPrefill.birth) {
            birth = matchedPrefill.birth;
          }
        }
      }

      return {
        ...log,
        '생년월일': birth || log['생년월일'] || '',
        '시트구분': log['상품명'] || '미분류'
      };
    });

    // 신청일시 기준으로 내림차순(최근 순) 정렬
    flatLogs.sort((a, b) => {
      const dateA = parseKoreanDate(a['신청일시']);
      const dateB = parseKoreanDate(b['신청일시']);
      return dateB - dateA;
    });

    return NextResponse.json(flatLogs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
