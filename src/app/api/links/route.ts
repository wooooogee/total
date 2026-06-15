import { NextResponse } from 'next/server';
import { getLinkConfigs, saveLinkConfig, deleteLinkConfig } from '@/lib/db';
import { getLinkConfigsFromSheet, saveLinkConfigToSheet } from '@/lib/googleSheets';

export async function GET() {
  try {
    // 1. Google Sheets에서 로드 시도
    let configs = await getLinkConfigsFromSheet();
    const localConfigs = getLinkConfigs();
    
    // 2. Google Sheets가 비었거나 실패하면 로컬 DB 사용 및 동기화 시도
    if (!configs || configs.length === 0) {
      configs = localConfigs;
      try {
        for (const c of configs) {
          await saveLinkConfigToSheet(c);
        }
      } catch (syncError) {
        console.error('Failed to sync default link configs to Google Sheets:', syncError);
      }
    } else {
      // 구글 시트에는 있으나 로컬 DB에만 존재하는 기본 링크(A, B, C 등)를 병합하고 구글 시트에 저장
      let updatedAny = false;
      const mergedConfigs = [...configs];
      
      for (const localC of localConfigs) {
        const exists = configs.some(c => c.id === localC.id);
        if (!exists) {
          mergedConfigs.push(localC);
          try {
            await saveLinkConfigToSheet(localC);
            updatedAny = true;
          } catch (syncErr) {
            console.error(`Failed to sync link config ${localC.id} to Google Sheets:`, syncErr);
          }
        }
      }
      
      if (updatedAny) {
        configs = mergedConfigs;
      }
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
