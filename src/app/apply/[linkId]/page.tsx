import { getLinkConfigsFromSheet } from '@/lib/googleSheets';
import { getLinkConfigs } from '@/lib/db';
import RegistrationForm from '@/components/RegistrationForm';
import Link from 'next/link';

interface ApplyPageProps {
  params: Promise<{ linkId: string }>;
}

export default async function ApplyPage({ params }: ApplyPageProps) {
  const { linkId } = await params;

  // 1. Google Sheets에서 링크 설정 가져오기 시도
  let configs = await getLinkConfigsFromSheet();
  
  // 2. Google Sheets에 설정이 없거나 에러가 났다면 로컬 DB에서 가져오기
  if (!configs || configs.length === 0) {
    configs = getLinkConfigs();
  }

  const currentConfig = configs.find(c => c.id === linkId && c.isActive);

  if (!currentConfig) {
    return (
      <div className="min-h-screen bg-theme text-theme transition-colors duration-300 flex flex-col items-center justify-center p-6 selection:bg-indigo-500/30">
        <div className="w-full max-w-md card-theme p-10 rounded-[3rem] text-center space-y-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-3xl rounded-full translate-x-10 -translate-y-10" />
          <div className="inline-flex w-20 h-20 bg-red-500/10 rounded-[2.2rem] items-center justify-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          </div>
          <div className="space-y-3">
            <h2 className="text-xl font-black italic tracking-tighter leading-tight">유효하지 않은 신청 링크</h2>
            <p className="text-sub text-xs leading-relaxed font-bold opacity-80">
              접속하신 링크 정보가 존재하지 않거나,<br />
              비활성화 상태입니다. 관리자에게 문의해 주세요.
            </p>
          </div>
          <Link href="/" className="w-full block py-4.5 bg-card text-sub rounded-2xl font-bold border border-theme hover:bg-zinc-100 transition-colors">
            메인 페이지로 돌아가기
          </Link>
        </div>
        <footer className="mt-12 text-[9px] text-sub font-bold uppercase tracking-[0.5em] italic opacity-60">Premium Sign Platform</footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme">
      <RegistrationForm 
        allowedProducts={currentConfig.products} 
        linkId={linkId} 
      />
    </div>
  );
}
