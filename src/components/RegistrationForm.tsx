'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Phone, CheckCircle2, ArrowRight, ArrowLeft, Loader2, CreditCard, Landmark, ShieldCheck, MapPin, Search, Eraser, PenLine, Package, Calculator, Briefcase, Calendar, Tag, FileText, Sun, Moon, Copy, Check, Lock, AlertCircle } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import TermsAgreement from './TermsAgreement';
import { registerAction } from '@/app/actions';
import Script from 'next/script';
import { ProductConfig } from '@/lib/db';

// 약관 정의
const DEFAULT_TERMS = [
  {
    id: 'product_notice',
    title: '1. 상품내용 고지에 대한 동의 (필수)',
    content: `본 신청과 관련하여 계약자 본인은 상기 금융거래정보(카드 정보, 은행, 계좌번호 등)를 만기·해지 신청 때까지 청구 기관에 제공하고, 자동이체를 신청하며, 월 부금이 동일한 정보로 자동이체됨에 동의합니다.
본 상품은 192회 약정 의무 납입 상품으로, 청약 철회 기간(14일) 이후 해지 시 잔여금을 완납하여야 하며 이에 동의합니다.
본 상품이 헬스케어서비스는 사은품이 아님을 안내해드립니다.
본 결합 상품의 총 납입 금액은 480만원(1구좌 기준 월 25,000원, 총 192회 납입), 192회 납입 완료 및 2년 예치 후 해약하실 경우 납입금 전액(100%)을 환급해 드립니다. 단, 고객님께서 만기 회차 이전에 해지할 경우, 해지 시점을 기준으로 납입된 금액에 대해 공정거래위원회 해약 환급금 산정 기준 고시에 따라 환급합니다.`,
    required: true
  },
  {
    id: 'privacy',
    title: '2. 개인(신용)정보의 수집·이용에 관한 사항(필수)',
    content: `이용목적
· 라이프서비스에 관한 계약이행 및 서비스 제공
· 라이프서비스 가입 고객 관리 및 라이프서비스계약의 체결·유지·관리, 상담(민원처리 등)
· 요금청구를 위한 본인 확인, 요금결제(카드결제, CMS출금 등) 및 추심 업무를 위한 신용정보조회
· 공공기관의 정책자료로 제공

수집·이용할 개인(신용)정보의 항목
성명, 주소, 주민번호 앞 7자리, 전화번호, 계좌번호, 카드정보, 휴대폰번호

이용기간
본 계약체결일로부터 계약종료 후 3년까지
(단, 전자상거래 등에서의 소비자보호에 관한 법률 등 관련 법령의 규정에 의하여 보존할 필요가 있는 경우에는 그에 따름)`,
    required: true
  },
  {
    id: 'third_party',
    title: '3. 제3자 제공 동의에 관한 사항(필수)',
    content: `본 계약과 관련하여 귀사가 본인으로부터 취득한 개인정보는 「개인정보보호법」 제17조와 제22조에 따라 제3자에게 제공할 경우에는 본인의 사전 동의를 얻어야 합니다. 이에 본인은 귀사가 본인의 개인정보를 아래와 같이 제3자에게 제공하는 것에 동의합니다.

· 개인정보를 제공받는 자: 신한은행, 금융결제원, KICC, 에넥스텔레콤, KB헬스케어, (주)여의도자산관리본부, 신안소프트, 라이즈주식회사, 위더스앤씨
· 개인정보를 제공받는 자의 개인정보 이용 목적: 할부거래에 관한 법률 제27조에 따른 공제 계약 및 소비자피해보상보험계약업무, 출금이체 서비스 제공 및 출금 동의 확인, 할부거래, 건강안심케어서비스 이용, 상품/서비스 홍보 및 판매, SMS 서비스 제공, 개인정보조회/신용정보조회 등
· 제공하는 개인정보의 항목: 
  - 개인식별정보: 성명, 생년월일, 주소(자택/직장), 연락처(휴대폰/자택)
  - 계약정보: 회원번호, 납입내역, 상담내역, 행사/해약사항
  - 결제정보: 예금주, 생년월일, 연락처, 계약자와의 관계, 계좌·카드 정보
· 개인정보를 제공받는 자의 개인정보 보유 및 이용기간: 라이프서비스계약 종료 시 삭제`,
    required: true
  },
  {
    id: 'marketing',
    title: '4. 마케팅 정보 제공 동의(선택)',
    content: `이용목적
· 신규 상품 및 서비스 안내
· 이벤트, 프로모션, 혜택 정보 제공
· 고객 맞춤 정보 제공
수집·이용할 개인(신용)정보의 항목
성명, 주소, 휴대폰번호
이용기간
동의일로부터 동의 철회 시까지`,
    required: false
  },
];

const TONGSIN_TERMS = [
  {
    id: 'product_notice',
    title: '1. 상품내용 고지에 대한 동의 (필수)',
    content: `· 본 신청과 관련하여 계약자 본인은 카드정보, 은행명, 계좌번호 등 금융거래정보를 만기 또는 해지 신청 시까지 청구기관에 제공하는 것에 동의하며, 상품 이용 기간 동안 약정된 금액이 자동이체 방식으로 출금되는 것에 동의합니다.
· 본 상품은 더좋은라이프 상조 서비스와 에넥스텔레콤 통신상품이 결합된 상품으로, 상조 계약과 통신 계약은 각각 별도의 계약으로 운영되며 상호 독립적으로 적용됩니다.
· 통신요금을 36개월간 정상 납입하여야 하며, 36개월 정상 유지 시 상조포인트가 지급됩니다. 37회차부터 가입한 상조 상품 금액이 출금되는 구조임을 확인합니다.
· 통신계약에 따라 제공되는 제품 및 건강안심케어 서비스는 사은품이 아니며, 통신계약의 유지 및 이행에 따라 제공되는 서비스임을 확인합니다.
· 본 통신결합 상품의 총 납입 금액은 360만원형과 540만원형으로 구성되며, 납입 방식은 다음과 같습니다.
●360형: 1~36회 월 0원 (통신사 적립포인트 33,333원 충당) + 37~186회 월 16,000원 (실 상조 납입금 총 2,400,000원)
●540형: 1~36회 월 0원 (통신사 적립포인트 50,000원 충당) + 37~261회 월 16,000원 (실 상조 납입금 총 3,600,000원)
· 계약자가 만기 회차 도래 시점까지 상품 금액을 완납하고 상조 서비스를 이용하지 아니한 경우에는 실 상조 납입금 전액과 약정된 만기 축하금이 지급됩니다.
· 계약자가 만기 이전에 해지할 경우에는 해지 시점을 기준으로 납입된 실 상조 납입금액에 대하여 「공정거래위원회 해약 환급금 산정 기준 고시」에 따라 환급됩니다.
· 360플러스 상품의 경우 만기 도래 후 환급금은 5년간 예치되며, 540플러스 상품의 경우 만기 도래 다음 달에 만기 환급금이 지급됩니다. 계약자는 상기 상품 구조, 납입 방식, 해지 환급 기준 및 만기 조건에 대하여 충분한 설명을 듣고 이해하였으며 이에 동의합니다.`,
    required: true
  },
  ...DEFAULT_TERMS.slice(1)
];

const HYBRID_698_TERMS = [
  {
    id: 'product_notice',
    title: '1. 상품내용 고지에 대한 동의 (필수)',
    content: `본 신청과 관련하여 계약자 본인은 상기 금융거래정보(카드 정보, 은행, 계좌번호 등)를 만기·해지 신청 때까지 청구 기관에 제공하고, 자동이체를 신청합니다.
본 상품은 60회 약정 의무 납입 상품으로, 청약 철회 기간(14일) 이후 해지 시 잔여금을 완납하여야 하며 이에 동의합니다.
본 상품은 더좋은라이프 상조 서비스와 에넥스텔레콤 결합 상품으로, 상조 서비스와 렌탈 계약은 각각 별개로 진행됩니다. 60회까지의 렌탈 계약으로 제공되는 제품 및 건강 안심 케어 서비스는 사은품이 아님을 알려드립니다.
본 결합 상품의 총 납입 금액은 498만원(실 상조 납입금 300만 원, 제품 1구좌 198만 원 기준), 240회 만기 상품입니다. 고객님께서 만기 회차 도래 시점까지 상품 금액을 완납하고 익월까지 상조 서비스를 이용하지 않고 해약하실 경우, 실 상조 납입금 전액과 만기 축하금을 지급해 드립니다. 단, 고객님께서 만기 회차 이전에 해지할 경우, 해지 시점을 기준으로 납입된 실 상조 납입금에 대해 공정거래위원회 해약 환급금 산정 기준 고시에 따라 환급합니다.`,
    required: true
  },
  ...DEFAULT_TERMS.slice(1)
];

const PREMIUM_540_TERMS = [
  {
    id: 'product_notice',
    title: '1. 상품내용 고지에 대한 동의 (필수)',
    content: `본 신청과 관련하여 계약자 본인은 상기 금융거래정보(카드 정보, 은행, 계좌번호 등)를 만기·해지 신청 때까지 청구 기관에 제공하고, 자동이체를 신청합니다.
본 상품은 60회 약정 의무 납입 상품으로, 청약 철회 기간(14일) 이후 해지 시 잔여금을 완납하여야 하며 이에 동의합니다.
본 상품은 더좋은라이프 상조 서비스와 에넥스텔레콤 결합 상품으로, 상조 서비스와 렌탈 계약은 각각 별개로 진행됩니다. 60회까지의 렌탈 계약으로 제공되는 제품 및 건강 안심 케어 서비스는 사은품이 아님을 알려드립니다.
본 결합 상품의 총 납입 금액은 540만원(실 상조 납입금 312만 원, 제품 1구좌 228만 원 기준), 210회 만기 상품입니다. 고객님께서 만기 회차 도래 시점까지 상품 금액을 완납하고 익월까지 상조 서비스를 이용하지 않고 해약하실 경우, 실 상조 납입금 전액과 만기 축하금을 지급해 드립니다. 단, 고객님께서 만기 회차 이전에 해지할 경우, 해지 시점을 기준으로 납입된 실 상조 납입금에 대해 공정거래위원회 해약 환급금 산정 기준 고시에 따라 환급합니다.`,
    required: true
  },
  ...DEFAULT_TERMS.slice(1)
];

const RISE_498_TERMS = [
  {
    id: 'product_notice',
    title: '1. 상품내용 고지에 대한 동의 (필수)',
    content: `본 신청과 관련하여 계약자 본인은 상기 금융거래정보(카드 정보, 은행, 계좌번호 등)를 만기·해지 신청 때까지 청구 기관에 제공하고, 자동이체를 신청하며, 61회차부터는 라이프서비스 부금이 동일한 정보로 자동이체됨에 동의합니다.
본 상품은 60회 약정 의무 납입 상품으로, 청약 철회 기간(14일) 이후 해지 시 잔여금을 완납하여야 하며 이에 동의합니다.
본 상품은 더좋은라이프 라이프서비스와 에넥스텔레콤 결합 상품으로, 라이프서비스와 렌탈 계약은 각각 별개로 진행됩니다. 60회까지의 렌탈 계약으로 제공되는 제품 및 건강 안심 케어 서비스는 사은품이 아님을 알려드립니다.
본 결합 상품의 총 납입 금액은 498만원(실 라이프납입금 300만 원, 제품 1구좌 198만 원 기준), 260회 만기 상품입니다. 고객님께서 만기 회차 도래 시점까지 상품 금액을 완납하고 익월까지 라이프서비스를 이용하지 않고 해약하실 경우, 실 라이프납입금 전액과 만기 축하금을 지급해 드립니다. 단, 고객님께서 만기 회차 이전에 해지할 경우, 해지 시점을 기준으로 납입된 실 라이프납입금에 대해 공정거래위원회 해약 환급금 산정 기준 고시에 따라 환급합니다.`,
    required: true
  },
  {
    id: 'privacy',
    title: '2. 개인(신용)정보의 수집·이용에 관한 사항(필수)',
    content: `이용목적
· 라이프서비스에 관한 계약이행 및 서비스 제공
· 라이프서비스 가입 고객 관리 및 라이프서비스계약의 체결·유지·관리, 상담(민원처리 등)
· 요금청구를 위한 본인 확인, 요금결제(카드결제, CMS출금 등) 및 추심 업무를 위한 신용정보조회
· 공공기관의 정책자료로 제공

수집·이용할 개인(신용)정보의 항목
성명, 주소, 주민번호 앞 7자리, 전화번호, 계좌번호, 카드정보, 휴대폰번호

이용기간
본 계약체결일로부터 계약종료 후 3년까지
(단, 전자상거래 등에서의 소비자보호에 관한 법률 등 관련 법령의 규정에 의하여 보존할 필요가 있는 경우에는 그에 따름)`,
    required: true
  },
  {
    id: 'third_party',
    title: '3. 제3자 제공 동의에 관한 사항(필수)',
    content: `본 계약과 관련하여 귀사가 본인으로부터 취득한 개인정보는 「개인정보보호법」 제17조와 제22조에 따라 제3자에게 제공할 경우에는 본인의 사전 동의를 얻어야 합니다. 이에 본인은 귀사가 본인의 개인정보를 아래와 같이 제3자에게 제공하는 것에 동의합니다.

· 개인정보를 제공받는 자: 신한은행, 금융결제원, KICC, 에넥스텔레콤, KB헬스케어, (주)여의도자산관리본부, 신안소프트, 라이즈주식회사, 위더스앤씨
· 개인정보를 제공받는 자의 개인정보 이용 목적: 할부거래에 관한 법률 제27조에 따른 공제 계약 및 소비자피해보상보험계약업무, 출금이체 서비스 제공 및 출금 동의 확인, 할부거래, 건강안심케어서비스 이용, 상품/서비스 홍보 및 판매, SMS 서비스 제공, 개인정보조회/신용정보조회 등
· 제공하는 개인정보의 항목: 
  - 개인식별정보: 성명, 생년월일, 주소(자택/직장), 연락처(휴대폰/자택)
  - 계약정보: 회원번호, 납입내역, 상담내역, 행사/해약사항
  - 결제정보: 예금주, 생년월일, 연락처, 계약자와의 관계, 계좌·카드 정보
· 개인정보를 제공받는 자의 개인정보 보유 및 이용기간: 라이프서비스계약 종료 시 삭제`,
    required: true
  },
  {
    id: 'marketing',
    title: '4. 마케팅 정보 제공 동의(선택)',
    content: `이용목적
· 신규 상품 및 서비스 안내
· 이벤트, 프로모션, 혜택 정보 제공
· 고객 맞춤 정보 제공
수집·이용할 개인(신용)정보의 항목
성명, 주소, 휴대폰번호
이용기간
동의일로부터 동의 철회 시까지`,
    required: false
  }
];

