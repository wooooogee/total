import { NextResponse } from 'next/server';
import { 
  getPrefillDataFromSheet, 
  savePrefillBatchToSheet, 
  deletePrefillDataFromSheet 
} from '@/lib/googleSheets';
import { 
  getPrefillConfigs, 
  savePrefillConfig, 
  getPrefillConfigByToken, 
  deletePrefillConfig 
} from '@/lib/db';

function getKoreanDateTime() {
  const formatter = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  
  const parts = formatter.formatToParts(new Date());
  const dateObj: any = {};
  parts.forEach(p => { dateObj[p.type] = p.value; });
  
  return `${dateObj.year}-${dateObj.month}-${dateObj.day} ${dateObj.hour}:${dateObj.minute}:${dateObj.second}`;
}

function sortPrefillNewestFirst(list: any[]) {
  if (!Array.isArray(list)) return [];
  return [...list].sort((a, b) => {
    const timeA = String(a.createdAt || '');
    const timeB = String(b.createdAt || '');
    if (timeA && timeB && timeA !== timeB) {
      return timeB.localeCompare(timeA);
    }
    const tokA = a.token ? parseInt(String(a.token).split('_')[1] || '0', 10) : 0;
    const tokB = b.token ? parseInt(String(b.token).split('_')[1] || '0', 10) : 0;
    if (tokA !== tokB && !isNaN(tokA) && !isNaN(tokB)) {
      return tokB - tokA;
    }
    return 0;
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (token) {
      let data = await getPrefillDataFromSheet(token);
      if (!data) data = getPrefillConfigByToken(token);
      if (!data) {
        return NextResponse.json({ success: false, message: '유효하지 않은 신청 링크이거나 삭제된 링크입니다.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data });
    } else {
      let list = await getPrefillDataFromSheet();
      if (!list || list.length === 0) {
        list = getPrefillConfigs();
      }
      return NextResponse.json({ success: true, data: sortPrefillNewestFirst(list) });
    }
  } catch (error: any) {
    console.error('GET /api/prefill error:', error);
    const list = getPrefillConfigs();
    return NextResponse.json({ success: true, data: sortPrefillNewestFirst(list) });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { inputData, customBatchName } = body;

    const items = Array.isArray(inputData) ? inputData : [inputData];
    if (!items || items.length === 0) {
      return NextResponse.json({ success: false, message: '유효한 데이터가 없습니다.' }, { status: 400 });
    }

    const createdList: any[] = [];
    const now = getKoreanDateTime();
    const batchId = `b_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const batchName = customBatchName || `${now.slice(0, 16)} (${items.length}건 묶음)`;

    for (const item of items) {
      const randomStr = Math.random().toString(36).substring(2, 8);
      const token = `p_${Date.now().toString().slice(-6)}_${randomStr}`;

      const config = {
        token,
        batchId,
        batchName,
        name: item.name || '',
        birth: item.birth || '',
        phone: item.phone || '',
        address: item.address || '',
        addressDetail: item.addressDetail || '',
        product: item.product || '더좋은프리미엄540',
        productCount: Number(item.productCount || 1),
        productName: item.productName || '',
        productName2: item.productName2 || '',
        salesAffiliation: item.salesAffiliation || '',
        salesName: item.salesName || '',
        salesPhone: item.salesPhone || '',
        companyName: item.companyName || '',
        businessNumber: item.businessNumber || '',
        status: '대기',
        createdAt: now
      };

      savePrefillConfig(config as any);
      createdList.push(config);
    }

    savePrefillBatchToSheet(createdList).catch(sheetErr => {
      console.error('Failed to batch save prefill to Sheet:', sheetErr);
    });

    return NextResponse.json({
      success: true,
      data: createdList,
      batchId,
      batchName,
      message: `${createdList.length}건의 사전신청 맞춤 링크가 성공적으로 생성되었습니다.`
    });
  } catch (error: any) {
    console.error('POST /api/prefill error:', error);
    return NextResponse.json({ success: false, message: error.message || '링크 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ success: false, message: '토큰이 필요합니다.' }, { status: 400 });
    }

    deletePrefillConfig(token);
    await deletePrefillDataFromSheet(token).catch(() => {});

    return NextResponse.json({ success: true, message: '사전 신청 링크가 삭제되었습니다.' });
  } catch (error: any) {
    console.error('DELETE /api/prefill error:', error);
    return NextResponse.json({ success: false, message: error.message || '삭제 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
