import { NextResponse } from 'next/server';
import { getProductConfigs, saveProductConfig, deleteProductConfig, ProductConfig } from '@/lib/db';
import { getProductConfigsFromSheet, saveProductConfigToSheet, deleteProductConfigFromSheet } from '@/lib/googleSheets';

export async function GET() {
  try {
    // 구글 시트에서 가져오기 시도
    let products = await getProductConfigsFromSheet();
    
    // 시트에서 값을 무사히 가져왔다면 (빈 배열 포함) 그대로 반환합니다.
    return NextResponse.json(products);
  } catch (error) {
    console.error('Failed to get products:', error);
    // 에러 발생 시에만 Fallback으로 로컬 DB 사용
    return NextResponse.json(getProductConfigs());
  }
}


export async function POST(request: Request) {
  try {
    const body = await request.json();
    const config = body as ProductConfig;
    
    if (!config.id) {
      return NextResponse.json({ success: false, error: 'Product ID is required' }, { status: 400 });
    }
    
    // 1. 로컬 JSON 저장
    const localSaved = saveProductConfig(config);
    
    // 2. 구글 시트 동기화 저장
    let sheetSaved = false;
    try {
      sheetSaved = await saveProductConfigToSheet(config);
    } catch (sheetError) {
      console.error('Failed to save product to Google Sheets:', sheetError);
    }
    
    return NextResponse.json({
      success: localSaved,
      sheetSynced: sheetSaved,
      product: config
    });
  } catch (error: any) {
    console.error('Failed to save product:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ success: false, error: 'Product ID is required' }, { status: 400 });
    }
    
    // 1. 로컬 JSON 삭제
    const localDeleted = deleteProductConfig(id);
    
    // 2. 구글 시트 동기화 삭제
    let sheetDeleted = false;
    try {
      sheetDeleted = await deleteProductConfigFromSheet(id);
    } catch (sheetError) {
      console.error('Failed to delete product from Google Sheets:', sheetError);
    }
    
    return NextResponse.json({
      success: localDeleted,
      sheetSynced: sheetDeleted
    });
  } catch (error: any) {
    console.error('Failed to delete product:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
