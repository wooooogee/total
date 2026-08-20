import crypto from 'crypto';
import { getProductConfigs } from './db';
import { getProductConfigsFromSheet } from './googleSheets';
import { normalizeAccountNumber } from './bankUtils';

const EFORMSIGN_API_SERVER = 'https://api.eformsign.com'; // Token Auth requires the main api.eformsign.com domain
const EFORMSIGN_KR_SERVER = 'https://kr-api.eformsign.com'; // KR Server (Production)
const EFORMSIGN_MEMBER_ID = 'bugoon@joeunlife.com';
const EFORMSIGN_SECRET_KEY = 'test';
const EFORMSIGN_API_KEY = '3eb1cb36-3d57-4683-9b9b-5993feeb7817';

const EFORMSIGN_TEMPLATE_ID_Health580 = 'a70003fc1c3543f19070867e418ce536';

// 인증 토큰 발급 함수 (메모리 캐싱 적용)
let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

export async function getEformsignToken() {
    if (cachedToken && Date.now() < tokenExpiresAt) {
        return cachedToken;
    }

    const execution_time = Date.now().toString();
    const apiKeyBase64 = Buffer.from(EFORMSIGN_API_KEY).toString('base64');

    const response = await fetch(`${EFORMSIGN_API_SERVER}/v2.0/api_auth/access_token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'eformsign_signature': `Bearer ${EFORMSIGN_SECRET_KEY}`,
            'Authorization': `Bearer ${apiKeyBase64}`
        },
        body: JSON.stringify({
            execution_time: execution_time,
            member_id: EFORMSIGN_MEMBER_ID
        })
    });

    const resText = await response.text();
    if (!response.ok) {
        throw new Error(`e-FormSign Auth Failed: ${resText}`);
    }

    const result = JSON.parse(resText);
    cachedToken = result.oauth_token.access_token;
    // 50분 후 만료 (토큰 유효기간 보통 1시간)
    tokenExpiresAt = Date.now() + 50 * 60 * 1000;
    return cachedToken;
}

// 알림톡 재발송/대체 발송 함수
export async function sendViewerNotification(documentId: string, name: string, phone: string) {
    try {
        const token = await getEformsignToken();
        const cleanPhone = phone.replace(/\D/g, '');

        const body = {
            notification: {
                recipients: [
                    {
                        name: name,
                        phone: cleanPhone,
                        auth: {
                            type: "sms"
                        }
                    }
                ]
            }
        };

        const response = await fetch(
            `${EFORMSIGN_KR_SERVER}/v2.0/api/documents/${documentId}/notifications`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            }
        );

        const resText = await response.text();
        console.log(`[eformsign] Backup notification response: status=${response.status}`, resText);

        if (!response.ok) {
            return { success: false, error: `${response.status}: ${resText}` };
        }

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// 이폼사인 문서 생성 및 서명 요청 전송
export async function createEformsignDocument(data: any) {
    try {
        const token = await getEformsignToken();
        const today = new Date().toISOString().split('T')[0];
        const cleanPhone = (data.phone || '').replace(/\D/g, '');

        // 1. DB(구글 시트 우선, 로컬 폴백)에 설정된 템플릿 ID 우선 조회
        let allConfigs = getProductConfigs();
        try {
            const sheetConfigs = await getProductConfigsFromSheet();
            if (sheetConfigs && sheetConfigs.length > 0) {
                allConfigs = sheetConfigs;
            }
        } catch (e) {
            console.error('Failed to get configs from Google Sheets in eformsign:', e);
        }
        
        const config = allConfigs.find(c => c.id === data.product);
        let templateId = config?.eformTemplateId;

        // 2. 설정된 템플릿 ID가 없는 경우 하드코딩된 Fallback 사용
        if (!templateId) {
            const EFORMSIGN_TEMPLATE_ID_Hybrid698 = '4e2f0d0f49a24b7caa89fc9c5baf8506';
            const EFORMSIGN_TEMPLATE_ID_Premium540 = 'b9ecf11e1ed14beba8f6d925af8d26e6';
            const EFORMSIGN_TEMPLATE_ID_Tongsin = '009b8bca4f1c417a8774b22afccf8ccf';
            const EFORMSIGN_TEMPLATE_ID_Rise498 = '413d37beb6e8476498026303b14a6718';
            const EFORMSIGN_TEMPLATE_ID_Cruise = '9c8457e6d8b9433d8e87384d5accdc7b';
            const EFORMSIGN_TEMPLATE_ID_Goodlife = 'd32af2e31ab34cf3932442f278e69ea4';
            const EFORMSIGN_TEMPLATE_ID_GoodlifeGold = '3c5e55411952432ca2f527659a301468';
            
            if (data.product === '더좋은하이브리드698') templateId = EFORMSIGN_TEMPLATE_ID_Hybrid698;
            else if (data.product === '더좋은프리미엄540') templateId = EFORMSIGN_TEMPLATE_ID_Premium540;
            else if (data.product === '더좋은통신결합') templateId = EFORMSIGN_TEMPLATE_ID_Tongsin;
            else if (data.product === '더좋은라이즈498') templateId = EFORMSIGN_TEMPLATE_ID_Rise498;
            else if (data.product === '좋은건강크루즈' || data.product === '더좋은크루즈' || data.product?.includes('크루즈')) templateId = EFORMSIGN_TEMPLATE_ID_Cruise;
            else if (data.product === '굿라이프헬스케어') templateId = EFORMSIGN_TEMPLATE_ID_Goodlife;
            else if (data.product === '굿라이프헬스케어골드') templateId = EFORMSIGN_TEMPLATE_ID_GoodlifeGold;
            else templateId = EFORMSIGN_TEMPLATE_ID_Premium540; // Default fallback
        }

        const isTongsin = data.product === '더좋은통신결합';
        const isRise = data.product === '더좋은라이즈498';
        const isCruise = data.product === '좋은건강크루즈' || data.product === '더좋은크루즈' || data.product?.includes('크루즈');
        const isHealth580 = data.product === '더좋은헬스케어580';
        
        const productNameDisplay = config ? config.name : data.product;

        let fields: any[] = [];

        if (!isTongsin && !isRise && !isCruise && !isHealth580) {
            console.log(`Creating e-FormSign document for ${data.product} using template ${templateId}`);

            fields = [
                { id: '상품명', value: `${productNameDisplay}(${data.productCount}구좌) ${data.productName || ''}`.trim() },
                { id: '제품명', value: data.productName || '' },
                { id: '구좌수', value: `${data.productCount}구좌` },
                { id: '계약자이름', value: data.name },
                { id: '주민번호', value: data.residentId },
                { id: '성별', value: data.gender || '남' },
                { id: '주소', value: `${data.address} ${data.addressDetail || ''}`.trim() },
                { id: '휴대폰', value: data.phone },
                // 헬스케어 대상자 1
                { id: '대상자1_관계', value: data.healthcareTargets?.[0]?.relation || '' },
                { id: '대상자1_성명', value: data.healthcareTargets?.[0]?.name || '' },
                { id: '대상자1_생년월일', value: data.healthcareTargets?.[0]?.birth || '' },
                { id: '대상자1_성별', value: data.healthcareTargets?.[0]?.gender || '' },
                { id: '대상자1_연락처', value: data.healthcareTargets?.[0]?.phone || '' },
                // 헬스케어 대상자 2
                { id: '대상자2_관계', value: data.healthcareTargets?.[1]?.relation || '' },
                { id: '대상자2_성명', value: data.healthcareTargets?.[1]?.name || '' },
                { id: '대상자2_생년월일', value: data.healthcareTargets?.[1]?.birth || '' },
                { id: '대상자2_성별', value: data.healthcareTargets?.[1]?.gender || '' },
                { id: '대상자2_연락처', value: data.healthcareTargets?.[1]?.phone || '' },
                // 헬스케어 대상자 3
                { id: '대상자3_관계', value: data.healthcareTargets?.[2]?.relation || '' },
                { id: '대상자3_성명', value: data.healthcareTargets?.[2]?.name || '' },
                { id: '대상자3_생년월일', value: data.healthcareTargets?.[2]?.birth || '' },
                { id: '대상자3_성별', value: data.healthcareTargets?.[2]?.gender || '' },
                { id: '대상자3_연락처', value: data.healthcareTargets?.[2]?.phone || '' },
                { id: '결제방법', value: data.paymentMethod === 'card' ? '카드' : 'CMS(계좌)' },
                { id: '카드/은행명', value: data.paymentMethod === 'card' ? (data.paymentInfo?.cardCompany || '') : (data.paymentInfo?.bankName || '') },
                { id: '카드번호/계좌번호', value: data.paymentMethod === 'card' ? (data.paymentInfo?.cardNumber || '') : normalizeAccountNumber(data.paymentInfo?.bankName, data.paymentInfo?.accountNumber || '') },
                { id: '유효기간', value: (data.paymentMethod === 'card' && data.paymentInfo?.cardExpiry) ? data.paymentInfo.cardExpiry : '-' },
                { id: '카드할부', value: (data.paymentMethod === 'card' && data.paymentInfo?.installmentPeriod) ? data.paymentInfo.installmentPeriod : '' },
                { id: '이체일', value: `${(data.paymentDate || '05').toString().padStart(2, '0')}일` },
                { id: '상품내용고지', value: data.agreement?.product_notice ? '1' : '' },
                { id: '개인정보수집', value: data.agreement?.privacy ? '1' : '' },
                { id: '제3자제공', value: data.agreement?.third_party ? '1' : '' },
                { id: '마케팅정보제공', value: data.agreement?.marketing ? '1' : '' },
                { id: '서명', value: data.signature || '' },
                { id: '계약일', value: today },
                { id: '계약자', value: data.name },
                { id: '영업자소속', value: data.salesAffiliation || '' },
                { id: '영업자성명', value: data.salesName || '' },
                { id: '영업자연락처', value: data.salesPhone || '' }
            ];
        } else if (isTongsin) {
            console.log(`Creating e-FormSign document for ${data.product} using template ${templateId}`);

            fields = [
                { id: '상품명', value: `더좋은통신결합 - ${data.planName || ''}` },
                { id: '제품명', value: data.productName || '' },
                { id: '요금제', value: data.planName || '' },
                { id: '구좌수', value: '1구좌' },
                { id: '계약자이름', value: data.name },
                { id: '주민번호', value: data.residentId },
                { id: '성별', value: data.gender || '남' },
                { id: '주소', value: `${data.address} ${data.addressDetail || ''}`.trim() },
                { id: '휴대폰', value: data.phone },
                { id: '결제방법', value: data.paymentMethod === 'card' ? '카드' : 'CMS(계좌)' },
                { id: '카드/은행명', value: data.paymentMethod === 'card' ? (data.paymentInfo?.cardCompany || '') : (data.paymentInfo?.bankName || '') },
                { id: '카드번호/계좌번호', value: data.paymentMethod === 'card' ? (data.paymentInfo?.cardNumber || '') : normalizeAccountNumber(data.paymentInfo?.bankName, data.paymentInfo?.accountNumber || '') },
                { id: '유효기간', value: (data.paymentMethod === 'card' && data.paymentInfo?.cardExpiry) ? data.paymentInfo.cardExpiry : '-' },
                { id: '카드할부', value: (data.paymentMethod === 'card' && data.paymentInfo?.installmentPeriod) ? data.paymentInfo.installmentPeriod : '' },
                { id: '이체일', value: `${(data.paymentDate || '05').toString().padStart(2, '0')}일` },
                { id: '상품내용고지', value: data.agreement?.product_notice ? '1' : '' },
                { id: '개인정보수집', value: data.agreement?.privacy ? '1' : '' },
                { id: '제3자제공', value: data.agreement?.third_party ? '1' : '' },
                { id: '마케팅정보제공', value: data.agreement?.marketing ? '1' : '' },
                { id: '서명', value: data.signature || '' },
                { id: '계약일', value: today },
                { id: '계약자', value: data.name },
                { id: '영업자소속', value: data.salesAffiliation || '' },
                { id: '영업자성명', value: data.salesName || '' },
                { id: '영업자연락처', value: data.salesPhone || '' }
            ];
        } else if (isRise) {
            console.log(`Creating e-FormSign document for ${data.product} using template ${templateId}`);

            const countMap: { [key: string]: number } = { 'A': 1, 'B': 2, 'C': 3, 'D': 4 };
            const count = countMap[data.productCount] || Number(data.productCount) || 1;
            const p1 = (33000 * count).toLocaleString();
            const p2 = (15000 * count).toLocaleString();
            const formattedProductName = `[ ${data.productCount} ] 1~60회 월 ${p1}원 (제품) + 61~260회 월 ${p2}원 (라이프서비스)`;

            fields = [
                { id: '가입상품', value: data.productCount },
                { id: '상품명', value: formattedProductName },
                { id: '제품명', value: data.productName },
                { id: '제품명1', value: data.productName },
                { id: '제품명2', value: data.productName2 || '' },
                { id: '구좌수', value: `${data.productCount}` },
                { id: '계약자이름', value: data.name },
                { id: '주민번호', value: data.residentId },
                { id: '성별', value: data.gender || '남' },
                { id: '주소', value: `${data.address} ${data.addressDetail || ''}`.trim() },
                { id: '휴대폰', value: data.phone },
                // 헬스케어 대상자 1
                { id: '대상자1_관계', value: data.healthcareTargets?.[0]?.relation || '' },
                { id: '대상자1_성명', value: data.healthcareTargets?.[0]?.name || '' },
                { id: '대상자1_생년월일', value: data.healthcareTargets?.[0]?.birth || '' },
                { id: '대상자1_성별', value: data.healthcareTargets?.[0]?.gender || '' },
                { id: '대상자1_연락처', value: data.healthcareTargets?.[0]?.phone || '' },
                // 헬스케어 대상자 2
                { id: '대상자2_관계', value: data.healthcareTargets?.[1]?.relation || '' },
                { id: '대상자2_성명', value: data.healthcareTargets?.[1]?.name || '' },
                { id: '대상자2_생년월일', value: data.healthcareTargets?.[1]?.birth || '' },
                { id: '대상자2_성별', value: data.healthcareTargets?.[1]?.gender || '' },
                { id: '대상자2_연락처', value: data.healthcareTargets?.[1]?.phone || '' },
                // 헬스케어 대상자 3
                { id: '대상자3_관계', value: data.healthcareTargets?.[2]?.relation || '' },
                { id: '대상자3_성명', value: data.healthcareTargets?.[2]?.name || '' },
                { id: '대상자3_생년월일', value: data.healthcareTargets?.[2]?.birth || '' },
                { id: '대상자3_성별', value: data.healthcareTargets?.[2]?.gender || '' },
                { id: '대상자3_연락처', value: data.healthcareTargets?.[2]?.phone || '' },
                // 헬스케어 대상자 4
                { id: '대상자4_관계', value: data.healthcareTargets?.[3]?.relation || '' },
                { id: '대상자4_성명', value: data.healthcareTargets?.[3]?.name || '' },
                { id: '대상자4_생년월일', value: data.healthcareTargets?.[3]?.birth || '' },
                { id: '대상자4_성별', value: data.healthcareTargets?.[3]?.gender || '' },
                { id: '대상자4_연락처', value: data.healthcareTargets?.[3]?.phone || '' },
                { id: '결제방법', value: data.paymentMethod === 'card' ? '카드' : 'CMS(계좌)' },
                { id: '카드/은행명', value: data.paymentMethod === 'card' ? (data.paymentInfo?.cardCompany || '') : (data.paymentInfo?.bankName || '') },
                { id: '카드번호/계좌번호', value: data.paymentMethod === 'card' ? (data.paymentInfo?.cardNumber || '') : (data.paymentInfo?.accountNumber || '') },
                { id: '유효기간', value: (data.paymentMethod === 'card' && data.paymentInfo?.cardExpiry) ? data.paymentInfo.cardExpiry : '-' },
                { id: '카드할부', value: (data.paymentMethod === 'card' && data.paymentInfo?.installmentPeriod) ? data.paymentInfo.installmentPeriod : '' },
                { id: '이체일', value: `${(data.paymentDate || '05').toString().padStart(2, '0')}일` },
                { id: '상품내용고지', value: data.agreement?.product_notice ? '1' : '' },
                { id: '개인정보수집', value: data.agreement?.privacy ? '1' : '' },
                { id: '제3자제공', value: data.agreement?.third_party ? '1' : '' },
                { id: '마케팅정보제공', value: data.agreement?.marketing ? '1' : '' },
                { id: '서명', value: data.signature || '' },
                { id: '계약일', value: today },
                { id: '계약자', value: data.name },
                { id: '영업자소속', value: data.salesAffiliation || '' },
                { id: '영업자성명', value: data.salesName || '' },
                { id: '영업자연락처', value: data.salesPhone || '' }
            ];
        } else if (isCruise) {
            console.log(`Creating e-FormSign document for ${data.product} using template ${templateId}`);

            const hasSplit = !!data.paymentMethod1;
            
            const paymentMethod1 = hasSplit 
                ? (data.paymentMethod1 === 'card' ? '카드' : '계좌이체') 
                : '';
            const cardCompany1 = hasSplit && data.paymentMethod1 === 'card' 
                ? (data.paymentInfo1?.cardCompany || '') 
                : '';
            const cardNumber1 = hasSplit && data.paymentMethod1 === 'card' 
                ? (data.paymentInfo1?.cardNumber || '') 
                : '';
            const cardExpiry1 = hasSplit && data.paymentMethod1 === 'card' 
                ? (data.paymentInfo1?.cardExpiry || '') 
                : '';
            const installmentPeriod1 = hasSplit && data.paymentMethod1 === 'card' 
                ? (data.paymentInfo1?.installmentPeriod || '') 
                : '';

            const isCard2 = hasSplit 
                ? data.paymentMethod2 === 'card' 
                : data.paymentMethod === 'card';
            
            const paymentMethod2 = isCard2 ? '카드' : 'CMS(계좌)';
            const paymentInfo2 = hasSplit ? data.paymentInfo2 : data.paymentInfo;
            
            const cardOrBank2 = isCard2 
                ? (paymentInfo2?.cardCompany || '') 
                : (paymentInfo2?.bankName || '');
            const cardOrAccount2 = isCard2 
                ? (paymentInfo2?.cardNumber || '') 
                : normalizeAccountNumber(paymentInfo2?.bankName, paymentInfo2?.accountNumber || '');
            const cardExpiry2 = isCard2 
                ? (paymentInfo2?.cardExpiry || '') 
                : '-';
            const paymentDay = `${(data.paymentDate || '05').toString().padStart(2, '0')}일`;

            fields = [
                { id: '구좌수', value: `${data.productCount}구좌` },
                { id: '상품명', value: data.product === '좋은건강크루즈' ? '좋은건강크루즈330 결합상품' : (data.product === '크루즈' ? '크루즈 선불식 할부거래' : '더좋은크루즈 선불식 할부거래') },
                { id: '계약자이름', value: data.name },
                { id: '주민번호', value: data.residentId },
                { id: '성별', value: data.gender || '남' },
                { id: '주소', value: `${data.address} ${data.addressDetail || ''}`.trim() },
                { id: '휴대폰', value: data.phone },
                
                // 1회차 결제정보
                { id: '결제방법1', value: paymentMethod1 },
                { id: '카드사', value: cardCompany1 },
                { id: '카드번호', value: cardNumber1 },
                { id: '유효기간1', value: cardExpiry1 },
                { id: '카드할부', value: installmentPeriod1 },
                
                // 2~101회차 결제정보
                { id: '결제방법2', value: paymentMethod2 },
                { id: '카드/은행명', value: cardOrBank2 },
                { id: '카드번호/계좌번호', value: cardOrAccount2 },
                { id: '유효기간2', value: cardExpiry2 },
                { id: '결제일', value: paymentDay },
                
                { id: '상품내용고지', value: data.agreement?.product_notice ? '1' : '' },
                { id: '개인정보수집', value: data.agreement?.privacy ? '1' : '' },
                { id: '제3자제공', value: data.agreement?.third_party ? '1' : '' },
                { id: '마케팅정보제공', value: data.agreement?.marketing ? '1' : '' },
                { id: '서명', value: data.signature || '' },
                { id: '계약일', value: today },
                { id: '계약자', value: data.name },
                { id: '영업자소속', value: data.salesAffiliation || '' },
                { id: '영업자성명', value: data.salesName || '' },
                { id: '영업자연락처', value: data.salesPhone || '' },
                // 대상자 정보 2명까지
                { id: '대상자1_관계', value: data.healthcareTargets?.[0]?.relation || '' },
                { id: '대상자1_성명', value: data.healthcareTargets?.[0]?.name || '' },
                { id: '대상자1_생년월일', value: data.healthcareTargets?.[0]?.birth || '' },
                { id: '대상자1_성별', value: data.healthcareTargets?.[0]?.gender || '' },
                { id: '대상자1_연락처', value: data.healthcareTargets?.[0]?.phone || '' },
                { id: '대상자2_관계', value: data.healthcareTargets?.[1]?.relation || '' },
                { id: '대상자2_성명', value: data.healthcareTargets?.[1]?.name || '' },
                { id: '대상자2_생년월일', value: data.healthcareTargets?.[1]?.birth || '' },
                { id: '대상자2_성별', value: data.healthcareTargets?.[1]?.gender || '' },
                { id: '대상자2_연락처', value: data.healthcareTargets?.[1]?.phone || '' }
            ];
        } else if (isHealth580) {
            console.log(`Creating e-FormSign document for ${data.product} using template ${templateId}`);

            const count = Number(data.productCount) || 1;
            const p1 = (25000 * count).toLocaleString();
            const formattedProductName = `[ ${data.productCount} ] 1~192회 월 ${p1}원 (결합상품)`;

            fields = [
                { id: '가입상품', value: data.productCount },
                { id: '상품명', value: formattedProductName },
                { id: '기업명', value: data.companyName || '' },
                { id: '사업자등록번호', value: data.businessNumber || '' },
                { id: '구좌수', value: `${data.productCount}` },
                { id: '계약자이름', value: data.name },
                { id: '주민번호', value: data.residentId },
                { id: '성별', value: data.gender || '남' },
                { id: '주소', value: `${data.address} ${data.addressDetail || ''}`.trim() },
                { id: '휴대폰', value: data.phone },
                // 헬스케어 대상자 1
                { id: '대상자1_관계', value: data.healthcareTargets?.[0]?.relation || '' },
                { id: '대상자1_성명', value: data.healthcareTargets?.[0]?.name || '' },
                { id: '대상자1_생년월일', value: data.healthcareTargets?.[0]?.birth || '' },
                { id: '대상자1_성별', value: data.healthcareTargets?.[0]?.gender || '' },
                { id: '대상자1_연락처', value: data.healthcareTargets?.[0]?.phone || '' },
                // 헬스케어 대상자 2
                { id: '대상자2_관계', value: data.healthcareTargets?.[1]?.relation || '' },
                { id: '대상자2_성명', value: data.healthcareTargets?.[1]?.name || '' },
                { id: '대상자2_생년월일', value: data.healthcareTargets?.[1]?.birth || '' },
                { id: '대상자2_성별', value: data.healthcareTargets?.[1]?.gender || '' },
                { id: '대상자2_연락처', value: data.healthcareTargets?.[1]?.phone || '' },
                // 헬스케어 대상자 3
                { id: '대상자3_관계', value: data.healthcareTargets?.[2]?.relation || '' },
                { id: '대상자3_성명', value: data.healthcareTargets?.[2]?.name || '' },
                { id: '대상자3_생년월일', value: data.healthcareTargets?.[2]?.birth || '' },
                { id: '대상자3_성별', value: data.healthcareTargets?.[2]?.gender || '' },
                { id: '대상자3_연락처', value: data.healthcareTargets?.[2]?.phone || '' },
                { id: '결제방법', value: data.paymentMethod === 'card' ? '카드' : 'CMS(계좌)' },
                { id: '카드/은행명', value: data.paymentMethod === 'card' ? (data.paymentInfo?.cardCompany || '') : (data.paymentInfo?.bankName || '') },
                { id: '카드번호/계좌번호', value: data.paymentMethod === 'card' ? (data.paymentInfo?.cardNumber || '') : normalizeAccountNumber(data.paymentInfo?.bankName, data.paymentInfo?.accountNumber || '') },
                { id: '유효기간', value: (data.paymentMethod === 'card' && data.paymentInfo?.cardExpiry) ? data.paymentInfo.cardExpiry : '-' },
                { id: '카드할부', value: (data.paymentMethod === 'card' && data.paymentInfo?.installmentPeriod) ? data.paymentInfo.installmentPeriod : '' },
                { id: '이체일', value: `${(data.paymentDate || '05').toString().padStart(2, '0')}일` },
                { id: '상품내용고지', value: data.agreement?.product_notice ? '1' : '' },
                { id: '개인정보수집', value: data.agreement?.privacy ? '1' : '' },
                { id: '제3자제공', value: data.agreement?.third_party ? '1' : '' },
                { id: '마케팅정보제공', value: data.agreement?.marketing ? '1' : '' },
                { id: '서명', value: data.signature || '' },
                { id: '계약일', value: today },
                { id: '계약자', value: data.name },
                { id: '영업자소속', value: data.salesAffiliation || '' },
                { id: '영업자성명', value: data.salesName || '' },
                { id: '영업자연락처', value: data.salesPhone || '' }
            ];
        }

        const payload: any = {
            document: {
                template_id: templateId,
                comment: "가입 신청이 완료되어 서명된 신청서를 보내드립니다.",
                recipients: [
                    {
                        step_type: "07", // 템플릿 '열람자 1' (reader 배포 단계)
                        name: data.name,
                        use_sms: true,
                        use_mail: false,
                        send_notification: true,
                        sms: {
                            country_code: "+82",
                            phone_number: cleanPhone
                        },
                        auth: {
                            type: "field",
                            value: data.name // '계약자' 필드 값과 동일해야 함
                        }
                    }
                ],
                fields: fields
            }
        };

        const response = await fetch(`${EFORMSIGN_KR_SERVER}/v2.0/api/documents?template_id=${templateId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`이폼사인 문서 생성 실패: ${errorBody}`);
        }

        const result = await response.json();
        const documentId = result.document?.id || result.document?.document_id || result.document_id;

        if (!documentId) {
            throw new Error('이폼사인 문서 ID 누락');
        }

        console.log('Document Created Successfully:', documentId);

        return {
            success: true,
            document_id: documentId,
            message: '전자 서명이 성공적으로 전송되었으며, 계약자에게 알림톡이 발송되었습니다.'
        };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

// 이폼사인 완료 후 상세 정보 조회
export async function getDocumentDetail(documentId: string) {
    const token = await getEformsignToken();
    const response = await fetch(`${EFORMSIGN_KR_SERVER}/v2.0/api/documents/${documentId}`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    if (!response.ok) {
        const resText = await response.text();
        throw new Error(`Failed to get document detail: ${resText}`);
    }

    return await response.json();
}
