-- 1. 사용자 테이블 (관리자, 상주, 일반 사용자 구분)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    role TEXT CHECK (role IN ('admin', 'host', 'user')) DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 부고 정보 테이블
CREATE TABLE obituaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID REFERENCES users(id),
    slug TEXT UNIQUE NOT NULL, -- 고유 URL 경로 (예: betterlife.com/obituary/kim-1234)
    deceased_name TEXT NOT NULL,
    funeral_home TEXT NOT NULL, -- 장례식장 명칭
    funeral_hall TEXT,           -- 호실
    address TEXT NOT NULL,       -- 장례식장 주소
    map_lat DECIMAL(10, 8),      -- 지도 위도
    map_lng DECIMAL(11, 8),      -- 지도 경도
    burial_date TIMESTAMPTZ,     -- 발인일시
    photo_url TEXT,              -- 고인 고해상도 이미지 URL
    status TEXT DEFAULT 'active', -- active, archived
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 결제 및 주문 내역 테이블 (부의금/화환/답례품 통합)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    obituary_id UUID REFERENCES obituaries(id),
    order_id TEXT UNIQUE NOT NULL, -- 포트원 주문번호
    type TEXT CHECK (type IN ('condolence_money', 'flower', 'gift')), -- 부의금, 화환, 답례품
    amount INTEGER NOT NULL,
    fee_amount INTEGER DEFAULT 0,    -- 플랫폼 수수료
    payer_name TEXT NOT NULL,
    payer_phone TEXT,
    message TEXT,                   -- 조문 메시지
    pg_provider TEXT,               -- kakaopay, toss, etc.
    pg_tid TEXT,                    -- PG사 승인번호
    status TEXT DEFAULT 'pending',  -- pending, completed, cancelled, settled
    delivery_status TEXT,           -- 배송 상태 (화환용)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 알림 발송 이력 테이블
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id),
    recipient_type TEXT CHECK (recipient_type IN ('host', 'payer', 'admin')),
    provider TEXT DEFAULT 'solapi',
    template_id TEXT,
    status TEXT DEFAULT 'sent', -- sent, failed
    error_log TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);
