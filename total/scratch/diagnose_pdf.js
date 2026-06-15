const EFORMSIGN_API_SERVER = 'https://api.eformsign.com';
const EFORMSIGN_KR_SERVER = 'https://kr-api.eformsign.com';
const EFORMSIGN_MEMBER_ID = 'bugoon@joeunlife.com';
const EFORMSIGN_SECRET_KEY = 'test';
const EFORMSIGN_API_KEY = '3eb1cb36-3d57-4683-9b9b-5993feeb7817';
const TEMPLATE_ID = '4e2f0d0f49a24b7caa89fc9c5baf8506';

async function diagnosePdfGeneration() {
    console.log('--- 최종 정밀 진단 시작 ---');
    
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
    const authData = await authRes.json();
    const token = authData.oauth_token.access_token;

    // 모든 필수 필드 데이터 준비 (템플릿 요구사항 충족)
    const fields = [
        { id: '계약자', value: '진단테스트' },
        { id: '주민번호', value: '000101-3000000' },
        { id: '성별', value: '남' },
        { id: '주소', value: '서울시 강남구' },
        { id: '휴대폰', value: '010-0000-0000' },
        { id: '결제방법', value: '카드' },
        { id: '카드/은행명', value: '신한' },
        { id: '이체일', value: '05일' },
        { id: '카드번호/계좌번호', value: '1234-5678-1234-5678' },
        { id: '구좌수', value: '1구좌' },
        { id: '제품명', value: '테스트제품' },
        { id: '서명', value: 'S01' }, // 더미 서명 값
        { id: '영업자소속', value: '테스트' },
        { id: '대상자1_관계', value: '본인' },
        { id: '대상자1_성명', value: '본인' },
        { id: '대상자1_생년월일', value: '000101' },
        { id: '대상자1_성별', value: '남' },
        { id: '대상자1_연락처', value: '010-0000-0000' }
    ];

    const createRes = await fetch(`${EFORMSIGN_KR_SERVER}/v2.0/api_documents?template_id=${TEMPLATE_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
            document: {
                title: "최종 진단 문서",
                fields: fields
            }
        })
    });
    
    const createData = await createRes.json();
    console.log('2. 문서 생성 결과:', createRes.ok ? '✅ 성공' : '❌ 실패: ' + JSON.stringify(createData));
    
    const docId = createData.document?.id || createData.document?.document_id || createData.document_id;
    if (!docId) return;

    for (let i = 1; i <= 3; i++) {
        console.log(`\n[시도 ${i}] 상태 확인...`);
        await new Promise(r => setTimeout(r, 3000)); // 시간을 3초로 늘림
        
        const statusRes = await fetch(`${EFORMSIGN_KR_SERVER}/v2.0/api/documents/${docId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const statusData = await statusRes.json();
        console.log(`- 상태: ${statusData.document?.status_name}`);

        const ep = `/v2.0/api/documents/${docId}/download_file`;
        const dlRes = await fetch(`${EFORMSIGN_KR_SERVER}${ep}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`- ${ep} 상태: ${dlRes.status}`);
        if (dlRes.ok) {
            console.log('✅ 다운로드 성공! (이 경로가 정답입니다)');
            break;
        }
    }
    console.log('\n--- 진단 종료 ---');
}

diagnosePdfGeneration().catch(console.error);
