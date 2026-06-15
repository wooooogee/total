import { NextResponse } from 'next/server';
import { getProductConfigs, saveProductConfig, deleteProductConfig, ProductConfig } from '@/lib/db';
import { getProductConfigsFromSheet, saveProductConfigToSheet, deleteProductConfigFromSheet } from '@/lib/googleSheets';

export async function GET() {
  try {
    // 1. 구글 시트에서 가져오기 시도
    let products = await getProductConfigsFromSheet();
    const localProducts = getProductConfigs();
    
    // 2. 구글 시트에 데이터가 없거나 에러가 났다면 로컬 DB에서 가져옴
    if (!products || products.length === 0) {
      products = localProducts;
      
      // 로컬 DB 데이터를 구글 시트에 백업용으로 기록 시도 (동기화)
      try {
        for (const p of products) {
          await saveProductConfigToSheet(p);
        }
      } catch (syncError) {
        console.error('Failed to sync default products to Google Sheets:', syncError);
      }
    } else {
      // 구글 시트에 데이터가 있으나, 새로 추가된 eformTemplateId 필드가 비어있을 경우
      // 로컬 DB의 템플릿 ID를 병합하고 구글 시트에도 업데이트 처리
      let updatedAny = false;
      const mergedProducts = await Promise.all(products.map(async (p) => {
        const localProduct = localProducts.find(lp => lp.id === p.id);
        if (localProduct && !p.eformTemplateId && localProduct.eformTemplateId) {
          p.eformTemplateId = localProduct.eformTemplateId;
          try {
            await saveProductConfigToSheet(p);
            updatedAny = true;
          } catch (syncErr) {
            console.error(`Failed to sync eformTemplateId for ${p.id} to Google Sheets:`, syncErr);
          }
        }
        return p;
      }));
      if (updatedAny) {
        products = mergedProducts;
      }
    }
    
    return NextResponse.json(products);
  } catch (error) {
    console.error('Failed to get products:', error);
    // Fallback to local DB
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
