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

interface TemplateSchema {
    inputNames: string[];
    readerAuthType: string;
    readerAuthPwdField: string;
}

interface ProductFlags {
    isGoodlifeAllinoneLumpSum: boolean;
    isTongsin: boolean;
    isRise: boolean;
    isCruise: boolean;
    isHealth580: boolean;
}

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

function getProductFlags(productName?: string): ProductFlags {
    return {
        isGoodlifeAllinoneLumpSum:
            productName === '굿라이프헬스케어 올인원(일시납)' ||
            (Boolean(productName?.includes('올인원')) && Boolean(productName?.includes('일시납'))),
        isTongsin: productName === '더좋은통신결합',
        isRise: productName === '더좋은라이즈498',
        isCruise:
            productName === '좋은건강크루즈' ||
            productName === '더좋은크루즈' ||
            Boolean(productName?.includes('크루즈')),
        isHealth580: productName === '더좋은헬스케어580',
    };
}

function resolveTemplateId(productName: string | undefined, configTemplateId: string | undefined, flags: ProductFlags): string {
    if (configTemplateId && !flags.isGoodlifeAllinoneLumpSum) {
        return configTemplateId;
    }

    const EFORMSIGN_TEMPLATE_ID_Hybrid698 = '4e2f0d0f49a24b7caa89fc9c5baf8506';
    const EFORMSIGN_TEMPLATE_ID_Premium540 = 'b9ecf11e1ed14beba8f6d925af8d26e6';
    const EFORMSIGN_TEMPLATE_ID_Tongsin = '009b8bca4f1c417a8774b22afccf8ccf';
    const EFORMSIGN_TEMPLATE_ID_Rise498 = '413d37beb6e8476498026303b14a6718';
    const EFORMSIGN_TEMPLATE_ID_Cruise = '9c8457e6d8b9433d8e87384d5accdc7b';
    const EFORMSIGN_TEMPLATE_ID_Goodlife = 'd32af2e31ab34cf3932442f278e69ea4';
    const EFORMSIGN_TEMPLATE_ID_GoodlifeGold = '3c5e55411952432ca2f527659a301468';
    const EFORMSIGN_TEMPLATE_ID_GoodlifeAllinoneLumpSum = '713c58a2a1c442e1b5d67b65653aded9';

    if (flags.isGoodlifeAllinoneLumpSum) return EFORMSIGN_TEMPLATE_ID_GoodlifeAllinoneLumpSum;
    if (productName === '더좋은하이브리드698') return EFORMSIGN_TEMPLATE_ID_Hybrid698;
    if (productName === '더좋은프리미엄540') return EFORMSIGN_TEMPLATE_ID_Premium540;
    if (productName === '더좋은통신결합') return EFORMSIGN_TEMPLATE_ID_Tongsin;
    if (productName === '더좋은라이즈498') return EFORMSIGN_TEMPLATE_ID_Rise498;
    if (flags.isCruise) return EFORMSIGN_TEMPLATE_ID_Cruise;
    if (productName === '더좋은헬스케어580') return EFORMSIGN_TEMPLATE_ID_Health580;
    if (productName === '굿라이프헬스케어') return EFORMSIGN_TEMPLATE_ID_Goodlife;
    if (productName === '굿라이프헬스케어 실버') return EFORMSIGN_TEMPLATE_ID_Goodlife;
    if (productName === '굿라이프헬스케어골드' || productName === '굿라이프헬스케어 골드') return EFORMSIGN_TEMPLATE_ID_GoodlifeGold;
    if (productName === '굿라이프헬스케어 올인원') return '1325832605a147b2a3cbe8f5125d3427';
    if (productName === '더좋은프리미엄540플러스(온라인전용)') return '2684c8f5e31a4dc0969506fc67a33118';
    if (productName === '더좋은헬스케어600') return 'd78bc535558c422f95c7a21569935caa';
    if (productName === '더좋은플러스600') return '9ae86a2d70b24a1ea83880ac0a1571ea';
    return EFORMSIGN_TEMPLATE_ID_Premium540; // Default fallback
}

