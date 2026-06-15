import { NextRequest, NextResponse } from 'next/server';
import { getEformsignToken } from '@/lib/eformsign';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');

    if (!documentId) {
      return new NextResponse('Document ID is required', { status: 400 });
    }

    const token = await getEformsignToken();
    const EFORMSIGN_KR_SERVER = 'https://kr-api.eformsign.com';

    let response: Response | null = null;
    let attempts = 0;
    const maxAttempts = 3;

    // PDF 생성에 시간이 걸릴 수 있으므로 404 발생 시 최대 3번 재시도
    while (attempts < maxAttempts) {
      // [검증 완료] v2.0에서 문서 조회를 위한 공식 엔드포인트는 download_files (복수형)입니다.
      response = await fetch(`${EFORMSIGN_KR_SERVER}/v2.0/api/documents/${documentId}/download_files?file_type=document`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) break;

      const errText = await response.text();
      console.log(`[eformsign] PDF Download Attempt ${attempts + 1}: Status ${response.status} - ${errText}`);

      if (response.status === 404) {
        attempts++;
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
      }
      
      return new NextResponse(`Error downloading PDF: ${response.status} (${errText})`, { status: response.status });
    }

    if (!response || !response.ok) {
      return new NextResponse('Failed to retrieve PDF after retries', { status: 404 });
    }

    // Pass the PDF buffer directly to the client
    const pdfBuffer = await response.arrayBuffer();

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="contract_${documentId}.pdf"`
      }
    });
  } catch (error: any) {
    console.error('Download API Route Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
