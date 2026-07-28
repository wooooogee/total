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
