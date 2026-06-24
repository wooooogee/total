import { NextResponse } from 'next/server';
import { getLinkConfigs, saveLinkConfig, deleteLinkConfig } from '@/lib/db';
import { getLinkConfigsFromSheet, saveLinkConfigToSheet } from '@/lib/googleSheets';

export async function GET() {
  try {
    // Google Sheets에서 로드
    let configs = await getLinkConfigsFromSheet();
    
    // 만약 시트 연결 실패로 빈 배열이 오면 최소한 로컬 DB를 보여주고 싶다면 아래와 같이 처리할 수 있으나,
    // 사용자가 전부 지웠을 때도 빈 배열이 오므로, 구글 시트 값을 최우선으로 리턴합니다.
    return NextResponse.json(configs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, title, products, isActive } = body;

    if (!id || !title || !products || !Array.isArray(products)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newConfig = {
      id,
      title,
      products,
      isActive: isActive !== undefined ? isActive : true,
      createdAt: new Date().toISOString()
    };

    // 1. 로컬 DB 저장
    saveLinkConfig(newConfig);

    // 2. 구글 시트 저장 시도 (백그라운드 또는 함께 실행)
    try {
      await saveLinkConfigToSheet(newConfig);
    } catch (sheetErr) {
      console.error('Failed to sync to Google Sheets:', sheetErr);
    }

    return NextResponse.json({ success: true, config: newConfig });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
