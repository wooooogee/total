import { NextResponse } from 'next/server';
import { getRegistrationsFromSheet } from '@/lib/googleSheets';

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

    // 하위 호환성을 위해 '상품명'을 '시트구분' 필드로 매핑해 줍니다.
    const flatLogs = rawLogs.map(log => ({
      ...log,
      '시트구분': log['상품명'] || '미분류'
    }));

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
