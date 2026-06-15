import { NextResponse } from 'next/server';
import { getLinkConfigs, saveLinkConfig, deleteLinkConfig } from '@/lib/db';
import { saveLinkConfigToSheet, deleteLinkConfigFromSheet, getLinkConfigsFromSheet } from '@/lib/googleSheets';

interface ParamsProps {
  params: Promise<{ id: string }>;
}

export async function PUT(req: Request, { params }: ParamsProps) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { title, products, isActive } = body;

    // 기존 설정 탐색
    let configs = await getLinkConfigsFromSheet();
    if (!configs || configs.length === 0) {
      configs = getLinkConfigs();
    }

    const existing = configs.find(c => c.id === id);
    if (!existing) {
      return NextResponse.json({ error: 'Config not found' }, { status: 404 });
    }

    const updatedConfig = {
      ...existing,
      title: title !== undefined ? title : existing.title,
      products: products !== undefined ? products : existing.products,
      isActive: isActive !== undefined ? isActive : existing.isActive
    };

    // 1. 로컬 DB 갱신
    saveLinkConfig(updatedConfig);

    // 2. 구글 시트 갱신 시도
    try {
      await saveLinkConfigToSheet(updatedConfig);
    } catch (sheetErr) {
      console.error('Failed to sync updated link config to Sheet:', sheetErr);
    }

    return NextResponse.json({ success: true, config: updatedConfig });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: ParamsProps) {
  try {
    const { id } = await params;

    // 1. 로컬 DB 삭제
    deleteLinkConfig(id);

    // 2. 구글 시트 삭제 시도
    try {
      await deleteLinkConfigFromSheet(id);
    } catch (sheetErr) {
      console.error('Failed to delete link config from Sheet:', sheetErr);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