// 템플릿별 실제 입력 필드 목록 및 열람자 인증 설정 실시간 조회
async function fetchTemplateSchema(templateId: string, token: string): Promise<TemplateSchema | null> {
    try {
        const res = await fetch(
            `${EFORMSIGN_KR_SERVER}/v2.0/api/forms/${templateId}?is_include_config=true&is_include_detail=true`,
            {
                method: 'GET',
                headers: { Authorization: `Bearer ${token}` },
                cache: 'no-store',
            }
        );
        if (!res.ok) return null;

        const formJson = await res.json();
        const outputs = formJson.config?.parameters?.outputs || [];
        const inputNames = outputs
            .filter((o: any) => o.type !== 'Label' && o.name)
            .map((o: any) => String(o.name));

        const stepSettings = formJson.config?.step_settings || [];
        const readerStep = stepSettings.find((s: any) => s.type === 'reader' || s.step_type === 'reader');

        return {
            inputNames,
            readerAuthType: String(readerStep?.option?.auth_type || ''),
            readerAuthPwdField: String(readerStep?.option?.auth_pwd_field || ''),
        };
    } catch (err) {
        console.warn('[eformsign] Failed to fetch template schema, using fallback fields:', err);
        return null;
    }
}

// 모든 템플릿(통합 신규 필드명 + 기존 구형 필드명)에 대응하는 통합 값 맵 생성
function buildUnifiedFieldMap(
    data: any,
    productNameDisplay: string,
    flags: ProductFlags,
    today: string
): Record<string, string> {
    const countNumMap: Record<string, number> = { A: 1, B: 2, C: 3, D: 4 };
    const numericCount = countNumMap[data.productCount] || Number(data.productCount) || 1;

    let formattedProductName = `${productNameDisplay}(${data.productCount}구좌) ${data.productName || ''}`.trim();
    if (flags.isTongsin) {
        formattedProductName = `더좋은통신결합 - ${data.planName || ''}`;
    } else if (flags.isRise) {
        const p1 = (33000 * numericCount).toLocaleString();
        const p2 = (15000 * numericCount).toLocaleString();
        formattedProductName = `[ ${data.productCount} ] 1~60회 월 ${p1}원 (제품) + 61~260회 월 ${p2}원 (라이프서비스)`;
    } else if (flags.isCruise) {
        formattedProductName =
            data.product === '좋은건강크루즈'
                ? '좋은건강크루즈330 결합상품'
                : data.product === '크루즈'
                    ? '크루즈 선불식 할부거래'
                    : '더좋은크루즈 선불식 할부거래';
    } else if (flags.isHealth580) {
        const p1 = (25000 * numericCount).toLocaleString();
        formattedProductName = `[ ${data.productCount} ] 1~192회 월 ${p1}원 (결합상품)`;
    }

    const productCountValue =
        flags.isTongsin
            ? '1구좌'
            : flags.isRise || flags.isHealth580
                ? `${data.productCount}`
                : `${data.productCount}구좌`;

    // 결제 정보 계산 (분할결제 상품 vs 단일결제 상품)
    const hasSplit = Boolean(data.paymentMethod1);
    const isSplitProduct = flags.isGoodlifeAllinoneLumpSum || flags.isCruise;

    let paymentMethod1 = '';
    let cardCompany1 = '';
    let cardNumber1 = '';
    let cardExpiry1 = '';
    let installmentPeriod1 = '';

    if (flags.isGoodlifeAllinoneLumpSum) {
        paymentMethod1 = hasSplit
            ? data.paymentMethod1 === 'card' ? '카드' : '계좌이체'
            : data.paymentMethod === 'card' ? '카드' : '계좌이체';
        cardCompany1 = hasSplit && data.paymentMethod1 === 'card'
            ? data.paymentInfo1?.cardCompany || ''
            : data.paymentMethod1 === 'bank'
                ? data.paymentInfo1?.bankName || '국민은행'
                : data.paymentInfo?.cardCompany || '';
        cardNumber1 = hasSplit && data.paymentMethod1 === 'card'
            ? data.paymentInfo1?.cardNumber || ''
            : data.paymentMethod1 === 'bank'
                ? data.paymentInfo1?.accountNumber || '476101-01-413681'
                : data.paymentInfo?.cardNumber || '';
        cardExpiry1 = hasSplit && data.paymentMethod1 === 'card'
            ? data.paymentInfo1?.cardExpiry || ''
            : data.paymentInfo?.cardExpiry || '-';
        installmentPeriod1 = hasSplit && data.paymentMethod1 === 'card'
            ? data.paymentInfo1?.installmentPeriod || '일시불'
            : data.paymentInfo?.installmentPeriod || '-';
    } else if (flags.isCruise && hasSplit) {
        paymentMethod1 = data.paymentMethod1 === 'card' ? '카드' : '계좌이체';
        cardCompany1 = data.paymentMethod1 === 'card' ? data.paymentInfo1?.cardCompany || '' : '';
        cardNumber1 = data.paymentMethod1 === 'card' ? data.paymentInfo1?.cardNumber || '' : '';
        cardExpiry1 = data.paymentMethod1 === 'card' ? data.paymentInfo1?.cardExpiry || '' : '';
        installmentPeriod1 = data.paymentMethod1 === 'card' ? data.paymentInfo1?.installmentPeriod || '' : '';
    }

    const isCardMain = isSplitProduct
        ? (hasSplit ? data.paymentMethod2 === 'card' : data.paymentMethod === 'card')
        : data.paymentMethod === 'card';
    const paymentInfoMain = isSplitProduct ? (hasSplit ? data.paymentInfo2 : data.paymentInfo) : data.paymentInfo;

    const paymentMethodMain = isCardMain ? '카드' : 'CMS(계좌)';
    const cardOrBankMain = isCardMain
        ? paymentInfoMain?.cardCompany || ''
        : paymentInfoMain?.bankName || '';
    const cardOrAccountMain = isCardMain
        ? paymentInfoMain?.cardNumber || ''
        : normalizeAccountNumber(paymentInfoMain?.bankName, paymentInfoMain?.accountNumber || '');
    const cardExpiryMain = isCardMain
        ? paymentInfoMain?.cardExpiry || (isSplitProduct ? '' : '-')
        : '-';
    const singleCardInstallment =
        data.paymentMethod === 'card' && data.paymentInfo?.installmentPeriod
            ? data.paymentInfo.installmentPeriod
            : '';
    const paymentDay = `${(data.paymentDate || '05').toString().padStart(2, '0')}일`;

    const contractorAddress = `${data.address || ''} ${data.addressDetail || ''}`.trim();
    const recipientAddress = `${data.recipientAddress || ''} ${data.recipientAddressDetail || ''}`.trim();
    const isThirdParty = Boolean(data.isThirdPartyPayer);

    const fieldMap: Record<string, string> = {
        // 계약자 정보 (통합형 + 구형)
        '계약자 성명': data.name || '',
        '계약자이름': data.name || '',
        '계약자': data.name || '',
        '계약자 생년월일': data.residentId || '',
        '주민번호': data.residentId || '',
        '계약자 성별': data.gender || '남',
        '성별': data.gender || '남',
        '계약자 주소': contractorAddress,
        '주소': contractorAddress,
        '계약자 연락처': data.phone || '',
        '휴대폰': data.phone || '',
        '계약자 서명': data.signature || '',
        '서명': data.signature || '',
        '기업명': data.companyName || '',
        '사업자등록번호': data.businessNumber || '',

        // 배송지 및 수령인 정보
        '수령인 성명': data.recipientName || '',
        '수령인 관계': data.recipientRelation || '',
        '수령인 주소': recipientAddress,
        '수령인 연락처': data.recipientPhone || '',

        // 상품 및 구좌 정보
        '가입상품': `${data.productCount || ''}`,
        '상품명': formattedProductName,
        '제품명': data.productName || '',
        '제품명1': data.productName || '',
        '제품명2': data.productName2 || '',
        '요금제': data.planName || '',
        '구좌수': productCountValue,

        // 가전 일시납 / 1회차 결제 정보
        '일시납 결제방법': paymentMethod1,
        '일시납 카드사': cardCompany1,
        '일시납 카드번호': cardNumber1,
        '일시납 유효기간': cardExpiry1,
        '일시납 할부개월': installmentPeriod1,
        '결제방법1': paymentMethod1,
        '카드사': cardCompany1,
        '카드번호': cardNumber1,
        '유효기간1': cardExpiry1,
        '카드할부': flags.isCruise ? installmentPeriod1 : singleCardInstallment,

        // 제3자 결제자 정보
        '결제자 성명': isThirdParty ? data.payerName || '' : '',
        '결제자 생년월일': isThirdParty ? data.payerBirth || '' : '',
        '결제자 연락처': isThirdParty ? data.payerPhone || '' : '',
        '결제자 관계': isThirdParty ? data.payerRelation || '' : '',
        '결제자 서명': isThirdParty ? data.payerSignature || '' : '',

        // 라이프서비스 / 정기 결제 정보
        '결제방법': paymentMethodMain,
        '결제방법2': paymentMethodMain,
        '카드/은행명': cardOrBankMain,
        '카드번호/계좌번호': cardOrAccountMain,
        '유효기간': cardExpiryMain,
        '유효기간2': cardExpiryMain,
        '카드유효기간': cardExpiryMain,
        '이체일': paymentDay,
        '결제일': paymentDay,

        // 약관 동의 및 기타 체크/텍스트 필드
        '상품내용고지': data.agreement?.product_notice ? '1' : '',
        '개인정보수집': data.agreement?.privacy ? '1' : '',
        '제3자제공': data.agreement?.third_party ? '1' : '',
        '마케팅정보동의': data.agreement?.marketing ? '1' : '',
        '마케팅정보제공': data.agreement?.marketing ? '1' : '',
        '체크 4': '',
        '텍스트 1': '',

        // 계약일 및 영업자 정보 (통합형 + 구형)
        '계약일자': today,
        '계약일': today,
        '계약일(오늘날짜)': today,
        '영업자 소속': data.salesAffiliation || '',
        '영업자소속': data.salesAffiliation || '',
        '영업자 성명': data.salesName || '',
        '영업자성명': data.salesName || '',
        '영업자': data.salesName || '',
        '영업자 연락처': data.salesPhone || '',
        '영업자연락처': data.salesPhone || '',
    };

    // 헬스케어 대상자 1~4 (연락처 / 전화번호 동시 지원)
    for (let i = 1; i <= 4; i++) {
        const target = data.healthcareTargets?.[i - 1];
        fieldMap[`대상자${i}_관계`] = target?.relation || '';
        fieldMap[`대상자${i}_성명`] = target?.name || '';
        fieldMap[`대상자${i}_생년월일`] = target?.birth || '';
        fieldMap[`대상자${i}_성별`] = target?.gender || '';
        fieldMap[`대상자${i}_연락처`] = target?.phone || '';
        fieldMap[`대상자${i}_전화번호`] = target?.phone || '';
    }

    return fieldMap;
}

