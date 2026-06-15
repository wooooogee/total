import { NextResponse } from 'next/server';
import { getLinkConfigs, saveLinkConfig, deleteLinkConfig } from '@/lib/db';
import { getLinkConfigsFromSheet, saveLinkConfigToSheet } from '@/lib/googleSheets';

export async function GET() {
  try {
    // 1. Google Sheets에서 로드 시도
    let configs = await getLinkConfigsFromSheet();
    
    // 2. Google Sheets가 비었거나 실패하면 로컬 DB 사용
    if (!configs || configs.length === 0) {
      configs = getLinkConfigs();
    }
    
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
