const EFORMSIGN_API_SERVER = 'https://api.eformsign.com';
const EFORMSIGN_KR_SERVER = 'https://kr-api.eformsign.com';
const EFORMSIGN_MEMBER_ID = 'bugoon@joeunlife.com';
const EFORMSIGN_SECRET_KEY = 'test';
const EFORMSIGN_API_KEY = '3eb1cb36-3d57-4683-9b9b-5993feeb7817';

// 사용자 화면에 찍혔던 그 ID
const TARGET_DOC_ID = '01cfc9a64e7d44e995a179212051a7d3';

async function traceSpecificDocument() {
    console.log(`--- [${TARGET_DOC_ID}] 문서 추적 시작 ---`);
    
    const apiKeyBase64 = Buffer.from(EFORMSIGN_API_KEY).toString('base64');
    const authRes = await fetch(`${EFORMSIGN_API_SERVER}/v2.0/api_auth/access_token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'eformsign_signature': `Bearer ${EFORMSIGN_SECRET_KEY}`,
            'Authorization': `Bearer ${apiKeyBase64}`
        },
        body: JSON.stringify({ execution_time: Date.now().toString(), member_id: EFORMSIGN_MEMBER_ID })
    });
    const token = (await authRes.json()).oauth_token.access_token;

    // 1. 문서 상세 정보 조회
    const infoRes = await fetch(`${EFORMSIGN_KR_SERVER}/v2.0/api/documents/${TARGET_DOC_ID}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const info = await infoRes.json();
    console.log('1. 문서 상세 상태:', JSON.stringify(info.document, null, 2));

    // 2. 여러 경로로 다운로드 시도
    const testPaths = [
        `/v2.0/api/documents/${TARGET_DOC_ID}/download_file`,
        `/v2.0/api/documents/${TARGET_DOC_ID}/download_files?file_type=document`,
        `/v2.0/api/documents/${TARGET_DOC_ID}/files?file_type=document`,
        `/v2.0/api/documents/${TARGET_DOC_ID}/preview` // 혹시 프리뷰가 따로 있는지
    ];

    for (const path of testPaths) {
        const res = await fetch(`${EFORMSIGN_KR_SERVER}${path}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`- 경로 [${path}] 응답: ${res.status}`);
        if (!res.ok) {
            console.log(`  ㄴ 에러 내용: ${await res.text()}`);
        } else {
            console.log(`  ✅ 이 경로가 작동합니다!`);
        }
    }
    console.log('--- 추적 종료 ---');
}

traceSpecificDocument().catch(console.error);
