import { type NextRequest } from 'next/server';
import { getDocumentDetail, sendViewerNotification } from '@/lib/eformsign';

const WEBHOOK_SECRET = process.env.EFORMSIGN_WEBHOOK_SECRET || '';

function verifyBearer(request: NextRequest): boolean {
    if (!WEBHOOK_SECRET) return true;
    const auth = request.headers.get('Authorization') ?? '';
    return auth === `Bearer ${WEBHOOK_SECRET}`;
}

function extractField(fields: any[], id: string): string {
    return fields.find((f: any) => f.id === id)?.value ?? '';
}

export async function POST(request: NextRequest) {
    const rawBody = await request.text();

    if (!verifyBearer(request)) {
        console.warn('[Webhook] 인증 실패');
        return new Response('Unauthorized', { status: 401 });
    }

    let payload: any;
    try {
        payload = JSON.parse(rawBody);
    } catch {
        return new Response('Bad Request', { status: 400 });
    }

    const { event_type, document } = payload;
    console.log('[Webhook] 수신:', event_type, document?.status);

    // 서명 완료 이벤트만 처리
    if (event_type !== 'document' || document?.status !== 'doc_complete') {
        return new Response('OK', { status: 200 });
    }

    try {
        // 문서 상세 조회로 계약자 정보 추출
        const detail = await getDocumentDetail(document.id);
        const fields: any[] = detail.document?.fields ?? [];

        const phone = extractField(fields, '휴대폰');
        const name =
            extractField(fields, '계약자이름') ||
            extractField(fields, '계약자');

        if (!phone) {
            console.warn('[Webhook] 계약자 휴대폰 없음, document_id:', document.id);
            return new Response('OK', { status: 200 });
        }

        // eformsign 자체 열람 알림톡 발송
        const result = await sendViewerNotification(document.id, name, phone);

        if (result.success) {
            console.log(`[Webhook] 열람 알림 발송 완료 → ${name} (${phone})`);
        } else {
            console.error('[Webhook] 열람 알림 발송 실패:', result.error);
        }
    } catch (err: any) {
        // eformsign에는 반드시 200 반환 (재전송 방지)
        console.error('[Webhook] 처리 오류:', err.message);
    }

    return new Response('OK', { status: 200 });
}
