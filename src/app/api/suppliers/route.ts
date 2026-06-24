import { NextResponse } from 'next/server';
import { getSuppliersFromSheet, saveSupplierToSheet, deleteSupplierFromSheet } from '@/lib/googleSheets';

export async function GET() {
  try {
    const suppliers = await getSuppliersFromSheet();
    return NextResponse.json(suppliers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    if (!data.name) {
      return NextResponse.json({ error: '공급사명은 필수입니다.' }, { status: 400 });
    }
    const success = await saveSupplierToSheet(data);
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: '공급사 저장에 실패했습니다.' }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    if (!name) {
      return NextResponse.json({ error: '삭제할 공급사명이 필요합니다.' }, { status: 400 });
    }
    const success = await deleteSupplierFromSheet(name);
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: '공급사 삭제에 실패했습니다.' }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
