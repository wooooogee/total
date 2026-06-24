import { NextResponse } from 'next/server';
import { getOrdersFromSheet, saveOrderToSheet, updateOrderInSheet, deleteOrderFromSheet } from '@/lib/googleSheets';

export async function GET() {
  try {
    const orders = await getOrdersFromSheet();
    return NextResponse.json(orders);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    if (!data.customerName || !data.productName || !data.supplierName) {
      return NextResponse.json({ error: '고객명, 제품명, 공급사명은 필수입니다.' }, { status: 400 });
    }
    const success = await saveOrderToSheet(data);
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: '발주 등록에 실패했습니다.' }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const data = await request.json();
    const { id, ids, status, deliveryCompany, trackingNumber } = data;
    
    if (!status && deliveryCompany === undefined && trackingNumber === undefined) {
      return NextResponse.json({ error: '변경할 데이터가 없습니다.' }, { status: 400 });
    }

    if (ids && Array.isArray(ids)) {
      // 여러 건 상태 처리 (주로 상태변경에만 사용)
      const results = await Promise.all(
        ids.map(orderId => updateOrderInSheet(orderId, { status }))
      );
      const successCount = results.filter(Boolean).length;
      return NextResponse.json({ success: true, count: successCount });
    }

    if (!id) {
      return NextResponse.json({ error: '발주 ID가 필요합니다.' }, { status: 400 });
    }

    const updates: any = {};
    if (status !== undefined) updates.status = status;
    if (deliveryCompany !== undefined) updates.deliveryCompany = deliveryCompany;
    if (trackingNumber !== undefined) updates.trackingNumber = trackingNumber;

    const success = await updateOrderInSheet(id, updates);
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: '발주 업데이트에 실패했습니다.' }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: '삭제할 발주 ID가 필요합니다.' }, { status: 400 });
    }
    const success = await deleteOrderFromSheet(id);
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: '발주 삭제에 실패했습니다.' }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