// 템플릿 스키마 조회 실패 시 사용할 폴백 필드 ID 목록
function getFallbackFieldIds(flags: ProductFlags): string[] {
    if (flags.isGoodlifeAllinoneLumpSum) {
        return [
            '계약자 성별', '계약자 성명', '계약자 생년월일', '계약자 주소', '계약자 연락처', '계약자 서명',
            '수령인 성명', '수령인 관계', '수령인 주소', '수령인 연락처',
            '구좌수', '제품명',
            '일시납 결제방법', '일시납 카드사', '일시납 카드번호', '일시납 유효기간', '일시납 할부개월',
            '결제자 성명', '결제자 생년월일', '결제자 연락처', '결제자 관계', '결제자 서명',
            '결제방법', '카드/은행명', '카드번호/계좌번호', '유효기간', '이체일',
            '대상자1_관계', '대상자1_성명', '대상자1_생년월일', '대상자1_성별', '대상자1_전화번호',
            '대상자2_관계', '대상자2_성명', '대상자2_생년월일', '대상자2_성별', '대상자2_전화번호',
            '대상자3_관계', '대상자3_성명', '대상자3_생년월일', '대상자3_성별', '대상자3_전화번호',
            '상품내용고지', '개인정보수집', '제3자제공', '마케팅정보동의',
            '계약일자', '영업자 소속', '영업자 성명', '영업자 연락처',
        ];
    }
    if (flags.isTongsin) {
        return [
            '상품명', '제품명', '요금제', '구좌수',
            '계약자이름', '주민번호', '성별', '주소', '휴대폰',
            '결제방법', '카드/은행명', '카드번호/계좌번호', '카드유효기간', '이체일',
            '상품내용고지', '개인정보수집', '제3자제공', '마케팅정보제공',
            '서명', '계약일(오늘날짜)', '영업자소속', '영업자성명', '영업자연락처',
        ];
    }
    if (flags.isRise) {
        return [
            '가입상품', '구좌수', '제품명1', '제품명2',
            '계약자', '주민번호', '성별', '주소', '휴대폰',
            '결제방법', '카드/은행명', '카드번호/계좌번호', '유효기간', '이체일',
            '상품내용고지', '개인정보수집', '제3자제공', '마케팅정보제공', '체크 4',
            '서명', '계약일', '영업자소속', '영업자성명', '영업자연락처',
            '대상자1_관계', '대상자1_성명', '대상자1_생년월일', '대상자1_성별', '대상자1_연락처',
            '대상자2_관계', '대상자2_성명', '대상자2_생년월일', '대상자2_성별', '대상자2_연락처',
            '대상자3_관계', '대상자3_성명', '대상자3_생년월일', '대상자3_성별', '대상자3_연락처',
            '대상자4_관계', '대상자4_성명', '대상자4_생년월일', '대상자4_성별', '대상자4_연락처',
        ];
    }
    if (flags.isCruise) {
        return [
            '구좌수', '계약자이름', '주민번호', '성별', '주소', '휴대폰',
            '결제방법1', '카드사', '카드번호', '유효기간1', '카드할부',
            '결제방법2', '카드/은행명', '카드번호/계좌번호', '유효기간2', '결제일',
            '상품내용고지', '개인정보수집', '제3자제공', '마케팅정보제공',
            '서명', '계약일', '계약자', '영업자소속', '영업자성명', '영업자연락처',
            '대상자1_관계', '대상자1_성명', '대상자1_생년월일', '대상자1_성별', '대상자1_연락처',
            '대상자2_관계', '대상자2_성명', '대상자2_생년월일', '대상자2_성별', '대상자2_연락처',
        ];
    }
    if (flags.isHealth580) {
        return [
            '계약자 성명', '계약자 생년월일', '계약자 성별', '기업명', '사업자등록번호', '계약자 주소', '계약자 연락처',
            '결제방법', '카드/은행명', '유효기간', '카드번호/계좌번호', '이체일', '구좌수',
            '상품내용고지', '개인정보수집', '제3자제공', '마케팅정보제공',
            '계약자 서명', '계약일', '영업자 소속', '영업자 성명', '영업자 연락처',
            '대상자1_관계', '대상자1_성명', '대상자1_생년월일', '대상자1_성별', '대상자1_연락처',
            '대상자2_관계', '대상자2_성명', '대상자2_생년월일', '대상자2_성별', '대상자2_연락처',
            '대상자3_관계', '대상자3_성명', '대상자3_생년월일', '대상자3_성별', '대상자3_연락처',
            '대상자4_관계', '대상자4_성명', '대상자4_생년월일', '대상자4_성별', '대상자4_연락처',
        ];
    }
    return [
        '계약자 성명', '계약자 생년월일', '계약자 성별', '계약자 주소', '계약자 연락처',
        '결제방법', '카드/은행명', '이체일', '카드번호/계좌번호', '유효기간', '구좌수', '제품명',
        '상품내용고지', '개인정보수집', '제3자제공', '마케팅정보제공', '체크 4',
        '계약자 서명', '계약일', '영업자 소속', '영업자 성명', '영업자 연락처',
        '대상자1_관계', '대상자1_성명', '대상자1_생년월일', '대상자1_성별', '대상자1_연락처',
        '대상자2_관계', '대상자2_성명', '대상자2_생년월일', '대상자2_성별', '대상자2_연락처',
        '대상자3_관계', '대상자3_성명', '대상자3_생년월일', '대상자3_성별', '대상자3_연락처',
    ];
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
        const flags = getProductFlags(data.product);
        const templateId = resolveTemplateId(data.product, config?.eformTemplateId, flags);
        const productNameDisplay = config ? config.name : data.product;

        console.log(`Creating e-FormSign document for ${data.product} using template ${templateId}`);

        const unifiedFieldMap = buildUnifiedFieldMap(data, productNameDisplay, flags, today);
        const templateSchema = token ? await fetchTemplateSchema(templateId, token) : null;

        const targetFieldIds =
            templateSchema && templateSchema.inputNames.length > 0
                ? templateSchema.inputNames
                : getFallbackFieldIds(flags);

        const fields = targetFieldIds.map(id => ({
            id,
            value: Object.prototype.hasOwnProperty.call(unifiedFieldMap, id) ? unifiedFieldMap[id] : '',
        }));

        // 템플릿 열람자 인증 방식에 맞춰 auth 설정 (auth_type이 'none'이면 생략)
        const includeFieldAuth = templateSchema
            ? templateSchema.readerAuthType === 'field'
            : !flags.isGoodlifeAllinoneLumpSum;
        const authValue =
            (templateSchema?.readerAuthPwdField && unifiedFieldMap[templateSchema.readerAuthPwdField]) ||
            data.name;

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
                        ...(includeFieldAuth ? {
                            auth: {
                                type: "field",
                                value: authValue
                            }
                        } : {})
                    }
                ],
                fields
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