const CRUISE_TERMS = [
  {
    id: 'product_notice',
    title: '1. 상품내용 고지에 대한 동의 (필수)',
    content: `본 신청과 관련하여 계약자 본인은 상기 금융거래정보(카드 정보, 은행명, 계좌번호 등)를 만기·해지 신청 때까지 청구 기관에 제공하고, 자동이체를 신청합니다.
본 상품은 더좋은크루즈의 선불식 할부거래(크루즈 여행) 결합 상품인 '좋은건강크루즈330' 또는 '더좋은크루즈'입니다.
본 상품은 선결제 금액 60만 원은 건강식품 매매대금으로 대체하며, 이후 월 27,000원씩 총 100회를 납입하는 상품입니다. 청약 철회 기간(14일) 이후 해지시 공정거래위원회 고시에 따라 환급됩니다. 단, 만기 및 예치 조건 충족 이전에 해지할 경우, 해지 시점을 기준으로 당사 해약환급률표 및 공정거래위원회 고시에 따라 환급합니다.
고객님께서 100회 납입을 모두 완료하고, 완납일로부터 5년을 예치한 후 크루즈 서비스를 이용하지 않고 해약하실 경우, 납입금액 전액과 건강식품 구매 금액을 포함한 총 330만원을 환급해드립니다.`,
    required: true
  },
  {
    id: 'privacy',
    title: '2. 개인(신용)정보의 수집·이용에 관한 사항(필수)',
    content: `이용목적
· 크루즈 여행서비스에 관한 계약이행 및 서비스 제공
· 가입 고객 관리 및 계약의 체결·유지·관리, 상담(민원처리 등)
· 요금청구를 위한 본인 확인, 요금결제(카드결제, CMS출금 등) 및 추심 업무를 위한 신용정보조회
· 공공기관의 정책자료로 제공
수집·이용할 개인(신용)정보의 항목
성명, 주소, 주민번호 앞 6자리(또는 생년월일/성별),전화번호, 계좌번호, 카드정보, 휴대폰번호
이용기간
본 계약체결일로부터 계약종료 후 3년까지
(단, 전자상거래 등에서의 소비자보호에 관한 법률 등 관련 법령의 규정에 의하여 보존할 필요가 있는 경우에는 그에 따름)`,
    required: true
  },
  {
    id: 'third_party',
    title: '3. 제3자 제공 동의 관한 사항(필수)',
    content: `본 계약과 관련하여 귀사가 본인으로부터 취득한 개인정보는 「개인정보보호법」 제17조와 제22조에 따라 제3자에게 제공할 경우에는 본인의 사전 동의를 얻어야 합니다. 
이에 본인은 귀사가 본인의 개인정보를 아래와 같이 제3자에게 제공하는 것에 동의합니다.
· 개인정보를 제공받는 자: 신한은행, 금융결제원, KICC, 더좋은라이프(주), 제휴 크루즈 선사 및 항공사, 제휴 여행사, 신안소프트, 여의도자산관리본부, 위더스앤씨
· 개인정보를 제공받는 자의 개인정보 이용 목적: 할부거래에 관한 법률 제27조에 따른 공제 계약 및 소비자피해보상보험계약업무, 출금이체 서비스 제공 및 출금 동의 확인
· 크루즈/항공 승선 명단 등록 및 예약 수속 대행, SMS 서비스 제공, 개인정보조회/신용정보조회 등
· 제공하는 개인정보의 항목: * 개인식별정보: 성명, 생년월일, 주소(자택/직장), 연락처(휴대폰/자택), 여권정보(행사 진행 시)
	· 계약정보: 회원번호, 납입내역, 상담내역, 행사/해약사항
	· 결제정보: 예금주, 생년월일, 연락처, 계약자와의 관계, 계좌·카드 정보
· 개인정보를 제공받는 자의 개인정보 보유 및 이용기간: 크루즈 여행서비스 계약 종료 시 삭제`,
    required: true
  },
  {
    id: 'marketing',
    title: '4. 마케팅 정보 제공 동의(선택)',
    content: `이용목적
· 신규 상품 및 서비스 안내
· 이벤트, 프로모션, 혜택 정보 제공
· 고객 맞춤 정보 제공
수집·이용할 개인(신용)정보의 항목
성명, 주소, 휴대폰번호
이용기간
동의일로부터 동의 철회 시까지`,
    required: false
  }
];

const GOODLIFE_TERMS = [
  {
    id: 'product_notice',
    title: '1. 상품내용 고지에 대한 동의 (필수)',
    content: `본 신청과 관련하여 계약자 본인은 상기 금융거래정보(카드 정보, 은행, 계좌번호 등)를 만기·해지 신청 때까지 청구 기관에 제공하고, 자동이체를 신청합니다.
본 상품은 60회 약정 의무 납입 상품으로, 청약 철회 기간(14일) 이후 해지 시 잔여금을 완납하여야 하며 이에 동의합니다.
본 상품은 더좋은라이프 상조 서비스와 에넥스텔레콤 결합 상품인 '굿라이프헬스케어'입니다. 상조 서비스와 렌탈 계약은 각각 별개로 진행됩니다. 60회까지의 렌탈 계약으로 제공되는 제품 및 건강 안심 케어 서비스는 사은품이 아님을 알려드립니다.
본 결합 상품의 총 납입 금액은 498만원(실 상조 납입금 300만 원, 제품 1구좌 198만 원 기준), 240회 만기 상품입니다. 고객님께서 만기 회차 도래 시점까지 상품 금액을 완납하고 익월까지 상조 서비스를 이용하지 않고 해약하실 경우, 실 상조 납입금 전액과 만기 축하금을 지급해 드립니다. 단, 고객님께서 만기 회차 이전에 해지할 경우, 해지 시점을 기준으로 납입된 실 상조 납입금에 대해 공정거래위원회 해약 환급금 산정 기준 고시에 따라 환급합니다.`,
    required: true
  },
  {
    id: 'privacy',
    title: '2. 개인(신용)정보의 수집·이용에 관한 사항(필수)',
    content: `이용목적
· 상조서비스에 관한 계약이행 및 서비스 제공
· 상조서비스 가입 고객 관리 및 상조서비스계약의 체결·유지·관리, 상담(민원처리 등)
· 요금청구를 위한 본인 확인, 요금결제(카드결제, CMS출금 등) 및 추심 업무를 위한 신용정보조회
· 공공기관의 정책자료로 제공

수집·이용할 개인(신용)정보의 항목
성명, 주소, 주민번호 앞 7자리, 전화번호, 계좌번호, 카드정보, 휴대폰번호

이용기간
본 계약체결일로부터 계약종료 후 3년까지
(단, 전자상거래 등에서의 소비자보호에 관한 법률 등 관련 법령의 규정에 의하여 보존할 필요가 있는 경우에는 그에 따름)`,
    required: true
  },
  {
    id: 'third_party',
    title: '3. 제3자 제공 동의에 관한 사항(필수)',
    content: `본 계약과 관련하여 귀사가 본인으로부터 취득한 개인정보는 「개인정보보호법」 제17조와 제22조에 따라 제3자에게 제공할 경우에는 본인의 사전 동의를 얻어야 합니다. 이에 본인은 귀사가 본인의 개인정보를 아래와 같이 제3자에게 제공하는 것에 동의합니다.

· 개인정보를 제공받는 자: 신한은행, 금융결제원, KICC, 더좋은라이프(주), 에넥스텔레콤, 비에스온, KB헬스케어, (주)여의도자산관리본부, 신안소프트
· 개인정보를 제공받는 자의 개인정보 이용 목적: 할부거래에 관한 법률 제27조에 따른 공제 계약 및 소비자피해보상보험계약업무, 출금이체 서비스 제공 및 출금 동의 확인, 할부거래, 건강안심케어서비스 이용, 상품/서비스 홍보 및 판매, SMS 서비스 제공, 개인정보조회/신용정보조회 등
· 제공하는 개인정보의 항목: 
  - 개인식별정보: 성명, 생년월일, 주소(자택/직장), 연락처(휴대폰/자택)
  - 계약정보: 회원번호, 납입내역, 상담내역, 행사/해약사항
  - 결제정보: 예금주, 생년월일, 연락처, 계약자와의 관계, 계좌·카드 정보
· 개인정보를 제공받는 자의 개인정보 보유 및 이용기간: 상조서비스계약 종료 시 삭제`,
    required: true
  },
  {
    id: 'marketing',
    title: '4. 마케팅 정보 제공 동의(선택)',
    content: `이용목적
· 신규 상품 및 서비스 안내
· 이벤트, 프로모션, 혜택 정보 제공
· 고객 맞춤 정보 제공
수집·이용할 개인(신용)정보의 항목
성명, 주소, 휴대폰번호
이용기간
동의일로부터 동의 철회 시까지`,
    required: false
  }
];

const STEPS = [
  { id: 'product', title: '상품 선택' },
  { id: 'info', title: '계약자 정보' },
  { id: 'healthcare', title: '헬스케어대상자 정보' },
  { id: 'plan', title: '상품 정보' },
  { id: 'payment', title: '결제 정보' },
  { id: 'terms', title: '약관 동의' },
  { id: 'signature', title: '전자 서명' },
  { id: 'sales', title: '영업 정보' },
  { id: 'complete', title: '가입 완료' },
];

interface RegistrationFormProps {
  allowedProducts?: string[];
  linkId?: string;
  initialProduct?: string;
  initialSkipHealthcare?: boolean;
  initialPrefillData?: any;
}

import { useToast } from '@/components/ToastContext';

