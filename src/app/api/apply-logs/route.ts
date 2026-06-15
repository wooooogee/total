import { NextResponse } from 'next/server';
import { getRegistrationsFromSheet } from '@/lib/googleSheets';

export async function GET() {
  try {
    const sheets = [
      '하이브리드698',
      '프리미엄540',
      '통신결합',
      '라이즈498',
      '크루즈',
      '굿라이프헬스케어',
      '헬스케어580'
    ];

    const allLogsPromises = sheets.map(async (sheetName) => {
      try {
        const rows = await getRegistrationsFromSheet(sheetName);
        return rows.map(r => ({
          ...r,
          '시트구분': sheetName
        }));
      } catch (err) {
        console.error(`Error loading logs from sheet ${sheetName}:`, err);
        return [];
      }
    });

    const results = await Promise.all(allLogsPromises);
    const flatLogs = results.flat();

    // 신청일시 기준으로 내림차순(최근 순) 정렬
    flatLogs.sort((a, b) => {
      const dateA = new Date(a['신청일시'] || 0).getTime();
      const dateB = new Date(b['신청일시'] || 0).getTime();
      return dateB - dateA;
    });

    return NextResponse.json(flatLogs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
