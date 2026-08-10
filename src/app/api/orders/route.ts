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
    const { id, ids, items, status, deliveryCompany, trackingNumber, deliveredAt } = data;

    // 1) 여러 건 다건 배열 (개별 필드 일괄저장용)
    if (items && Array.isArray(items)) {
      const results = await Promise.all(
        items.map(async (item: any) => {
          if (!item.id) return false;
          const itemUpdates: any = {};
          if (item.status !== undefined) itemUpdates.status = item.status;
          if (item.deliveryCompany !== undefined) itemUpdates.deliveryCompany = item.deliveryCompany;
          if (item.trackingNumber !== undefined) itemUpdates.trackingNumber = item.trackingNumber;
          if (item.deliveredAt !== undefined) itemUpdates.deliveredAt = item.deliveredAt;
          return updateOrderInSheet(item.id, itemUpdates);
        })
      );
      const successCount = results.filter(Boolean).length;
      return NextResponse.json({ success: true, count: successCount });
    }

    if (!status && deliveryCompany === undefined && trackingNumber === undefined && deliveredAt === undefined) {
      return NextResponse.json({ error: '변경할 데이터가 없습니다.' }, { status: 400 });
    }

    if (ids && Array.isArray(ids)) {
      // 여러 건 동일 상태 일괄 처리
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
    if (deliveredAt !== undefined) updates.deliveredAt = deliveredAt;

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
