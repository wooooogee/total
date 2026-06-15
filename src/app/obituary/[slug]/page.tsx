import React from 'react';
import PremiumHeader from '@/components/PremiumHeader';
import Image from 'next/image';

export default function ObituaryDetailPage({ params }: { params: { slug: string } }) {
  // In a real app, you would fetch data based on the slug
  const obituary = {
    name: '김철수',
    age: 82,
    deathDate: '2026년 5월 14일',
    funeralHome: '서울성모병원 장례식장',
    funeralHall: '特1호실',
    address: '서울특별시 서초구 반포대로 222',
    burialDate: '2026년 5월 16일 오전 8시',
    burialLocation: '용인천주교묘원',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800',
    chiefMourner: '김영희, 김현수, 박지민'
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <PremiumHeader />
      
      {/* Top Section - Memorial Image */}
      <section className="pt-32 pb-12 text-center container mx-auto px-6">
        <div className="relative w-48 h-64 mx-auto mb-8 rounded-lg overflow-hidden shadow-2xl border-4 border-white/10">
          <Image 
            src={obituary.photoUrl} 
            alt={obituary.name}
            fill
            className="object-cover grayscale"
          />
        </div>
        <h2 className="text-muted-foreground tracking-[0.2em] mb-2 uppercase text-sm font-medium">삼가 고인의 명복을 빕니다</h2>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">故 {obituary.name} 님</h1>
        <p className="text-lg opacity-60 italic">"향년 {obituary.age}세, {obituary.deathDate} 별세"</p>
      </section>

      <div className="container mx-auto px-6 grid lg:grid-cols-3 gap-12">
        {/* Left/Main Column - Details */}
        <div className="lg:col-span-2 space-y-8">
          <div className="premium-card p-8 md:p-12 space-y-10">
            <section className="space-y-6">
              <h3 className="text-xl font-bold border-b border-primary/20 pb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                장례 안내
              </h3>
              <div className="grid md:grid-cols-2 gap-8 text-sm">
                <div className="space-y-4">
                  <div>
                    <label className="text-muted-foreground block mb-1">빈소</label>
                    <p className="text-lg font-medium">{obituary.funeralHome}</p>
                    <p className="text-primary font-bold">{obituary.funeralHall}</p>
                  </div>
                  <div>
                    <label className="text-muted-foreground block mb-1">장례식장 주소</label>
                    <p className="font-medium">{obituary.address}</p>
                    <button className="text-gold text-xs font-bold mt-2 hover:underline">지도 보기</button>
                  </div>
                </div>
                <div className="space-y-4 border-l border-muted pl-8">
                  <div>
                    <label className="text-muted-foreground block mb-1">발인</label>
                    <p className="text-lg font-medium">{obituary.burialDate}</p>
                  </div>
                  <div>
                    <label className="text-muted-foreground block mb-1">장지</label>
                    <p className="text-lg font-medium">{obituary.burialLocation}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="text-xl font-bold border-b border-primary/20 pb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                유가족
              </h3>
              <p className="text-lg leading-relaxed">{obituary.chiefMourner}</p>
            </section>
          </div>

          {/* Condolence Messages Section */}
          <div className="premium-card p-8 space-y-6">
            <h3 className="text-xl font-bold">조문 메시지</h3>
            <div className="space-y-4">
              <div className="bg-muted/30 p-4 rounded-xl border border-muted">
                <p className="text-sm font-medium mb-1">홍길동 <span className="text-xs text-muted-foreground ml-2">방금 전</span></p>
                <p className="text-sm opacity-80">삼가 고인의 명복을 빌며, 유가족분들께 깊은 애도를 표합니다.</p>
              </div>
              <div className="bg-muted/30 p-4 rounded-xl border border-muted">
                <p className="text-sm font-medium mb-1">이철희 <span className="text-xs text-muted-foreground ml-2">1시간 전</span></p>
                <p className="text-sm opacity-80">좋은 곳에서 편히 쉬시길 기원합니다.</p>
              </div>
            </div>
            <button className="w-full py-4 rounded-xl border border-dashed border-primary/40 text-primary font-bold hover:bg-primary/5 transition-all">
              위로의 한마디 남기기
            </button>
          </div>
        </div>

        {/* Right Column - Actions */}
        <div className="space-y-6">
          <div className="premium-card p-6 bg-secondary text-secondary-foreground sticky top-32">
            <h3 className="text-lg font-bold mb-6 text-center">마음 전하기</h3>
            <div className="space-y-3">
              <button className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg hover:bg-accent transition-all flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
                부의금 전달하기
              </button>
              <button className="w-full py-4 rounded-xl border border-primary text-primary font-bold hover:bg-primary/10 transition-all flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                근조 화환 보내기
              </button>
              <p className="text-[10px] text-center opacity-50 pt-4">
                모든 결제는 안전하게 암호화되어 보호됩니다.
              </p>
            </div>
          </div>

          <div className="premium-card p-6 border-dashed border-muted">
            <h4 className="text-sm font-bold mb-4 opacity-70">부고 공유하기</h4>
            <div className="grid grid-cols-2 gap-3">
              <button className="py-3 rounded-lg bg-[#FEE500] text-[#3c1e1e] text-xs font-bold flex items-center justify-center gap-2">
                카카오톡
              </button>
              <button className="py-3 rounded-lg border border-muted text-xs font-bold flex items-center justify-center gap-2">
                링크 복사
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
