import { NextResponse, NextRequest } from 'next/server';
import { getRegistrationsFromSheet, getPrefillDataFromSheet } from '@/lib/googleSheets';
import { getPrefillConfigs } from '@/lib/db';

export const dynamic = 'force-dynamic';

// 인메모리 캐시 (단기간 중복 구글 시트 호출 방지)
let cachedLogs: any[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 60초

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

function cleanBirth6(raw: any): string {
  if (!raw || raw === '-') return '';
  const str = String(raw).trim();
  const clean = str.replace(/[^0-9]/g, '');

  if (clean.length >= 8 && (clean.startsWith('19') || clean.startsWith('20'))) {
    const mm = parseInt(clean.slice(4, 6), 10);
    const dd = parseInt(clean.slice(6, 8), 10);
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) return clean.slice(2, 8);
  }

  if (clean.length >= 6) {
    const mm = parseInt(clean.slice(2, 4), 10);
    const dd = parseInt(clean.slice(4, 6), 10);
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) return clean.slice(0, 6);
  }

  if (clean.length > 0 && clean.length < 6) {
    const padded = clean.padStart(6, '0');
    const mm = parseInt(padded.slice(2, 4), 10);
    const dd = parseInt(padded.slice(4, 6), 10);
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) return padded;
  }

  return str;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';
    const now = Date.now();

    // 60초 캐시 유효 시 구글 시트 네트워크 호출 없이 즉시 반환
    if (!forceRefresh && cachedLogs && (now - lastCacheTime < CACHE_TTL_MS)) {
      return NextResponse.json(cachedLogs, {
        headers: {
          'X-Cache': 'HIT',
          'Cache-Control': 'no-store',
        },
      });
    }

    // 구글 시트 '통합신청내역'과 '사전등록' 정보를 병렬(Promise.allSettled)로 동시 호출하여 레이턴시 50% 단축
    const [rawLogsResult, prefillResult] = await Promise.allSettled([
      getRegistrationsFromSheet('통합신청내역'),
      getPrefillDataFromSheet().catch(() => getPrefillConfigs()),
    ]);

    let rawLogs: any[] = [];
    if (rawLogsResult.status === 'fulfilled') {
      rawLogs = rawLogsResult.value || [];
    } else {
      console.error('Failed to get registrations from sheet:', rawLogsResult.reason);
      if (cachedLogs) {
        return NextResponse.json(cachedLogs, {
          headers: { 'X-Cache': 'FALLBACK', 'Cache-Control': 'no-store' },
        });
      }
      throw rawLogsResult.reason;
    }

    let prefillList: any[] = [];
    if (prefillResult.status === 'fulfilled') {
      prefillList = prefillResult.value || [];
    }
    if (!prefillList || prefillList.length === 0) {
      try {
        prefillList = getPrefillConfigs();
      } catch (e) {
        prefillList = [];
      }
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

      const sanitizedBirth = cleanBirth6(birth);

      return {
        ...log,
        '생년월일': sanitizedBirth || birth || log['생년월일'] || '',
        '시트구분': log['상품명'] || '미분류'
      };
    });

    // 신청일시 기준으로 내림차순(최근 순) 정렬
    flatLogs.sort((a, b) => {
      const dateA = parseKoreanDate(a['신청일시']);
      const dateB = parseKoreanDate(b['신청일시']);
      return dateB - dateA;
    });

    // 캐시 저장
    cachedLogs = flatLogs;
    lastCacheTime = now;

    return NextResponse.json(flatLogs, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    if (cachedLogs) {
      return NextResponse.json(cachedLogs, {
        headers: { 'X-Cache': 'ERROR_FALLBACK', 'Cache-Control': 'no-store' },
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
