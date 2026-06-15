// Local test script for eformsign document creation
// Run: node scratch/test_eformsign.js

const EFORMSIGN_API_SERVER = 'https://api.eformsign.com';
const EFORMSIGN_KR_SERVER = 'https://kr-api.eformsign.com';
const EFORMSIGN_SECRET_KEY = 'test';
const EFORMSIGN_API_KEY = '3eb1cb36-3d57-4683-9b9b-5993feeb7817';
const EFORMSIGN_MEMBER_ID = 'bugoon@joeunlife.com';
const EFORMSIGN_TEMPLATE_ID = '4e2f0d0f49a24b7caa89fc9c5baf8506';

async function getToken() {
    const timestamp = Date.now().toString();
    const apiKeyBase64 = Buffer.from(EFORMSIGN_API_KEY).toString('base64');

    const response = await fetch(`${EFORMSIGN_API_SERVER}/v2.0/api_auth/access_token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'eformsign_signature': `Bearer ${EFORMSIGN_SECRET_KEY}`,
            'Authorization': `Bearer ${apiKeyBase64}`
        },
        body: JSON.stringify({ execution_time: timestamp, member_id: EFORMSIGN_MEMBER_ID })
    });

    const text = await response.text();
    if (!response.ok) throw new Error(`Auth failed: ${text}`);
    const result = JSON.parse(text);
    console.log('✅ 인증 성공');
    return result.oauth_token.access_token;
}

async function testCreateDocument() {
    const token = await getToken();
    const today = new Date().toISOString().split('T')[0];
    const cleanPhone = '01012345678';

    const fields = [
        { id: '상품명', value: '하이브리드698' },
        { id: '제품명', value: '테스트상품' },
        { id: '구좌수', value: '1구좌' },
        { id: '계약자이름', value: '홍길동' },
        { id: '주민번호', value: '800101-1234567' },
        { id: '성별', value: '남' },
        { id: '주소', value: '서울시 강남구 테헤란로 1' },
        { id: '휴대폰', value: '010-1234-5678' },
        { id: '대상자1_관계', value: '본인' },
        { id: '대상자1_성명', value: '홍길동' },
        { id: '대상자1_생년월일', value: '800101' },
        { id: '대상자1_성별', value: '남' },
        { id: '대상자1_연락처', value: '010-1234-5678' },
        { id: '대상자2_관계', value: '' },
        { id: '대상자2_성명', value: '' },
        { id: '대상자2_생년월일', value: '' },
        { id: '대상자2_성별', value: '' },
        { id: '대상자2_연락처', value: '' },
        { id: '대상자3_관계', value: '' },
        { id: '대상자3_성명', value: '' },
        { id: '대상자3_생년월일', value: '' },
        { id: '대상자3_성별', value: '' },
        { id: '대상자3_연락처', value: '' },
        { id: '결제방법', value: '카드' },
        { id: '카드/은행명', value: '신한' },
        { id: '카드번호/계좌번호', value: '1234-5678-9012-3456' },
        { id: '유효기간', value: '12/26' },
        { id: '이체일', value: '05일' },
        { id: '상품내용고지', value: '1' },
        { id: '개인정보수집', value: '1' },
        { id: '제3자제공', value: '1' },
        { id: '마케팅정보제공', value: '1' },
        { id: '서명', value: '' },
        { id: '계약일', value: today },
        { id: '계약자', value: '홍길동' },
        { id: '영업자소속', value: '테스트소속' },
        { id: '영업자성명', value: '김영업' },
        { id: '영업자연락처', value: '010-9999-8888' }
    ];

    // ---- STEP 1: fields only (no recipients) ----
    console.log('\n[테스트 1] recipients 없이 fields만 전송...');
    const payload1 = {
        document: {
            comment: "가입 신청이 완료되어 서명된 신청서를 보내드립니다.",
            fields: fields
        }
    };

    const res1 = await fetch(`${EFORMSIGN_KR_SERVER}/v2.0/api/documents?template_id=${EFORMSIGN_TEMPLATE_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload1)
    });
    const text1 = await res1.text();
    console.log(`응답 [${res1.status}]:`, text1);

    if (res1.ok) {
        const doc1 = JSON.parse(text1);
        console.log('✅ 테스트 1 성공 - document_id:', doc1.document?.document_id);
        return; // success without recipients
    }

    // ---- STEP 2: with recipients ----
    console.log('\n[테스트 2] recipients 추가 (use_mail:false)...');
    const payload2 = {
        document: {
            comment: "가입 신청이 완료되어 서명된 신청서를 보내드립니다.",
            recipients: [
                {
                    step_type: "07",
                    name: '홍길동',
                    use_sms: true,
                    use_mail: false,
                    send_notification: true,
                    sms: { country_code: "+82", phone_number: cleanPhone }
                }
            ],
            fields: fields
        }
    };

    const res2 = await fetch(`${EFORMSIGN_KR_SERVER}/v2.0/api/documents?template_id=${EFORMSIGN_TEMPLATE_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload2)
    });
    const text2 = await res2.text();
    console.log(`응답 [${res2.status}]:`, text2);

    if (res2.ok) {
        console.log('✅ 테스트 2 성공');
    } else {
        console.log('❌ 테스트 2도 실패');
    }
}

testCreateDocument().catch(console.error);
