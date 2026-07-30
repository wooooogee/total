import { getPrefillDataAction } from '@/app/actions';
import RegistrationForm from '@/components/RegistrationForm';
import Link from 'next/link';

interface ApplyRootPageProps {
  searchParams: Promise<{ token?: string; product?: string; skipHealthcare?: string }>;
}

export default async function ApplyRootPage({ searchParams }: ApplyRootPageProps) {
  const { token, product, skipHealthcare } = await searchParams;

  let prefillData = null;
  if (token) {
    const res = await getPrefillDataAction(token);
    if (res.success) {
      prefillData = res.data;
    }
  }

  if (token && !prefillData) {
    return (
      <div className="min-h-screen bg-theme text-theme transition-colors duration-300 flex flex-col items-center justify-center p-6 selection:bg-indigo-500/30">
        <div className="w-full max-w-md card-theme p-10 rounded-[3rem] text-center space-y-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-3xl rounded-full translate-x-10 -translate-y-10" />
          <div className="inline-flex w-20 h-20 bg-red-500/10 rounded-[2.2rem] items-center justify-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          </div>
          <div className="space-y-3">
            <h2 className="text-xl font-black italic tracking-tighter leading-tight">만료되거나 유효하지 않은 링크</h2>
            <p className="text-sub text-xs leading-relaxed font-bold opacity-80">
              요청하신 사전 신청 정보 링크가 존재하지 않거나<br />
              이미 삭제된 링크입니다. 담당자에게 문의해 주세요.
            </p>
          </div>
          <Link href="/" className="w-full block py-4.5 bg-card text-sub rounded-2xl font-bold border border-theme hover:bg-zinc-100 transition-colors">
            메인 페이지로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  if (prefillData && prefillData.status === '작성완료') {
    return (
      <div className="min-h-screen bg-theme text-theme transition-colors duration-300 flex flex-col items-center justify-center p-6 selection:bg-indigo-500/30">
        <div className="w-full max-w-md card-theme p-8 sm:p-10 rounded-[3rem] text-center space-y-7 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 blur-3xl rounded-full translate-x-10 -translate-y-10" />
          
          <div className="inline-flex w-20 h-20 bg-emerald-500/10 rounded-[2.2rem] items-center justify-center mb-1 text-emerald-500 mx-auto border border-emerald-500/20 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/20">
              작성 완료된 링크
            </span>
            <h2 className="text-xl font-black italic tracking-tight pt-2">
              이미 신청서 작성이 완료되었습니다
            </h2>
            <p className="text-sub text-xs leading-relaxed font-bold opacity-80 pt-1">
              해당 맞춤 신청 링크를 통한 가입 신청서 작성이<br />
              이미 성공적으로 완료 처리되었습니다.
            </p>
          </div>

          <div className="p-4 bg-card rounded-2xl border border-theme text-left text-xs space-y-2 font-bold">
            <div className="flex justify-between">
              <span className="text-sub">계약자명</span>
              <span className="text-indigo-600 dark:text-indigo-400">{prefillData.name} 님</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sub">신청 상품</span>
              <span>{prefillData.product} ({prefillData.productCount || 1}구좌)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sub">작성 상태</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">작성 완료</span>
            </div>
          </div>

          <Link href="/" className="w-full block py-4.5 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-colors">
            메인 페이지로 이동
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme">
      <RegistrationForm 
        initialProduct={product}
        initialSkipHealthcare={skipHealthcare === 'true'}
        initialPrefillData={prefillData}
      />
    </div>
  );
}