const RegistrationForm: React.FC<RegistrationFormProps> = ({ allowedProducts, linkId, initialProduct, initialSkipHealthcare, initialPrefillData }) => {
  const { toast } = useToast();
  const allProducts = ['더좋은하이브리드698', '더좋은프리미엄540', '더좋은헬스케어580', '더좋은통신결합', '더좋은라이즈498', '좋은건강크루즈', '굿라이프헬스케어', '굿라이프헬스케어골드'];
  const productsToDisplay = allowedProducts && allowedProducts.length > 0 ? allowedProducts : allProducts;

  const isValidInitialProduct = initialProduct && productsToDisplay.includes(initialProduct);
  const defaultProduct = initialPrefillData?.product || (isValidInitialProduct ? initialProduct : (productsToDisplay[0] || '더좋은헬스케어580'));

  const [currentStep, setCurrentStep] = useState(initialPrefillData ? 1 : (isValidInitialProduct ? 1 : 0));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingMessage, setSubmittingMessage] = useState('');
  const [createdDocumentId, setCreatedDocumentId] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [products, setProducts] = useState<ProductConfig[]>([]);
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [isCustomProductCount, setIsCustomProductCount] = useState(false);
  const [showInstallmentGuide, setShowInstallmentGuide] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyAccount = () => {
    navigator.clipboard.writeText('476101-01-413681');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getProductConfig = (targetName: string) => {
    if (!targetName) return undefined;
    const clean = targetName.trim();
    return products.find(p => p.id === clean || p.name === clean || p.targetSheetName === clean);
  };

  const getProductDisplayName = (targetName: string) => {
    const matched = getProductConfig(targetName);
    return matched?.name || targetName;
  };

  const renderInstallmentGuide = () => (
    <div className="mt-4 border border-blue-200 rounded-xl overflow-hidden bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setShowInstallmentGuide(!showInstallmentGuide)}
        className="w-full bg-[#0b2b6d] text-white p-2.5 text-center font-bold flex items-center justify-between px-4 text-sm"
      >
        <div className="flex items-center gap-2">
          <CreditCard size={16} /> 무이자 할부 안내
        </div>
        <span className="text-xl leading-none">{showInstallmentGuide ? '−' : '+'}</span>
      </button>
      <AnimatePresence>
        {showInstallmentGuide && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 space-y-3 bg-white">
              <div className="bg-gray-50 p-2.5 rounded-lg text-[13px] text-gray-700 leading-relaxed border border-gray-100">
                <span className="font-bold text-gray-900 mb-0.5 block">대상카드</span>
                BC / 신한 / 삼성 / 현대 / 국민 / 농협 / 하나 / 롯데 / 우리
                <div className="text-[11px] text-gray-500 mt-0.5">(법인(기업), 체크, 선불, 기프트카드 제외)</div>
              </div>
              
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-[13px] border-collapse text-left">
                  <thead>
                    <tr className="bg-[#0b2b6d] text-white">
                      <th className="py-2 px-2 text-center font-bold w-1/2 border-r border-blue-800">카드사</th>
                      <th className="py-2 px-2 text-center font-bold w-1/2">무이자 할부 기간</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="py-2.5 px-3 font-medium text-gray-800 border-r border-gray-200">
                        <span className="text-red-600 font-bold mr-1 text-[14px]">BC</span>
                        <div className="text-[11px] text-gray-500 mt-0.5 font-normal leading-tight">
                          (우리, IBK, 농협, SC, 대구, 부산, 경남, 신한, 하나, KB국민, 씨티)
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-blue-700 align-middle text-[14px]" rowSpan={3}>2~5개월</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium text-gray-800 border-r border-gray-200 flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-blue-500 flex-shrink-0"></div> 우리
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium text-gray-800 border-r border-gray-200 flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-red-500 flex-shrink-0"></div> 롯데
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium text-gray-800 border-t-2 border-dashed border-gray-200 border-r flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-yellow-400 flex-shrink-0"></div> 국민
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-teal-600 align-middle border-t-2 border-dashed border-gray-200 text-[14px]" rowSpan={5}>2~3개월</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium text-gray-800 border-r border-gray-200 flex items-center gap-2">
                        <div className="w-5 h-5 border-[3px] border-gray-800 bg-white flex-shrink-0"></div> 현대
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium text-gray-800 border-r border-gray-200 flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-teal-500 flex-shrink-0"></div> 하나
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium text-gray-800 border-r border-gray-200 flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-blue-600 flex-shrink-0"></div> 신한
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium text-gray-800 border-r border-gray-200 flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-blue-800 flex-shrink-0"></div> 삼성
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium text-gray-800 border-t-2 border-dashed border-gray-200 border-r flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-green-500 flex-shrink-0"></div> 농협
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-amber-600 align-middle border-t-2 border-dashed border-gray-200 text-[14px]">2~6개월</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="bg-gray-50 p-2.5 rounded-lg text-[11px] text-gray-600 flex gap-2 items-start">
                <span className="text-gray-400 shrink-0 mt-0.5">※</span>
                <div className="space-y-0.5">
                  <div>무이자 할부는 카드사 정책에 따라 변동될 수 있습니다.</div>
                  <div>일부 카드 및 가맹점 사정에 따라 제외될 수 있습니다.</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );


  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/products');
        if (res.ok) {
          const data = await res.json();
          setProducts(data);
        }
      } catch (error) {
        console.error('Failed to fetch product configurations:', error);
      }
    };
    fetchProducts();
  }, []);

  const getTermsForProduct = (productName: string) => {
    const clean = String(productName || '').trim();
    const config = getProductConfig(clean);

    // 1. DB/Config에 등록된 약관 문구 우선 사용
    let productNotice = config?.productNoticeTerm;
    let privacy = config?.privacyTerm;
    let thirdParty = config?.thirdPartyTerm;
    let marketing = config?.marketingTerm;

    // 2. 정확히 등록된 상품명 매칭 (모호한 키워드 임의 추정 금지)
    if (!productNotice) {
      if (clean === '더좋은하이브리드698') {
        productNotice = HYBRID_698_TERMS[0].content;
      } else if (clean === '더좋은프리미엄540') {
        productNotice = PREMIUM_540_TERMS[0].content;
      } else if (clean === '더좋은통신결합') {
        productNotice = TONGSIN_TERMS[0].content;
      } else if (clean === '더좋은라이즈498') {
        productNotice = RISE_498_TERMS[0].content;
      } else if (clean === '좋은건강크루즈' || clean === '더좋은크루즈') {
        productNotice = CRUISE_TERMS[0].content;
      } else if (clean === '굿라이프헬스케어') {
        productNotice = GOODLIFE_TERMS[0].content;
      } else if (clean === '굿라이프헬스케어골드' || clean === '굿라이프헬스케어 골드') {
        productNotice = `본 신청과 관련하여 계약자 본인은 상기 금융거래정보(카드 정보, 은행, 계좌번호 등)를 만기·해지 신청 때까지 청구 기관에 제공하고, 자동이체를 신청합니다.
본 상품은 60회 약정 의무 납입 상품으로, 청약 철회 기간(14일) 이후 해지 시 잔여금을 완납하여야 하며 이에 동의합니다.
본 상품은 더좋은라이프 상조 서비스와 에넥스텔레콤 결합 상품으로, 상조 서비스와 렌탈 계약은 각각 별개로 진행됩니다. 60회까지의 렌탈 계약으로 제공되는 제품 및 건강 안심 케어 서비스는 사은품이 아님을 알려드립니다.
본 결합 상품의 총 납입 금액은 540만원(실 상조 납입금 312만 원, 제품 1구좌 228만 원 기준), 210회 만기 상품입니다. 고객님께서 만기 회차 도래 시점까지 상품 금액을 완납하고 익월까지 상조 서비스를 이용하지 않고 해약하실 경우, 실 상조 납입금 전액과 만기 축하금을 지급해 드립니다. 단, 고객님께서 만기 회차 이전에 해지할 경우, 해지 시점을 기준으로 납입된 실 상조 납입금에 대해 공정거래위원회 해약 환급금 산정 기준 고시에 따라 환급합니다.`;
      } else if (clean === '더좋은헬스케어580') {
        productNotice = `본 신청과 관련하여 계약자 본인은 상기 금융거래정보(카드 정보, 은행, 계좌번호 등)를 만기·해지 신청 때까지 청구 기관에 제공하고, 자동이체를 신청하며, 월 부금이 동일한 정보로 자동이체됨에 동의합니다.
본 상품은 192회 약정 의무 납입 상품으로, 청약 철회 기간(14일) 이후 해지 시 잔여금을 완납하여야 하며 이에 동의합니다.
본 상품의 헬스케어서비스는 사은품이 아님을 안내해드립니다.
본 결합 상품의 총 납입 금액은 480만원(1구좌 기준 월 25,000원, 총 192회 납입), 192회 납입 완료 및 2년 예치 후 해약하실 경우 납입금 전액(100%)을 환급해 드립니다. 단, 고객님께서 만기 회차 이전에 해지할 경우, 해지 시점을 기준으로 납입된 금액에 대해 공정거래위원회 해약 환급금 산정 기준 고시에 따라 환급합니다.`;
      } else {
        productNotice = DEFAULT_TERMS[0].content;
      }
    }

    if (!privacy) {
      if (clean === '더좋은라이즈498') {
        privacy = RISE_498_TERMS[1].content;
      } else if (clean === '좋은건강크루즈' || clean === '더좋은크루즈') {
        privacy = CRUISE_TERMS[1].content;
      } else if (clean === '굿라이프헬스케어') {
        privacy = GOODLIFE_TERMS[1].content;
      } else {
        privacy = DEFAULT_TERMS[1].content;
      }
    }

    if (!thirdParty) {
      if (clean === '더좋은라이즈498') {
        thirdParty = RISE_498_TERMS[2].content;
      } else if (clean === '좋은건강크루즈' || clean === '더좋은크루즈') {
        thirdParty = CRUISE_TERMS[2].content;
      } else if (clean === '굿라이프헬스케어') {
        thirdParty = GOODLIFE_TERMS[2].content;
      } else {
        thirdParty = DEFAULT_TERMS[2].content;
      }
    }

    if (!marketing) {
      marketing = DEFAULT_TERMS[3].content;
    }

    return [
      { id: 'product_notice', title: '1. 상품내용 고지에 대한 동의 (필수)', content: productNotice, required: true },
      { id: 'privacy', title: '2. 개인(신용)정보의 수집·이용에 관한 사항(필수)', content: privacy, required: true },
      { id: 'third_party', title: '3. 제3자 제공 동의에 관한 사항(필수)', content: thirdParty, required: true },
      { id: 'marketing', title: '4. 마케팅 정보 제공 동의(선택)', content: marketing, required: false }
    ];
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const getInitialFormData = () => ({
    name: '',
    phone: '',
    address: '',
    addressDetail: '',
    residentId: '',
    contractorType: 'individual', // 'individual' or 'corporate'
    companyName: '',
    businessNumber: '',
    product: defaultProduct, 
    productName: '', // For 698, 통신결합, 라이즈, 굿라이프 제품명
    productName2: '', // For 라이즈 제품명2
    hasMultipleProducts: false, // For 라이즈498 제품 2개 선택 여부
    productCount: 1 as any, // Number of accounts (라이즈498에서는 'A','B','C','D')
    planName: '', // For 더좋은통신결합 요금제
    paymentPlan: 'normal',
    paymentMethod: 'card',
    paymentDate: '5',
    paymentInfo: {
      cardCompany: '',
      cardNumber: '',
      cardExpiry: '', // MM/YY
      bankName: '',
      accountNumber: '',
      accountHolder: '',
      installmentPeriod: '일시불',
    },
    certificateDeliveryMethod: '', // 'alimtalk', 'mail'
    // 크루즈 전용 결제수단 추가
    paymentMethod1: 'card',
    paymentInfo1: {
      cardCompany: '',
      cardNumber: '',
      cardExpiry: '',
      bankName: '국민은행',
      accountNumber: '476101-01-413681',
      accountHolder: '더좋은라이프앤바이오',
      installmentPeriod: '일시불',
    },
    paymentMethod2: 'card',
    paymentInfo2: {
      cardCompany: '',
      cardNumber: '',
      cardExpiry: '',
      bankName: '',
      accountNumber: '',
      accountHolder: '',
      installmentPeriod: '일시불',
    },
    agreement: {},
    signature: '', // Base64 signature
    gender: '남', // '남' or '여'
    healthcareTargets: [
      { relation: '', name: '', birth: '', gender: '남', phone: '', isSameAsContractor: false }
    ],
    salesAffiliation: '',
    salesName: '',
    salesPhone: '',
  });

  const [formData, setFormData] = useState(getInitialFormData());
  const [prefillBannerVisible, setPrefillBannerVisible] = useState(false);

  // 사전신청 토큰 링크 접속 시 생년월일 비밀번호 인증 상태
  const [isPrefillLocked, setIsPrefillLocked] = useState<boolean>(() => {
    if (initialPrefillData && initialPrefillData.birth) {
      const cleaned = String(initialPrefillData.birth).replace(/[^0-9]/g, '');
      return cleaned.length >= 3;
    }
    return false;
  });
  const [birthPasswordInput, setBirthPasswordInput] = useState('');
  const [birthPasswordError, setBirthPasswordError] = useState('');

  const handleVerifyBirthPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialPrefillData || !initialPrefillData.birth) {
      setIsPrefillLocked(false);
      return;
    }

    const rawTarget = String(initialPrefillData.birth).replace(/[^0-9]/g, '');
    const targetDigits = (rawTarget.length > 0 && rawTarget.length < 6) ? rawTarget.padStart(6, '0') : rawTarget;
    const rawInput = birthPasswordInput.replace(/[^0-9]/g, '');
    const inputDigits = (rawInput.length > 0 && rawInput.length < 6) ? rawInput.padStart(6, '0') : rawInput;

    if (!inputDigits) {
      setBirthPasswordError('생년월일을 입력해 주세요.');
      return;
    }

    const isMatch = 
      targetDigits === inputDigits ||
      targetDigits.endsWith(inputDigits) ||
      inputDigits.endsWith(targetDigits) ||
      (targetDigits.length >= 6 && inputDigits.length >= 6 && targetDigits.slice(-6) === inputDigits.slice(-6));

    if (isMatch) {
      setIsPrefillLocked(false);
      setBirthPasswordError('');
      toast('본인 확인이 완료되었습니다.', 'success', '확인 완료');
    } else {
      setBirthPasswordError('생년월일이 일치하지 않습니다. 다시 확인 후 입력해 주세요.');
    }
  };

  useEffect(() => {
    if (initialPrefillData) {
      const rawBirth = initialPrefillData.birth ? String(initialPrefillData.birth).replace(/[^0-9]/g, '') : '';
      const formattedBirth = (rawBirth.length > 0 && rawBirth.length < 6) ? rawBirth.padStart(6, '0') : (initialPrefillData.birth || '');
      setFormData(prev => ({
        ...prev,
        name: initialPrefillData.name || prev.name,
        phone: initialPrefillData.phone || prev.phone,
        residentId: formattedBirth || prev.residentId,
        address: initialPrefillData.address || prev.address,
        addressDetail: initialPrefillData.addressDetail || prev.addressDetail,
        product: initialPrefillData.product || prev.product,
        productCount: initialPrefillData.productCount || prev.productCount,
        productName: initialPrefillData.productName || prev.productName,
        productName2: initialPrefillData.productName2 || prev.productName2,
        salesAffiliation: initialPrefillData.salesAffiliation || prev.salesAffiliation,
        salesName: initialPrefillData.salesName || prev.salesName,
        salesPhone: initialPrefillData.salesPhone || prev.salesPhone,
        companyName: initialPrefillData.companyName || prev.companyName,
        businessNumber: initialPrefillData.businessNumber || prev.businessNumber,
        prefillToken: initialPrefillData.token
      }));
      setPrefillBannerVisible(true);
      setCurrentStep(1);
    }
  }, [initialPrefillData]);
  // 기존 임시저장 데이터 제거 (무조건 신규 작성)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('registration_form_draft');
      localStorage.removeItem('registration_form_step');
    }
  }, []);

  const [isSameCard, setIsSameCard] = useState(false);

  // 1회차 카드 정보가 바뀌고 '동일' 체크 상태일 때 2회차 정보 실시간 동기화
  useEffect(() => {
    if (isSameCard) {
      setFormData(prev => ({
        ...prev,
        paymentInfo2: {
          ...prev.paymentInfo2,
          cardCompany: prev.paymentInfo1.cardCompany,
          cardNumber: prev.paymentInfo1.cardNumber,
          cardExpiry: prev.paymentInfo1.cardExpiry,
        }
      }));
    }
  }, [
    isSameCard, 
    formData.paymentInfo1.cardCompany, 
    formData.paymentInfo1.cardNumber, 
    formData.paymentInfo1.cardExpiry
  ]);

  const handleSameCardToggle = (checked: boolean) => {
    setIsSameCard(checked);
    if (checked) {
      setFormData(prev => ({
        ...prev,
        paymentInfo2: {
          ...prev.paymentInfo2,
          cardCompany: prev.paymentInfo1.cardCompany,
          cardNumber: prev.paymentInfo1.cardNumber,
          cardExpiry: prev.paymentInfo1.cardExpiry,
        }
      }));
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updatePaymentInfo = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      paymentInfo: { ...prev.paymentInfo, [field]: value }
    }));
  };

  const updatePaymentInfo1 = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      paymentInfo1: { ...prev.paymentInfo1, [field]: value }
    }));
  };

  const updatePaymentInfo2 = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      paymentInfo2: { ...prev.paymentInfo2, [field]: value }
    }));
  };

  const updateHealthcareTarget = (index: number, field: string, value: any) => {
    setFormData((prev) => {
      const newTargets = [...prev.healthcareTargets];
      newTargets[index] = { ...newTargets[index], [field]: value };
      return { ...prev, healthcareTargets: newTargets };
    });
  };

  // 상품 변경에 따른 구좌 수 자료형 및 대상자 리스트 개수 조율
  useEffect(() => {
    const isRise = formData.product === '더좋은라이즈498';
    const isHealthcare580 = formData.product === '더좋은헬스케어580';
    setIsCustomProductCount(false);

    if (isRise) {
      setFormData(prev => ({
        ...prev,
        productCount: prev.productCount && ['A','B','C','D'].includes(String(prev.productCount)) ? prev.productCount : 'A',
        hasMultipleProducts: false,
        productName2: '',
        contractorType: 'individual'
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        productCount: prev.productCount && prev.productCount !== 'A' ? prev.productCount : 1,
        hasMultipleProducts: false,
        productName2: '',
        contractorType: isHealthcare580 ? prev.contractorType : 'individual'
      }));
    }
  }, [formData.product]);


  // 구좌 수 변경 시 대상자 배열 크기 조정
  useEffect(() => {
    let count = 1;
    const currentProductConfig = getProductConfig(formData.product);
    const isHealthcareRequired = (currentProductConfig?.requireHealthcare !== false) && !initialSkipHealthcare;

    if (formData.product === '더좋은라이즈498') {
      const countMap: { [key: string]: number } = { 'A': 1, 'B': 2, 'C': 3 };
      count = countMap[formData.productCount as string] || 1;
    } else {
      // 헬스케어 대상자 입력이 필요 없는 상품인 경우 0명으로 설정
      count = !isHealthcareRequired ? 0 : (Number(formData.productCount) || 1);
    }



    if (formData.healthcareTargets.length !== count) {
      setFormData(prev => {
        const currentTargets = [...prev.healthcareTargets];
        if (currentTargets.length < count) {
          const diff = count - currentTargets.length;
          const newTargets = Array.from({ length: diff }).map(() => ({
            relation: '', name: '', birth: '', gender: '남', phone: '', isSameAsContractor: false
          }));
          return { ...prev, healthcareTargets: [...currentTargets, ...newTargets] };
        } else {
          return { ...prev, healthcareTargets: currentTargets.slice(0, count) };
        }
      });
    }
  }, [formData.productCount, formData.product]);

  // 모바일 기기 서명 시 스크롤 및 새로고침(Pull-to-refresh) 방지
  useEffect(() => {
    if (currentStep === 6) {
      const canvas = sigCanvas.current?.getCanvas();
      if (!canvas) return;

      const preventDefault = (e: TouchEvent) => {
        if (e.cancelable) {
          e.preventDefault();
        }
      };

      canvas.addEventListener('touchstart', preventDefault as EventListener, { passive: false });
      canvas.addEventListener('touchmove', preventDefault as EventListener, { passive: false });
      canvas.addEventListener('touchend', preventDefault as EventListener, { passive: false });
      canvas.addEventListener('touchcancel', preventDefault as EventListener, { passive: false });

      return () => {
        canvas.removeEventListener('touchstart', preventDefault as EventListener);
        canvas.removeEventListener('touchmove', preventDefault as EventListener);
        canvas.removeEventListener('touchend', preventDefault as EventListener);
        canvas.removeEventListener('touchcancel', preventDefault as EventListener);
      };
    }
  }, [currentStep]);

  const copyContractorToHealthcare = (index: number) => {
    const isSame = !formData.healthcareTargets[index].isSameAsContractor;
    updateHealthcareTarget(index, 'isSameAsContractor', isSame);

    if (isSame) {
      updateHealthcareTarget(index, 'relation', '본인');
      updateHealthcareTarget(index, 'name', formData.name);
      updateHealthcareTarget(index, 'birth', formData.residentId);
      updateHealthcareTarget(index, 'gender', formData.gender === '남' ? '남' : '여');
      updateHealthcareTarget(index, 'phone', formData.phone);
    } else {
      updateHealthcareTarget(index, 'relation', '');
      updateHealthcareTarget(index, 'name', '');
      updateHealthcareTarget(index, 'birth', '');
      updateHealthcareTarget(index, 'phone', '');
    }
  };

  const handleAddressSearch = () => {
    if (typeof window !== 'undefined' && (window as any).daum) {
      new (window as any).daum.Postcode({
        oncomplete: function (data: any) {
          let fullAddr = data.address;
          let extraAddr = '';

          if (data.addressType === 'R') {
            if (data.bname !== '') extraAddr += data.bname;
            if (data.buildingName !== '') extraAddr += (extraAddr !== '' ? `, ${data.buildingName}` : data.buildingName);
            fullAddr += (extraAddr !== '' ? ` (${extraAddr})` : '');
          }

          updateFormData('address', fullAddr);
        }
      }).open();
    }
  };

  const copyPreviousHealthcareTarget = (index: number) => {
    if (index === 0) return;
    const prev = formData.healthcareTargets[index - 1];
    updateHealthcareTarget(index, 'relation', prev.relation);
    updateHealthcareTarget(index, 'name', prev.name);
    updateHealthcareTarget(index, 'birth', prev.birth);
    updateHealthcareTarget(index, 'gender', prev.gender);
    updateHealthcareTarget(index, 'phone', prev.phone);
  };

  const clearSignature = () => {
    sigCanvas.current?.clear();
    updateFormData('signature', '');
  };

  const saveSignature = () => {
    if (sigCanvas.current?.isEmpty()) {
      toast('서명을 먼저 진행해 주세요.', 'warning');
      return false;
    }
    const dataURL = sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png');
    updateFormData('signature', dataURL);
    return true;
  };

  const handleNext = () => {
    if (currentStep === 0) { // Product Selection
      if (!formData.product) {
        toast('가입하실 상품을 선택해 주세요.', 'warning');
        return;
      }
    }
    if (currentStep === 1) { // Info
      const requireProdName = !['좋은건강크루즈', '더좋은헬스케어580'].includes(formData.product) && !formData.product?.includes('크루즈');
      if (requireProdName && !formData.productName) {
        toast('제품명을 입력해 주세요.', 'warning');
        return;
      }
      if (formData.product === '더좋은라이즈498' && formData.hasMultipleProducts && !formData.productName2) {
        toast('두 번째 제품명을 입력해 주세요.', 'warning');
        return;
      }
      if (formData.product === '더좋은통신결합' && !formData.planName) {
        toast('요금제를 선택해 주세요.', 'warning');
        return;
      }
      if (!formData.name || !formData.phone || !formData.address || !formData.residentId || !formData.gender) {
        toast('계약자 정보를 모두 정확히 입력해 주세요.', 'warning');
        return;
      }
      if (formData.product === '더좋은헬스케어580') {
        const countNum = Number(formData.productCount);
        if (!formData.productCount || isNaN(countNum) || countNum <= 0) {
          toast('신청 구좌 수를 올바르게 입력해 주세요 (1 이상의 숫자).', 'warning');
          return;
        }
      }
    }
    if (currentStep === 2) { // Healthcare Targets step
      let count = 1;
      if (formData.product === '더좋은라이즈498') {
        const countMap: { [key: string]: number } = { 'A': 1, 'B': 2, 'C': 3 };
        count = countMap[formData.productCount as string] || 1;
      } else {
        count = Number(formData.productCount) || 1;
      }

      
      const isTargetValid = formData.healthcareTargets.slice(0, count).every(t => t.relation && t.name && t.birth && t.phone);
      if (!isTargetValid) {
        toast('대상자 정보를 모두 누락 없이 입력해 주세요.', 'warning');
        return;
      }
    }
    if (currentStep === 4) { // Payment Details step
      if (formData.product === '좋은건강크루즈') {
        // 1회차 검증
        if (formData.paymentMethod1 === 'card') {
          const pureCard = formData.paymentInfo1.cardNumber.replace(/[^0-9]/g, '');
          if (pureCard.length < 11 || !formData.paymentInfo1.cardCompany || !formData.paymentInfo1.cardExpiry) {
            toast('1회차 카드 정보를 모두 정확히 입력해 주세요.', 'warning');
            return;
          }
        }
        // 2~101회차 검증
        if (formData.paymentMethod2 === 'card') {
          const pureCard = formData.paymentInfo2.cardNumber.replace(/[^0-9]/g, '');
          if (pureCard.length < 11 || !formData.paymentInfo2.cardCompany || !formData.paymentInfo2.cardExpiry) {
            toast('2~101회차 카드 정보를 모두 정확히 입력해 주세요.', 'warning');
            return;
          }
        } else if (formData.paymentMethod2 === 'cms') {
          if (!formData.paymentInfo2.accountNumber || !formData.paymentInfo2.bankName) {
            toast('2~101회차 계좌 정보를 모두 입력해 주세요.', 'warning');
            return;
          }
        }
      } else {
        if (formData.paymentMethod === 'card') {
          const pureCard = formData.paymentInfo.cardNumber.replace(/[^0-9]/g, '');
          if (pureCard.length < 11 || !formData.paymentInfo.cardCompany || !formData.paymentInfo.cardExpiry) {
            toast('카드 정보를 모두 정확히 입력해 주세요 (번호는 11~16자리 가능).', 'warning');
            return;
          }
        } else {
          if (!formData.paymentInfo.accountNumber || !formData.paymentInfo.bankName) {
            toast('계좌 정보를 모두 입력해 주세요.', 'warning');
            return;
          }
        }
      }
    }
    if (currentStep === 5) { // Terms Agreement step
      const currentTerms = getTermsForProduct(formData.product);

      const requiredTerms = currentTerms.filter(t => t.required).map(t => t.id);
      const isAllRequiredAgreed = requiredTerms.every(id => (formData.agreement as any)[id]);
      if (!isAllRequiredAgreed) {
        toast('필수 약관에 모두 동의해 주세요.', 'warning');
        return;
      }
    }
    if (currentStep === 6) { // Signature step
      if (!saveSignature()) return;
    }
    if (currentStep === 7) { // Sales Info step
      if (!formData.salesName || !formData.salesAffiliation) {
        toast('영업사원 정보(소속 포함)를 모두 정확히 입력해 주세요.', 'warning');
        return;
      }
      handleSubmit();
      return;
    }
    if (currentStep === 1) {
      if (formData.product === '더좋은통신결합') {
        setCurrentStep(3);
        return;
      }
      const currentProductConfig = getProductConfig(formData.product);
      const isHealthcareRequired = (currentProductConfig?.requireHealthcare !== false) && !initialSkipHealthcare;
      if (!isHealthcareRequired) {
        setCurrentStep(3); // 헬스케어대상자(Step 2)를 건너뛰고 상품정보(Step 3)로 바로 이동
        return;
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));

  };

  const handleBack = () => {
    if (currentStep === 3) {
      if (formData.product === '더좋은통신결합') {
        setCurrentStep(1);
        return;
      }
      const currentProductConfig = getProductConfig(formData.product);
      const isHealthcareRequired = (currentProductConfig?.requireHealthcare !== false) && !initialSkipHealthcare;
      if (!isHealthcareRequired) {
        setCurrentStep(1); // 헬스케어대상자(Step 2)를 건너뛰고 계약자정보(Step 1)로 바로 이동
        return;
      }
    }
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };


  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmittingMessage('가입 신청서를 전송하고 있습니다...');
    try {
      const activePrefillToken = initialPrefillData?.token || initialPrefillData?.id || initialPrefillData?.prefillToken || (formData as any).prefillToken;
      const result = await registerAction({ ...formData, linkId, prefillToken: activePrefillToken });
      if (result.success) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('registration_form_draft');
          localStorage.removeItem('registration_form_step');
        }
        setSubmittingMessage('안전하게 계약서 PDF를 생성하고 있습니다. (최대 10초 소요)');
        if (result.documentId) {
          setCreatedDocumentId(result.documentId);
          
          // PDF 생성이 완료될 때까지 약 10초간 로딩 화면 유지
          await new Promise(resolve => setTimeout(resolve, 10000));
          
          setCurrentStep(8); // 완료 화면으로 이동
          
          // 완료 화면 렌더링 후 약간의 시차를 두고 다운로드 시작
          setTimeout(() => {
            window.location.href = `/api/download?id=${result.documentId}&action=download`;
          }, 500);
        } else {
          setCurrentStep(8); // Final step
        }
      } else {
        toast(result.message || '등록 중 오류가 발생했습니다.', 'error');
      }
    } catch (error: any) {
      console.error('Registration Error:', error);
      toast(error.message || '신청 중 오류가 발생했습니다. 다시 시도해 주세요.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isPrefillLocked && initialPrefillData) {
    return (
      <div className="min-h-screen bg-theme text-theme transition-colors duration-300 flex flex-col items-center justify-center p-6 selection:bg-indigo-500/30">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 sm:p-10 rounded-[2.5rem] text-center space-y-7 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/10 blur-3xl rounded-full translate-x-10 -translate-y-10" />
          
          <div className="inline-flex w-20 h-20 bg-indigo-50 dark:bg-indigo-950/60 rounded-[2rem] items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50 shadow-inner mx-auto">
            <Lock size={36} />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-full border border-indigo-200 dark:border-indigo-800">
              보안 본인 확인
            </span>
            <h2 className="text-xl font-black italic tracking-tight text-slate-900 dark:text-slate-100 pt-2">
              맞춤 가입신청서 본인 확인
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold leading-relaxed pt-1">
              안전한 개인정보 보호를 위해 계약자님의 생년월일을 입력해 주세요.
            </p>
          </div>

          {initialPrefillData.name && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="text-slate-400 font-medium">계약자성명</span>
              <span className="font-black text-indigo-600 dark:text-indigo-400">{initialPrefillData.name} 님</span>
            </div>
          )}

          <form onSubmit={handleVerifyBirthPassword} className="space-y-4 pt-2">
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 block ml-1">
                생년월일 (숫자 6자리)
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="예: 920519"
                value={birthPasswordInput}
                onChange={e => {
                  setBirthPasswordInput(e.target.value.replace(/[^0-9]/g, ''));
                  setBirthPasswordError('');
                }}
                className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-600 dark:focus:border-indigo-500 transition-all text-center tracking-widest"
                autoFocus
              />
            </div>

            {birthPasswordError && (
              <p className="text-xs font-bold text-rose-500 flex items-center justify-center gap-1.5 animate-pulse">
                <AlertCircle size={14} />
                {birthPasswordError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs transition-all shadow-lg shadow-indigo-600/25 cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={16} />
              본인 확인 및 서명하기
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme text-theme transition-colors duration-300 flex flex-col items-center py-12 px-4 selection:bg-indigo-500/30">

      <Script src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" strategy="lazyOnload" />

      <div className="w-full max-w-xl space-y-10">
        <div className="flex justify-between items-center px-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-1">Registration System</span>
            <div className="h-1 w-12 bg-indigo-500 rounded-full" />
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="p-3 rounded-2xl bg-card transition-all hover:scale-110 active:scale-95 border border-theme shadow-sm"
            aria-label="Toggle Theme"
          >
            {theme === 'light' ? <Moon size={20} className="text-zinc-600" /> : <Sun size={20} className="text-yellow-400" />}
          </button>
        </div>

        {prefillBannerVisible && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-2xl p-4 w-full shadow-lg flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-bold text-white shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="text-xs font-black">사전 정보 작성 완료 링크</p>
                <p className="text-[11px] opacity-95 font-bold">기본 회원정보가 이미 채워져 있습니다. 미입력 항목만 작성 후 제출해 주세요!</p>
              </div>
            </div>
            <button 
              type="button" 
              onClick={() => setPrefillBannerVisible(false)}
              className="text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer"
            >
              닫기
            </button>
          </motion.div>
        )}

        {currentStep > 0 && currentStep < 8 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between bg-indigo-50/50 dark:bg-zinc-800/40 border border-indigo-100/60 dark:border-zinc-700/50 rounded-2xl py-3.5 px-5 w-full shadow-sm"
          >
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-sub opacity-60">선택한 상품</span>
              <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{getProductDisplayName(formData.product)}</span>
            </div>
            <button
              type="button"
              onClick={() => setCurrentStep(0)}
              className="text-[11px] font-bold bg-white dark:bg-zinc-800 border border-theme text-sub hover:text-indigo-600 px-3 py-2 rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft size={12} /> 상품 재선택
            </button>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {currentStep === 0 && (
            <motion.div
              key="step-product"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8 card-theme p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem]"
            >
              <div className="space-y-1 pb-2 border-b border-theme/10">
                <h2 className="text-2xl font-black italic tracking-tight">{STEPS[currentStep].title}</h2>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[13px] font-bold text-sub ml-1 flex items-center gap-2"><Package size={14} /> 상품 선택</label>
                    {initialPrefillData && (
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <Lock size={12} /> 사전 지정 (변경 불가)
                      </span>
                    )}
                  </div>

                  {initialPrefillData && (
                    <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl flex items-center gap-2.5 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                      <Lock size={15} className="shrink-0 text-indigo-600 dark:text-indigo-400" />
                      <span>담당자에 의해 사전 지정된 맞춤 상품입니다. 상품 변경이 불가능합니다.</span>
                    </div>
                  )}

                  <div className="flex flex-col gap-3 pt-1">
                    {productsToDisplay.map((p, idx) => {
                      const isSelected = formData.product === p;
                      const isPrefillLocked = !!initialPrefillData;
                      const themes = [
                        { active: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/20 border-transparent ring-2 ring-blue-600/50 ring-offset-2 ring-offset-transparent', inactive: 'bg-theme border border-theme hover:border-blue-300 hover:text-blue-600 text-sub hover:bg-blue-50/30' },
                        { active: 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/20 border-transparent ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-transparent', inactive: 'bg-theme border border-theme hover:border-emerald-300 hover:text-emerald-600 text-sub hover:bg-emerald-50/30' },
                        { active: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xl shadow-amber-500/20 border-transparent ring-2 ring-amber-500/50 ring-offset-2 ring-offset-transparent', inactive: 'bg-theme border border-theme hover:border-amber-300 hover:text-amber-600 text-sub hover:bg-amber-50/30' },
                        { active: 'bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white shadow-xl shadow-purple-500/20 border-transparent ring-2 ring-purple-500/50 ring-offset-2 ring-offset-transparent', inactive: 'bg-theme border border-theme hover:border-purple-300 hover:text-purple-600 text-sub hover:bg-purple-50/30' },
                        { active: 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-xl shadow-rose-500/20 border-transparent ring-2 ring-rose-500/50 ring-offset-2 ring-offset-transparent', inactive: 'bg-theme border border-theme hover:border-rose-300 hover:text-rose-600 text-sub hover:bg-rose-50/30' }
                      ];
                      const theme = themes[idx % themes.length];
                      
                      return (
                        <button
                          key={p}
                          type="button"
                          disabled={isPrefillLocked && !isSelected}
                          onClick={() => {
                            if (isPrefillLocked) {
                              toast('사전 지정된 상품은 변경하실 수 없습니다.', 'warning');
                              return;
                            }
                            if (formData.product !== p) {
                              setFormData({
                                ...getInitialFormData(),
                                product: p
                              });
                            }
                          }}
                          className={`w-full py-5 px-7 rounded-[1.25rem] font-black text-lg text-left transition-all duration-300 flex items-center justify-between ${
                            isSelected ? theme.active : (isPrefillLocked ? 'opacity-40 cursor-not-allowed bg-theme border border-theme text-sub' : theme.inactive)
                          }`}
                        >
                          <span className="tracking-tight">{getProductDisplayName(p)}</span>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-white bg-white/20' : 'border-slate-300/50 bg-transparent'}`}>
                            {isSelected && <Check size={14} className="text-white" />}
                            {isPrefillLocked && !isSelected && <Lock size={12} className="text-slate-400" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                </div>
              </div>

              <button onClick={handleNext} className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black flex items-center justify-center gap-2 group shadow-xl shadow-indigo-500/20">다음 단계 <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /></button>
            </motion.div>
          )}

          {currentStep === 1 && (
            <motion.div
              key="step-info"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8 card-theme p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem]"
            >
              <div className="space-y-1 pb-2 border-b border-theme/10">
                <h2 className="text-2xl font-black italic tracking-tight">{STEPS[currentStep].title}</h2>
              </div>

              <div className="space-y-6">
                {formData.product === '더좋은헬스케어580' && (
                  <div className="space-y-2">
                    <label className="text-[13px] font-bold text-sub ml-1 flex items-center gap-2"><User size={14} /> 가입 유형</label>
                    <div className="flex bg-theme p-1 rounded-2xl border border-theme">
                      <button type="button" onClick={() => updateFormData('contractorType', 'individual')} className={`flex-1 py-3 rounded-xl font-bold transition-all ${formData.contractorType === 'individual' ? 'bg-indigo-600 text-white shadow-sm' : 'text-sub hover:text-indigo-400'}`}>개인</button>
                      <button type="button" onClick={() => updateFormData('contractorType', 'corporate')} className={`flex-1 py-3 rounded-xl font-bold transition-all ${formData.contractorType === 'corporate' ? 'bg-indigo-600 text-white shadow-sm' : 'text-sub hover:text-indigo-400'}`}>기업/단체</button>
                    </div>
                  </div>
                )}

                {formData.product === '더좋은헬스케어580' && formData.contractorType === 'corporate' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[13px] font-bold text-sub ml-1 flex items-center gap-2"><Briefcase size={14} /> 기업명</label>
                      <input type="text" placeholder="법인 또는 단체명을 입력하세요" value={formData.companyName} onChange={(e) => updateFormData('companyName', e.target.value)} className="w-full bg-theme border border-theme rounded-2xl py-4.5 px-6 focus:border-indigo-500 outline-none text-base" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[13px] font-bold text-sub ml-1 flex items-center gap-2"><FileText size={14} /> 사업자등록번호</label>
                      <input type="text" placeholder="사업자등록번호 10자리를 입력하세요" value={formData.businessNumber} onChange={(e) => updateFormData('businessNumber', e.target.value)} className="w-full bg-theme border border-theme rounded-2xl py-4.5 px-6 focus:border-indigo-500 outline-none text-base" />
                    </div>
                  </motion.div>
                )}

                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-sub ml-1 flex items-center gap-2"><User size={14} /> 계약자 성명</label>
                  <input type="text" placeholder="성명을 입력하세요" value={formData.name} onChange={(e) => updateFormData('name', e.target.value)} className="w-full bg-theme border border-theme rounded-2xl py-4.5 px-6 focus:border-indigo-500 outline-none text-base" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[13px] font-bold text-sub ml-1 flex items-center gap-2"><Calendar size={14} /> 생년월일 6자리</label>
                    <input type="text" placeholder="880805" maxLength={6} value={formData.residentId} onChange={(e) => updateFormData('residentId', e.target.value.replace(/[^0-9]/g, ''))} className="w-full bg-theme border border-theme rounded-2xl py-4.5 px-6 focus:border-indigo-500 outline-none font-bold text-base" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[13px] font-bold text-sub ml-1">성별</label>
                    <div className="flex bg-theme p-1 rounded-2xl border border-theme h-14">
                      <button type="button" onClick={() => updateFormData('gender', '남')} className={`flex-1 rounded-xl font-bold transition-all ${formData.gender === '남' ? 'bg-indigo-600 text-white shadow-md' : 'text-sub hover:text-indigo-500'}`}>남</button>
                      <button type="button" onClick={() => updateFormData('gender', '여')} className={`flex-1 rounded-xl font-bold transition-all ${formData.gender === '여' ? 'bg-indigo-600 text-white shadow-md' : 'text-sub hover:text-indigo-500'}`}>여</button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-sub ml-1 flex items-center gap-2"><Phone size={14} /> 휴대폰 번호</label>
                  <input type="tel" placeholder="010-0000-0000" value={formData.phone} onChange={(e) => {
                    let val = e.target.value.replace(/[^0-9]/g, '');
                    if (val.length > 3 && val.length <= 7) val = val.substring(0, 3) + '-' + val.substring(3);
                    else if (val.length > 7) val = val.substring(0, 3) + '-' + val.substring(3, 7) + '-' + val.substring(7, 11);
                    updateFormData('phone', val);
                  }} className="w-full bg-theme border border-theme rounded-2xl py-4.5 px-6 focus:border-indigo-500 outline-none text-base" />
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-sub ml-1 flex items-center gap-2"><MapPin size={14} /> 주소</label>
                  <div className="flex gap-2">
                    <input type="text" placeholder="주소 검색을 클릭하세요" value={formData.address} readOnly onClick={handleAddressSearch} className="flex-1 bg-theme border border-theme rounded-2xl py-4.5 px-6 outline-none cursor-pointer" />
                    <button type="button" onClick={handleAddressSearch} className="px-6 bg-card border border-theme rounded-2xl hover:bg-zinc-100 transition-colors font-bold text-sm">검색</button>
                  </div>
                  <input type="text" placeholder="상세 주소를 입력하세요" value={formData.addressDetail} onChange={(e) => updateFormData('addressDetail', e.target.value)} className="w-full bg-theme border border-theme rounded-2xl py-4.5 px-6 focus:border-indigo-500 outline-none text-base" />
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-sub ml-1 flex items-center gap-2"><Calculator size={14} /> 신청 구좌 수</label>
                  {formData.product === '더좋은라이즈498' ? (
                    <div className="grid grid-cols-3 gap-2 bg-theme p-1 rounded-2xl border border-theme h-14">
                      {['A', 'B', 'C'].map(grade => (
                        <button key={grade} type="button" onClick={() => updateFormData('productCount', grade)} className={`rounded-xl font-bold transition-all text-xs ${String(formData.productCount).toUpperCase() === grade ? 'bg-indigo-600 text-white shadow-md' : 'text-sub hover:text-indigo-500'}`}>
                          {grade}
                        </button>
                      ))}
                    </div>
                  ) : formData.product === '더좋은헬스케어580' ? (
                    <div className="space-y-3">
                      <div className="flex bg-theme p-1 rounded-2xl border border-theme h-14">
                        {[1, 2, 3].map(num => (
                          <button 
                            key={num} 
                            type="button" 
                            onClick={() => {
                              setIsCustomProductCount(false);
                              updateFormData('productCount', num);
                            }} 
                            className={`flex-1 rounded-xl font-bold transition-all ${!isCustomProductCount && Number(formData.productCount) === num ? 'bg-indigo-600 text-white shadow-md' : 'text-sub hover:text-indigo-500'}`}
                          >
                            {num}구좌
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setIsCustomProductCount(true);
                            updateFormData('productCount', '');
                          }}
                          className={`flex-1 rounded-xl font-bold transition-all ${isCustomProductCount ? 'bg-indigo-600 text-white shadow-md' : 'text-sub hover:text-indigo-500'}`}
                        >
                          직접 입력
                        </button>
                      </div>
                      {isCustomProductCount && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative">
                          <input 
                            type="text" 
                            placeholder="신청할 구좌 수를 숫자로 입력해 주세요 (예: 5)" 
                            value={formData.productCount} 
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, '');
                              updateFormData('productCount', val);
                            }} 
                            className="w-full bg-theme border border-theme rounded-2xl py-4 px-6 focus:border-indigo-500 outline-none font-bold text-base" 
                          />
                          <span className="absolute right-6 top-1/2 -translate-y-1/2 font-bold text-sub">구좌</span>
                        </motion.div>
                      )}
                    </div>
                  ) : (
                    <div className="flex bg-theme p-1 rounded-2xl border border-theme h-14">
                      {[1, 2, 3].map(num => {
                        const disabled = (formData.product === '더좋은통신결합' && num > 1) || ((formData.product?.includes('크루즈')) && num > 2);
                        if (disabled) return null;
                        const isSelected = Number(formData.productCount) === num;
                        return (
                          <button key={num} type="button" onClick={() => updateFormData('productCount', num)} className={`flex-1 rounded-xl font-bold transition-all ${isSelected ? 'bg-indigo-600 text-white shadow-md' : 'text-sub hover:text-indigo-500'}`}>
                            {num}구좌
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {!['좋은건강크루즈', '더좋은헬스케어580', '더좋은라이즈498', '더좋은통신결합'].includes(formData.product) && !formData.product?.includes('크루즈') && (
                  <div className="space-y-2">
                    <label className="text-[13px] font-bold text-sub ml-1 flex items-center gap-2"><Tag size={14} /> 제품명</label>
                    <input type="text" placeholder="예: LG 스탠바이미" value={formData.productName} onChange={(e) => updateFormData('productName', e.target.value)} className="w-full bg-theme border border-theme rounded-2xl py-4.5 px-6 focus:border-indigo-500 outline-none font-bold text-base" />
                  </div>
                )}

                {formData.product === '더좋은라이즈498' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[13px] font-bold text-sub ml-1 flex items-center gap-2"><Tag size={14} /> 렌탈 제품 입력</label>
                      <button 
                        type="button" 
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            hasMultipleProducts: !prev.hasMultipleProducts,
                            productName2: !prev.hasMultipleProducts ? prev.productName2 : ''
                          }));
                        }}
                        className={`text-xs px-3 py-1 rounded-full font-bold border transition-all ${formData.hasMultipleProducts ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-zinc-50 border-zinc-200 text-sub'}`}
                      >
                        제품 2개 신청
                      </button>
                    </div>
                    <div className="space-y-3">
                      <input type="text" placeholder="첫 번째 제품명 (예: 세탁기)" value={formData.productName} onChange={(e) => updateFormData('productName', e.target.value)} className="w-full bg-theme border border-theme rounded-2xl py-4.5 px-6 focus:border-indigo-500 outline-none font-bold text-base" />
                      {formData.hasMultipleProducts && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                          <input type="text" placeholder="두 번째 제품명 (예: 건조기)" value={formData.productName2} onChange={(e) => updateFormData('productName2', e.target.value)} className="w-full bg-theme border border-theme rounded-2xl py-4.5 px-6 focus:border-indigo-500 outline-none font-bold text-base" />
                        </motion.div>
                      )}
                    </div>
                  </div>
                )}

                {formData.product === '더좋은통신결합' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[13px] font-bold text-sub ml-1 flex items-center gap-2"><Tag size={14} /> 요금제 선택</label>
                      <select value={formData.planName} onChange={(e) => updateFormData('planName', e.target.value)} className="w-full bg-theme border border-theme rounded-2xl py-4.5 px-6 focus:border-indigo-500 outline-none appearance-none font-bold">
                        <option value="">-- 요금제를 선택하세요 --</option>
                        <option value="360플러스(7G 월44,000원)">360플러스(7G 월44,000원)</option>
                        <option value="360플러스(10G 월47,080원)">360플러스(10G 월47,080원)</option>
                        <option value="360플러스(15G 월49,060원)">360플러스(15G 월49,060원)</option>
                        <option value="540플러스(7G 월64,020원)">540플러스(7G 월64,020원)</option>
                        <option value="540플러스(10G 월67,100원)">540플러스(10G 월67,100원)</option>
                        <option value="540플러스(15G 월69,080원)">540플러스(15G 월69,080원)</option>
                        <option value="프리미어플러스(11G 79,200원)">프리미어플러스(11G 79,200원)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[13px] font-bold text-sub ml-1 flex items-center gap-2"><Tag size={14} /> 제품명</label>
                      <input type="text" placeholder="예: 신세계상품권 80만원" value={formData.productName} onChange={(e) => updateFormData('productName', e.target.value)} className="w-full bg-theme border border-theme rounded-2xl py-4.5 px-6 focus:border-indigo-500 outline-none font-bold text-base" />
                    </div>
                  </>
                )}
                
                {/* 회원증서 수령 방법 */}
                <div className="space-y-3 pt-4 border-t border-theme/10">
                  <label className="text-[13px] font-bold text-sub ml-1 flex items-center gap-2">
                    <FileText size={14} /> 회원증서 수령 방법
                  </label>
                  <div className="flex bg-theme p-1 rounded-2xl border border-theme h-14">
                    <button 
                      type="button" 
                      onClick={() => updateFormData('certificateDeliveryMethod', 'alimtalk')} 
                      className={`flex-1 rounded-xl font-bold transition-all ${(!formData.certificateDeliveryMethod || formData.certificateDeliveryMethod === 'alimtalk') ? 'bg-indigo-600 text-white shadow-md' : 'text-sub hover:text-indigo-500'}`}
                    >
                      알림톡
                    </button>

                    <button 
                      type="button" 
                      onClick={() => updateFormData('certificateDeliveryMethod', 'mail')} 
                      className={`flex-1 rounded-xl font-bold transition-all ${formData.certificateDeliveryMethod === 'mail' ? 'bg-indigo-600 text-white shadow-md' : 'text-sub hover:text-indigo-500'}`}
                    >
                      우편
                    </button>
                  </div>
                  

                  {(!formData.certificateDeliveryMethod || formData.certificateDeliveryMethod === 'alimtalk') && (
                    <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 flex items-start gap-2">
                      <span className="text-indigo-500 mt-0.5">※</span>
                      <p className="text-[12px] font-bold text-indigo-700 leading-snug">
                        선택하지 않으실 경우, 기본적으로 <span className="text-indigo-600 font-black">카카오 알림톡</span>으로 회원증서가 발송됩니다.
                      </p>
                    </div>
                  )}
                </div>

              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={handleBack} className="flex-1 py-5 bg-card text-sub rounded-2xl font-bold border border-theme">이전</button>
                <button onClick={handleNext} className="flex-[2] py-5 bg-indigo-600 text-white rounded-2xl font-black">다음 단계</button>
              </div>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              key="step-healthcare"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8 card-theme p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem]"
            >
              <div className="space-y-1 pb-2 border-b border-theme/10">
                <h2 className="text-2xl font-black italic tracking-tight">{STEPS[currentStep].title}</h2>
              </div>

              <div className="space-y-8">
                {formData.healthcareTargets.map((target, idx) => (
                  <div key={idx} className={`space-y-6 p-7 rounded-[2.5rem] border transition-all duration-300 relative overflow-hidden ${target.isSameAsContractor ? 'bg-indigo-600/5 border-indigo-500/30' : 'bg-theme border-theme'}`}>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[13px] font-black text-zinc-900 tracking-tighter">대상자 {idx + 1}</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => copyContractorToHealthcare(idx)}
                            className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${target.isSameAsContractor ? 'bg-indigo-600 text-white shadow-md' : 'bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100'}`}
                          >
                            <User size={12} className={target.isSameAsContractor ? 'text-white' : 'text-indigo-500'} />
                            본인
                          </button>
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => copyPreviousHealthcareTarget(idx)}
                              className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 transition-all"
                            >
                              위 대상자와 동일
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-sub ml-1 uppercase tracking-widest flex items-center gap-2"><User size={12} /> 관계</label>
                        <input type="text" placeholder="예: 본인, 배우자" value={target.relation} onChange={(e) => updateHealthcareTarget(idx, 'relation', e.target.value)} className="w-full bg-theme border border-theme rounded-2xl py-4 px-6 outline-none focus:border-indigo-500 transition-all font-bold text-base" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-sub ml-1 uppercase tracking-widest flex items-center gap-2"><User size={12} /> 성명</label>
                        <input type="text" placeholder="성함" value={target.name} onChange={(e) => updateHealthcareTarget(idx, 'name', e.target.value)} className="w-full bg-theme border border-theme rounded-2xl py-4 px-6 outline-none focus:border-indigo-500 transition-all font-bold text-base" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-sub ml-1 uppercase tracking-widest flex items-center gap-2"><Calendar size={12} /> 생년월일</label>
                        <input type="text" placeholder="19900101" maxLength={8} value={target.birth} onChange={(e) => updateHealthcareTarget(idx, 'birth', e.target.value.replace(/[^0-9]/g, ''))} className="w-full bg-theme border border-theme rounded-2xl py-4 px-6 outline-none focus:border-indigo-500 transition-all font-mono font-bold text-base" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-sub ml-1 uppercase tracking-widest">성별</label>
                        <div className="flex bg-theme p-1 rounded-2xl border border-theme h-14">
                          <button type="button" onClick={() => updateHealthcareTarget(idx, 'gender', '남')} className={`flex-1 rounded-xl text-[11px] font-black transition-all ${target.gender === '남' ? 'bg-indigo-600 text-white shadow-md' : 'text-sub hover:text-indigo-500'}`}>남</button>
                          <button type="button" onClick={() => updateHealthcareTarget(idx, 'gender', '여')} className={`flex-1 rounded-xl text-[11px] font-black transition-all ${target.gender === '여' ? 'bg-indigo-600 text-white shadow-md' : 'text-sub hover:text-indigo-500'}`}>여</button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-sub ml-1 uppercase tracking-widest flex items-center gap-2"><Phone size={12} /> 연락처</label>
                      <input type="tel" placeholder="010-0000-0000" value={target.phone} onChange={(e) => {
                        let val = e.target.value.replace(/[^0-9]/g, '');
                        if (val.length > 3 && val.length <= 7) val = val.substring(0, 3) + '-' + val.substring(3);
                        else if (val.length > 7) val = val.substring(0, 3) + '-' + val.substring(3, 7) + '-' + val.substring(7, 11);
                        updateHealthcareTarget(idx, 'phone', val);
                      }} className="w-full bg-theme border border-theme rounded-2xl py-4 px-6 outline-none focus:border-indigo-500 transition-all font-bold text-base" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={handleBack} className="flex-1 py-5 bg-card text-sub rounded-2xl font-bold border border-theme">이전</button>
                <button onClick={handleNext} className="flex-[2] py-5 bg-indigo-600 text-white rounded-2xl font-black">다음 단계</button>
              </div>
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div
              key="step-plan"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8 card-theme p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem]"
            >
              <div className="space-y-1 pb-2 border-b border-theme/10">
                <h2 className="text-2xl font-black italic tracking-tight">{STEPS[currentStep].title}</h2>
              </div>

              <div className="bg-theme border border-theme p-8 rounded-[2rem] space-y-6">
                <div>
                  <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest">선택한 상품</p>
                  <h3 className="text-lg font-black italic">
                    {getProductDisplayName(formData.product)} {formData.productCount && `(${formData.productCount}구좌)`}
                  </h3>
                  {formData.productName && <p className="text-xs font-bold text-indigo-600 mt-1">제품: {formData.productName} {formData.productName2 && `, ${formData.productName2}`}</p>}
                </div>

                <div className="space-y-3">
                  {(() => {
                    const prodName = String(formData.product || '');
                    const count = Number(formData.productCount) || 1;

                    // 1. DB/products.json에 등록된 상품 설정(Config) 우선 적용
                    const currentConfig = getProductConfig(prodName);
                    const hasCustomConfig = currentConfig && (currentConfig.monthlyPayment1 || currentConfig.monthlyPayment2 || currentConfig.refundNotice);
                    
                    if (hasCustomConfig) {
                      const multiplyAmounts = (text: string, multiplier: number) => {
                        if (!text) return text;
                        return text.replace(/(\d{1,3}(?:,\d{3})*|\d+)\s*(원|만원|만)/g, (match, p1, p2) => {
                          const num = parseInt(p1.replace(/,/g, ''), 10);
                          if (!isNaN(num)) {
                            return (num * multiplier).toLocaleString() + p2;
                          }
                          return match;
                        });
                      };

                      return (
                        <>
                          {currentConfig.monthlyPayment1 && (
                            <div className="flex justify-between items-center p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                              <span className="text-xs font-bold">{currentConfig.monthlyPayment1Title || '1차 납입금'}</span>
                              <span className="text-lg font-black text-indigo-500">{multiplyAmounts(currentConfig.monthlyPayment1, count)}</span>
                            </div>
                          )}
                          {currentConfig.monthlyPayment2 && currentConfig.monthlyPayment2 !== '전 회차 동일' && (
                            <div className="flex justify-between items-center p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                              <span className="text-xs font-bold">{currentConfig.monthlyPayment2Title || '2차 납입금'}</span>
                              <span className="text-lg font-black text-indigo-500">{multiplyAmounts(currentConfig.monthlyPayment2, count)}</span>
                            </div>
                          )}
                          {currentConfig.refundNotice && (
                            <div className="flex flex-col items-center py-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/10 text-center">
                              <span className="text-emerald-600 font-black text-sm italic">{multiplyAmounts(currentConfig.refundNotice, count)}</span>
                            </div>
                          )}
                        </>
                      );
                    }

                    // 2. 키워드 기반 폴백
                    if (prodName.includes('580') || prodName.includes('헬스케어580')) {
                      return (
                        <>
                          <div className="flex justify-between items-center p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                            <span className="text-xs font-bold">월 납입금 (1~192회)</span>
                            <span className="text-lg font-black text-indigo-500">{(25000 * count).toLocaleString()}원</span>
                          </div>
                          <div className="flex flex-col items-center py-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/10">
                            <span className="text-emerald-600 font-black text-sm italic">만기 2년 후 {(4800000 * count).toLocaleString()}원 100% 환급</span>
                          </div>
                        </>
                      );
                    }

                    if (prodName.includes('698') || prodName.includes('하이브리드698')) {
                      return (
                        <>
                          <div className="flex justify-between items-center p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                            <span className="text-xs font-bold">1~60회차 (월 납입)</span>
                            <span className="text-lg font-black text-indigo-500">{(35000 * count).toLocaleString()}원</span>
                          </div>
                          <div className="flex justify-between items-center p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                            <span className="text-xs font-bold">61~240회차 (월 납입)</span>
                            <span className="text-lg font-black text-indigo-500">{(16000 * count).toLocaleString()}원</span>
                          </div>
                          <div className="flex flex-col items-center py-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/10">
                            <span className="text-emerald-600 font-black text-sm italic">만기 시 {(4980000 * count).toLocaleString()}원 100% 환급</span>
                          </div>
                        </>
                      );
                    }

                    if (prodName.includes('540') || prodName.includes('프리미엄')) {
                      return (
                        <>
                          <div className="flex justify-between items-center p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                            <span className="text-xs font-bold">1~60회차 (월 납입)</span>
                            <span className="text-lg font-black text-indigo-500">{(40000 * count).toLocaleString()}원</span>
                          </div>
                          <div className="flex justify-between items-center p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                            <span className="text-xs font-bold">61~210회차 (월 납입)</span>
                            <span className="text-lg font-black text-indigo-500">{(20000 * count).toLocaleString()}원</span>
                          </div>
                          <div className="flex flex-col items-center py-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/10">
                            <span className="text-emerald-600 font-black text-sm italic">만기 시 {(5400000 * count).toLocaleString()}원 100% 환급</span>
                          </div>
                        </>
                      );
                    }

                    if (prodName.includes('498') || prodName.includes('라이즈')) {
                      const countMap: { [key: string]: number } = { 'A': 1, 'B': 2, 'C': 3, 'D': 4 };
                      const countVal = typeof formData.productCount === 'string' && countMap[formData.productCount] 
                        ? countMap[formData.productCount] 
                        : (Number(formData.productCount) || 1);
                      return (
                        <>
                          <div className="flex justify-between items-center p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                            <span className="text-xs font-bold">1~60회차 (월 납입)</span>
                            <span className="text-lg font-black text-indigo-500">{(33000 * countVal).toLocaleString()}원</span>
                          </div>
                          <div className="flex justify-between items-center p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                            <span className="text-xs font-bold">61~260회차 (월 납입)</span>
                            <span className="text-lg font-black text-indigo-500">{(15000 * countVal).toLocaleString()}원</span>
                          </div>
                          <div className="flex flex-col items-center py-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/10">
                            <span className="text-emerald-600 font-black text-sm italic">만기 시 {(4980000 * countVal).toLocaleString()}원 100% 환급</span>
                          </div>
                        </>
                      );
                    }

                    if (formData.product === '더좋은통신결합') {
                      return (
                        <>
                          <div className="flex justify-between items-center p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                            <span className="text-xs font-bold">1~36회차 통신비</span>
                            <span className="text-lg font-black text-indigo-500">
                              {formData.planName.match(/월([\d,]+)원/)?.[1] || (formData.planName.includes('79,200') ? '79,200' : '0')}원
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                            <span className="text-xs font-bold">37~{formData.planName.includes('360') ? '186' : '261'}회차 상조금</span>
                            <span className="text-lg font-black text-indigo-500">{(16000 * count).toLocaleString()}원</span>
                          </div>
                          <div className="flex flex-col items-center py-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/10 text-center">
                            <span className="text-emerald-600 font-black text-sm italic">
                              {formData.planName.includes('360')
                                ? `만기 5년예치시 ${(3600000 * count).toLocaleString()}원 환급`
                                : `만기시 ${(5400000 * count).toLocaleString()}원 환급`}
                            </span>
                          </div>
                        </>
                      );
                    }

                    if (formData.product === '좋은건강크루즈') {
                      return (
                        <>
                          <div className="flex justify-between items-center p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                            <span className="text-xs font-bold">1차 납입금</span>
                            <span className="text-lg font-black text-indigo-500">선결제 {(600000 * count).toLocaleString()}원 (건강식품)</span>
                          </div>
                          <div className="flex justify-between items-center p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                            <span className="text-xs font-bold">2차 납입금</span>
                            <span className="text-lg font-black text-indigo-500">{(27000 * count).toLocaleString()}원 (100회 납입)</span>
                          </div>
                          <div className="flex flex-col items-center py-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/10 text-center">
                            <span className="text-emerald-600 font-black text-sm italic">
                              완납 후 5년예치 시 {(3300000 * count).toLocaleString()}원 100% 환급
                            </span>
                          </div>
                        </>
                      );
                    }

                    if (formData.product?.includes('크루즈') && formData.product !== '좋은건강크루즈') {
                      return (
                        <>
                          <div className="flex justify-between items-center p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold">월 납입금 (100회)</span>
                              <span className="text-[9px] text-indigo-500 font-bold">선결제금 60만 원 제외분 납부</span>
                            </div>
                            <span className="text-lg font-black text-indigo-500">{(27000 * count).toLocaleString()}원</span>
                          </div>
                          <div className="flex flex-col items-center py-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/10 text-center">
                            <span className="text-emerald-600 font-black text-sm italic">완납 후 5년예치 만기 시 100% 전액 환급</span>
                          </div>
                        </>
                      );
                    }



                    const countVal = Number(formData.productCount) || 1;
                    return (
                      <>
                        <div className="flex justify-between items-center p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                          <span className="text-xs font-bold">신청 구좌 수</span>
                          <span className="text-lg font-black text-indigo-500">{countVal}구좌</span>
                        </div>
                        <div className="flex flex-col items-center py-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/10 text-center">
                          <span className="text-indigo-600 font-black text-sm italic">상품별 상세 납입금액 및 혜택은 약관 및 안내서를 참조해 주세요.</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={handleBack} className="flex-1 py-5 bg-card text-sub rounded-2xl font-bold border border-theme">이전</button>
                <button onClick={handleNext} className="flex-[2] py-5 bg-indigo-600 text-white rounded-2xl font-black">다음 단계</button>
              </div>
            </motion.div>
          )}

          {currentStep === 4 && (
            <motion.div
              key="step-pay-detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8 card-theme p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem]"
            >
              <div className="space-y-1 pb-2 border-b border-theme/10">
                <h2 className="text-2xl font-black italic tracking-tight">{STEPS[currentStep].title}</h2>
              </div>

              {formData.product === '좋은건강크루즈' ? (
                // --- 좋은건강크루즈 전용 결제수단 UI (1회차 & 2~101회차 분리) ---
                <div className="space-y-6">
                  {/* --- 1회차 건강보조식품 --- */}
                  <div className="space-y-3.5 p-5 bg-indigo-50/10 dark:bg-indigo-950/5 rounded-3xl border border-indigo-100/50 dark:border-indigo-950/20">
                    <h3 className="text-sm font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 border-b border-indigo-100/30 pb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                      1회차 납부방법 ({(600000 * (Number(formData.productCount) || 1)).toLocaleString()}원)
                    </h3>
                    <div className="flex bg-theme p-1 rounded-2xl border border-theme">
                      <button type="button" onClick={() => updateFormData('paymentMethod1', 'card')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${formData.paymentMethod1 === 'card' ? 'bg-indigo-600 text-white shadow-sm' : 'text-sub'}`}>카드 결제</button>
                      <button type="button" onClick={() => updateFormData('paymentMethod1', 'bank')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${formData.paymentMethod1 === 'bank' ? 'bg-indigo-600 text-white shadow-sm' : 'text-sub'}`}>계좌 이체</button>
                    </div>

                    {formData.paymentMethod1 === 'card' ? (
                      <div className="space-y-4 mt-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[12px] font-bold text-sub ml-1 flex items-center gap-1.5"><CreditCard size={14} /> 카드사</label>
                            <input type="text" placeholder="예: 현대카드" value={formData.paymentInfo1.cardCompany} onChange={(e) => updatePaymentInfo1('cardCompany', e.target.value)} className="w-full bg-theme border border-theme rounded-2xl py-4 px-5 focus:border-indigo-500 outline-none text-sm font-bold" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[12px] font-bold text-sub ml-1 flex items-center gap-1.5"><Calendar size={14} /> 유효기간</label>
                            <input
                              type="text"
                              placeholder="MM/YY"
                              maxLength={5}
                              value={formData.paymentInfo1.cardExpiry}
                              onChange={(e) => {
                                let val = e.target.value.replace(/[^0-9]/g, '');
                                if (val.length > 2) val = val.substring(0, 2) + '/' + val.substring(2, 4);
                                updatePaymentInfo1('cardExpiry', val);
                              }}
                              className="w-full bg-theme border border-theme rounded-2xl py-4 px-5 focus:border-indigo-500 outline-none text-sm font-bold"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[12px] font-bold text-sub ml-1">카드번호</label>
                          <input
                            type="text"
                            placeholder="0000-0000-0000-0000"
                            value={formData.paymentInfo1.cardNumber}
                            onChange={(e) => {
                              let val = e.target.value.replace(/[^0-9]/g, '');
                              if (val.length > 16) val = val.substring(0, 16);
                              let formatted = '';
                              for (let i = 0; i < val.length; i++) {
                                if (i > 0 && i % 4 === 0) formatted += '-';
                                formatted += val[i];
                              }
                              updatePaymentInfo1('cardNumber', formatted);
                            }}
                            className="w-full bg-theme border border-theme rounded-2xl py-4 px-5 focus:border-indigo-500 outline-none font-mono text-sm font-bold"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[12px] font-bold text-sub ml-1">할부 기간</label>
                          <select 
                            value={formData.paymentInfo1.installmentPeriod || '일시불'} 
                            onChange={(e) => updatePaymentInfo1('installmentPeriod', e.target.value)} 
                            className="w-full bg-theme border border-theme rounded-2xl py-4 px-5 focus:border-indigo-500 outline-none text-sm font-bold appearance-none bg-no-repeat bg-[right_1.25rem_center] bg-[length:1em]"
                            style={{
                              backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`
                            }}
                          >
                            <option value="일시불">일시불</option>
                            <option value="2개월">2개월</option>
                            <option value="3개월">3개월</option>
                            <option value="4개월">4개월</option>
                            <option value="5개월">5개월</option>
                            <option value="6개월">6개월</option>
                            <option value="7개월">7개월</option>
                            <option value="8개월">8개월</option>
                            <option value="9개월">9개월</option>
                            <option value="10개월">10개월</option>
                            <option value="11개월">11개월</option>
                            <option value="12개월">12개월</option>
                          </select>
                        </div>
                        {renderInstallmentGuide()}
                      </div>
                    ) : (
                      <div className="p-5 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-3xl text-center space-y-4 mt-3 shadow-inner">
                        <div className="inline-flex w-12 h-12 bg-indigo-50 dark:bg-indigo-950/30 rounded-full items-center justify-center text-indigo-600 dark:text-indigo-400">
                          <Landmark size={20} />
                        </div>
                        <div className="space-y-2">
                          <p className="text-[11px] font-bold text-sub uppercase tracking-wider">입금 계좌번호</p>
                          <div className="flex items-center justify-center gap-2 bg-theme/50 px-4 py-2.5 rounded-2xl border border-theme/60 max-w-[280px] mx-auto">
                            <span className="text-sm font-black tracking-tight text-indigo-600 dark:text-indigo-400 font-mono">국민 476101-01-413681</span>
                            <button
                              type="button"
                              onClick={handleCopyAccount}
                              className={`p-1.5 rounded-lg transition-all ${copied ? 'bg-emerald-500/10 text-emerald-500' : 'hover:bg-theme-hover text-sub hover:text-indigo-600'}`}
                              title="계좌번호 복사"
                            >
                              {copied ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                          </div>
                          <p className="text-xs font-black text-gray-800 dark:text-zinc-200">예금주: 더좋은라이프앤바이오</p>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                            납입금액: <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{(600000 * (Number(formData.productCount) || 1)).toLocaleString()}원</span> ({formData.productCount || 1}구좌 기준)
                          </p>
                        </div>

                        {/* 토스 앱 바로 송금 버튼 */}
                        <div className="pt-1">
                          <a
                            href={`supertoss://send?bank=국민&accountNo=47610101413681&amount=${600000 * (Number(formData.productCount) || 1)}`}
                            className="inline-flex w-full items-center justify-center gap-2 py-3.5 px-6 bg-[#0050ff] hover:bg-[#0040cc] text-white rounded-2xl font-black text-sm tracking-tight shadow-md transition-all hover:shadow-lg active:scale-[0.98]"
                          >
                            <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                            </svg>
                            토스 앱으로 바로 송금하기
                          </a>
                          <p className="text-[10px] text-sub mt-1.5 opacity-80">
                            * 모바일 기기에 토스 앱이 설치된 경우에만 자동으로 연동됩니다.
                          </p>
                        </div>

                        <p className="text-[11px] text-sub font-bold bg-gray-50 dark:bg-zinc-850 p-3 rounded-2xl leading-relaxed text-indigo-500">
                          ※ 1회차 상품대금은 위 계좌로 직접 입금해 주셔야 최종 접수가 완료됩니다.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* --- 2~101회차 --- */}
                  <div className="space-y-3.5 p-5 bg-indigo-50/10 dark:bg-indigo-950/5 rounded-3xl border border-indigo-100/50 dark:border-indigo-950/20">
                    <h3 className="text-sm font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 border-b border-indigo-100/30 pb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                      2~101회차 납부방법 ({(27000 * (Number(formData.productCount) || 1)).toLocaleString()}원)
                    </h3>
                    <div className="flex bg-theme p-1 rounded-2xl border border-theme">
                      <button type="button" onClick={() => updateFormData('paymentMethod2', 'card')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${formData.paymentMethod2 === 'card' ? 'bg-indigo-600 text-white shadow-sm' : 'text-sub'}`}>카드 결제</button>
                      <button type="button" onClick={() => updateFormData('paymentMethod2', 'cms')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${formData.paymentMethod2 === 'cms' ? 'bg-indigo-600 text-white shadow-sm' : 'text-sub'}`}>CMS (계좌)</button>
                    </div>

                    {formData.paymentMethod2 === 'card' ? (
                      <div className="space-y-4 mt-3">
                        {formData.paymentMethod1 === 'card' && (
                          <div className="flex items-center gap-2 mb-1 pl-1">
                            <input 
                              type="checkbox" 
                              id="sameCardCheckbox"
                              checked={isSameCard}
                              onChange={(e) => handleSameCardToggle(e.target.checked)}
                              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <label htmlFor="sameCardCheckbox" className="text-xs font-bold text-sub cursor-pointer select-none flex items-center gap-1.5">
                              1회차 카드 정보와 동일
                            </label>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[12px] font-bold text-sub ml-1 flex items-center gap-1.5"><CreditCard size={14} /> 카드사</label>
                            <input 
                              type="text" 
                              placeholder="예: 현대카드" 
                              value={formData.paymentInfo2.cardCompany} 
                              onChange={(e) => updatePaymentInfo2('cardCompany', e.target.value)} 
                              disabled={isSameCard}
                              className={`w-full bg-theme border border-theme rounded-2xl py-4 px-5 focus:border-indigo-500 outline-none text-sm font-bold ${isSameCard ? 'opacity-60 cursor-not-allowed bg-gray-50 dark:bg-zinc-800/55' : ''}`} 
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[12px] font-bold text-sub ml-1 flex items-center gap-1.5"><Calendar size={14} /> 유효기간</label>
                            <input
                              type="text"
                              placeholder="MM/YY"
                              maxLength={5}
                              value={formData.paymentInfo2.cardExpiry}
                              onChange={(e) => {
                                let val = e.target.value.replace(/[^0-9]/g, '');
                                if (val.length > 2) val = val.substring(0, 2) + '/' + val.substring(2, 4);
                                updatePaymentInfo2('cardExpiry', val);
                              }}
                              disabled={isSameCard}
                              className={`w-full bg-theme border border-theme rounded-2xl py-4 px-5 focus:border-indigo-500 outline-none text-sm font-bold ${isSameCard ? 'opacity-60 cursor-not-allowed bg-gray-50 dark:bg-zinc-800/55' : ''}`} 
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[12px] font-bold text-sub ml-1">카드번호</label>
                          <input
                            type="text"
                            placeholder="0000-0000-0000-0000"
                            value={formData.paymentInfo2.cardNumber}
                            onChange={(e) => {
                              let val = e.target.value.replace(/[^0-9]/g, '');
                              if (val.length > 16) val = val.substring(0, 16);
                              let formatted = '';
                              for (let i = 0; i < val.length; i++) {
                                if (i > 0 && i % 4 === 0) formatted += '-';
                                formatted += val[i];
                              }
                              updatePaymentInfo2('cardNumber', formatted);
                            }}
                            disabled={isSameCard}
                            className={`w-full bg-theme border border-theme rounded-2xl py-4 px-5 focus:border-indigo-500 outline-none font-mono text-sm font-bold ${isSameCard ? 'opacity-60 cursor-not-allowed bg-gray-50 dark:bg-zinc-800/55' : ''}`} 
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 mt-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[12px] font-bold text-sub ml-1 flex items-center gap-1.5"><Landmark size={14} /> 은행명</label>
                            <input type="text" list="bank-list" placeholder="예: NH농협은행, 농축협, 부산은행" value={formData.paymentInfo2.bankName} onChange={(e) => updatePaymentInfo2('bankName', e.target.value)} className="w-full bg-theme border border-theme rounded-2xl py-4 px-5 focus:border-indigo-500 outline-none text-sm font-bold" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[12px] font-bold text-sub ml-1">계좌번호</label>
                            <input type="text" placeholder="'-' 없이 숫자만" value={formData.paymentInfo2.accountNumber} onChange={(e) => updatePaymentInfo2('accountNumber', e.target.value)} className="w-full bg-theme border border-theme rounded-2xl py-4 px-5 focus:border-indigo-500 outline-none text-sm font-bold" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 결제일 */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-sub ml-1">매월 결제일</label>
                    <select value={formData.paymentDate} onChange={(e) => updateFormData('paymentDate', e.target.value)} className="w-full bg-theme border border-theme rounded-2xl py-4.5 px-6 focus:border-indigo-500 outline-none appearance-none font-bold">
                      <option value="5">매월 5일</option>
                      <option value="10">매월 10일</option>
                      <option value="15">매월 15일</option>
                      <option value="20">매월 20일</option>
                      <option value="25">매월 25일</option>
                    </select>
                  </div>
                </div>
              ) : (
                // --- 일반 상품 결제수단 UI (기존 코드) ---
                <div className="space-y-4">
                  <div className="flex bg-theme p-1 rounded-2xl border border-theme">
                    <button type="button" onClick={() => updateFormData('paymentMethod', 'card')} className={`flex-1 py-3 rounded-xl font-bold transition-all ${formData.paymentMethod === 'card' ? 'bg-indigo-600 text-white shadow-sm' : 'text-sub'}`}>카드 결제</button>
                    <button type="button" onClick={() => updateFormData('paymentMethod', 'bank')} className={`flex-1 py-3 rounded-xl font-bold transition-all ${formData.paymentMethod === 'bank' ? 'bg-indigo-600 text-white shadow-sm' : 'text-sub'}`}>계좌 이체</button>
                  </div>

                  <div className="space-y-4">
                    {formData.paymentMethod === 'card' ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[13px] font-bold text-sub ml-1 flex items-center gap-2"><CreditCard size={14} /> 카드사</label>
                            <input type="text" placeholder="예: 현대카드" value={formData.paymentInfo.cardCompany} onChange={(e) => updatePaymentInfo('cardCompany', e.target.value)} className="w-full bg-theme border border-theme rounded-2xl py-4.5 px-6 focus:border-indigo-500 outline-none text-base font-bold" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[13px] font-bold text-sub ml-1 flex items-center gap-2"><Calendar size={14} /> 유효기간</label>
                            <input
                              type="text"
                              placeholder="MM/YY"
                              maxLength={5}
                              value={formData.paymentInfo.cardExpiry}
                              onChange={(e) => {
                                let val = e.target.value.replace(/[^0-9]/g, '');
                                if (val.length > 2) val = val.substring(0, 2) + '/' + val.substring(2, 4);
                                updatePaymentInfo('cardExpiry', val);
                              }}
                              className="w-full bg-theme border border-theme rounded-2xl py-4.5 px-6 focus:border-indigo-500 outline-none text-base font-bold"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-sub ml-1">카드번호</label>
                          <input
                            type="text"
                            placeholder="0000-0000-0000-0000"
                            value={formData.paymentInfo.cardNumber}
                            onChange={(e) => {
                              let val = e.target.value.replace(/[^0-9]/g, '');
                              if (val.length > 16) val = val.substring(0, 16);
                              let formatted = '';
                              for (let i = 0; i < val.length; i++) {
                                if (i > 0 && i % 4 === 0) formatted += '-';
                                formatted += val[i];
                              }
                              updatePaymentInfo('cardNumber', formatted);
                            }}
                            className="w-full bg-theme border border-theme rounded-2xl py-4.5 px-6 focus:border-indigo-500 outline-none font-mono text-base font-bold"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[13px] font-bold text-sub ml-1 flex items-center gap-2"><Landmark size={14} /> 은행명</label>
                          <input type="text" list="bank-list" placeholder="예: NH농협은행, 농축협, 부산은행" value={formData.paymentInfo.bankName} onChange={(e) => updatePaymentInfo('bankName', e.target.value)} className="w-full bg-theme border border-theme rounded-2xl py-4.5 px-6 focus:border-indigo-500 outline-none text-base font-bold" />
                          <datalist id="bank-list">
                            <option value="NH농협은행" />
                            <option value="농축협(단위농협)" />
                            <option value="KB국민은행" />
                            <option value="신한은행" />
                            <option value="우리은행" />
                            <option value="하나은행" />
                            <option value="IBK기업은행" />
                            <option value="부산은행" />
                            <option value="대구은행(iM뱅크)" />
                            <option value="경남은행" />
                            <option value="광주은행" />
                            <option value="전북은행" />
                            <option value="제주은행" />
                            <option value="카카오뱅크" />
                            <option value="케이뱅크" />
                            <option value="토스뱅크" />
                            <option value="새마을금고" />
                            <option value="신협" />
                            <option value="우체국" />
                            <option value="수협" />
                          </datalist>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-sub ml-1">계좌번호</label>
                          <input type="text" placeholder="'-' 없이 숫자만" value={formData.paymentInfo.accountNumber} onChange={(e) => updatePaymentInfo('accountNumber', e.target.value)} className="w-full bg-theme border border-theme rounded-2xl py-4.5 px-6 focus:border-indigo-500 outline-none text-base font-bold" />
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-sub ml-1">매월 결제일</label>
                      <select value={formData.paymentDate} onChange={(e) => updateFormData('paymentDate', e.target.value)} className="w-full bg-theme border border-theme rounded-2xl py-4.5 px-6 focus:border-indigo-500 outline-none appearance-none font-bold">
                        <option value="5">매월 5일</option>
                        <option value="10">매월 10일</option>
                        <option value="15">매월 15일</option>
                        <option value="20">매월 20일</option>
                        <option value="25">매월 25일</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button onClick={handleBack} className="flex-1 py-5 bg-card text-sub rounded-2xl font-bold border border-theme">이전</button>
                <button onClick={handleNext} className="flex-[2] py-5 bg-indigo-600 text-white rounded-2xl font-black">다음 단계</button>
              </div>
            </motion.div>
          )}

          {currentStep === 5 && (
            <motion.div
              key="step-terms"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8 card-theme p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem]"
            >
              <div className="space-y-1 pb-2 border-b border-theme/10">
                <h2 className="text-2xl font-black italic tracking-tight">{STEPS[currentStep].title}</h2>
              </div>

              <div className="bg-theme border border-theme rounded-[2.5rem] overflow-hidden max-h-[350px] overflow-y-auto px-4 shadow-inner">
                <TermsAgreement
                  terms={getTermsForProduct(formData.product)}
                  onAgreementChange={(agreement) => updateFormData('agreement', agreement)}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={handleBack} className="flex-1 py-5 bg-card text-sub rounded-2xl font-bold border border-theme">이전</button>
                <button onClick={handleNext} className="flex-[2] py-5 bg-indigo-600 text-white rounded-2xl font-black">다음 단계</button>
              </div>
            </motion.div>
          )}

          {currentStep === 6 && (
            <motion.div
              key="step-signature"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8 card-theme p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem]"
            >
              <div className="space-y-1 pb-2 border-b border-theme/10">
                <h2 className="text-2xl font-black italic tracking-tight">{STEPS[currentStep].title}</h2>
              </div>

              <div className="bg-white rounded-3xl overflow-hidden border-4 border-theme shadow-2xl touch-none">
                <SignatureCanvas 
                  ref={sigCanvas} 
                  penColor="black" 
                  canvasProps={{ 
                    className: "signature-canvas w-full h-64 touch-none",
                    style: { touchAction: 'none' }
                  }} 
                />
              </div>
              <div className="flex justify-between items-center px-2">
                <button onClick={clearSignature} className="flex items-center gap-2 text-xs font-bold text-sub hover:text-indigo-500 transition-colors"><Eraser size={14} /> 서명 초기화</button>
                <div className="text-[10px] text-zinc-400 font-black uppercase tracking-widest flex items-center gap-2"><PenLine size={12} className="text-indigo-500" /> Secure Input Active</div>
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={handleBack} className="flex-1 py-5 bg-card text-sub rounded-2xl font-bold border border-theme">이전</button>
                <button onClick={handleNext} className="flex-[2] py-5 bg-indigo-600 text-white rounded-2xl font-black">서명 완료</button>
              </div>
            </motion.div>
          )}

          {currentStep === 7 && (
            <motion.div
              key="step-sales"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8 card-theme p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem]"
            >
              <div className="space-y-1 pb-2 border-b border-theme/10">
                <h2 className="text-2xl font-black italic tracking-tight">{STEPS[currentStep].title}</h2>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-sub ml-1 flex items-center gap-2"><Briefcase size={14} /> 소속</label>
                  <input type="text" placeholder="영업사원의 소속을 입력하세요" value={formData.salesAffiliation} onChange={(e) => updateFormData('salesAffiliation', e.target.value)} className="w-full bg-theme border border-theme rounded-2xl py-4.5 px-8 outline-none focus:border-indigo-500 text-base font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-sub ml-1 flex items-center gap-2"><User size={14} /> 영업사원 성함</label>
                  <div className="relative group">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 text-sub group-focus-within:text-indigo-500 transition-colors" size={18} />
                    <input type="text" placeholder="성명을 입력하세요" value={formData.salesName} onChange={(e) => updateFormData('salesName', e.target.value)} className="w-full bg-theme border border-theme rounded-2xl py-4.5 pl-12 sm:pl-14 pr-8 outline-none focus:border-indigo-500 text-base font-bold" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-sub ml-1 flex items-center gap-2"><Phone size={14} /> 영업사원 연락처 (선택)</label>
                  <div className="relative group">
                    <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-sub group-focus-within:text-indigo-500 transition-colors" size={18} />
                    <input type="tel" placeholder="010-0000-0000" value={formData.salesPhone} onChange={(e) => {
                      let val = e.target.value.replace(/[^0-9]/g, '');
                      if (val.length > 3 && val.length <= 7) val = val.substring(0, 3) + '-' + val.substring(3);
                      else if (val.length > 7) val = val.substring(0, 3) + '-' + val.substring(3, 7) + '-' + val.substring(7, 11);
                      updateFormData('salesPhone', val);
                    }} className="w-full bg-theme border border-theme rounded-2xl py-4.5 pl-12 sm:pl-14 pr-8 outline-none focus:border-indigo-500 text-base font-bold" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={handleBack} className="flex-1 py-5 bg-card text-sub rounded-2xl font-bold border border-theme">이전</button>
                <button onClick={handleNext} disabled={isSubmitting} className="flex-[2] py-5 bg-indigo-600 text-white disabled:bg-zinc-300 rounded-2xl font-black flex flex-col items-center justify-center">
                  {isSubmitting ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="animate-spin" size={24} />
                      <span className="text-[10px] font-bold text-white/60">{submittingMessage}</span>
                    </div>
                  ) : '최종 신청하기'}
                </button>
              </div>
            </motion.div>
          )}

          {currentStep === 8 && (
            <motion.div
              key="step-complete"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-indigo-600 p-16 rounded-[4rem] text-center space-y-8 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full translate-x-10 -translate-y-10" />
              <div className="inline-flex w-24 h-24 bg-white/20 rounded-[2.5rem] items-center justify-center mb-2 animate-bounce"><CheckCircle2 className="text-white" size={48} /></div>
              <div className="space-y-4">
                <h2 className="text-2xl font-black italic tracking-tighter leading-tight whitespace-nowrap" style={{ color: '#ffffff' }}>회원가입 신청 완료</h2>
                <p className="text-indigo-100 text-sm font-bold opacity-80">
                  계약서 PDF가 생성되어 자동으로 열립니다.<br />
                  열리지 않으면 아래 버튼을 눌러주세요.
                </p>
              </div>

              {createdDocumentId && (
                <div className="space-y-3">
                  <a
                    href={`/api/download?id=${createdDocumentId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-5 bg-white text-indigo-600 rounded-[2rem] font-black hover:bg-zinc-50 hover:scale-[1.02] transition-all shadow-[0_0_30px_rgba(255,255,255,0.3)] animate-pulse border-2 border-white"
                  >
                    <FileText size={20} className="animate-bounce" />
                    계약서 PDF 다운로드 (의무)
                  </a>
                  <p className="text-[11px] font-bold text-indigo-200">※ 계약 관련 중요 안내사항이 포함되어 있으니 반드시 다운로드해 주세요.</p>
                </div>
              )}

              <button onClick={() => window.location.reload()} className="w-full py-5 bg-white text-indigo-600 rounded-[2rem] font-black hover:shadow-xl transition-all">신규 신청서 작성</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <footer className="mt-20 text-[10px] text-sub font-bold uppercase tracking-[0.5em] italic">Premium Membership Platform // Advanced Digital Signing</footer>
    </div>
  );
};

export default RegistrationForm;
