import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface ObituaryCardProps {
  id: string;
  name: string;
  funeralHome: string;
  burialDate: string;
  photoUrl: string;
  slug: string;
}

const ObituaryCard: React.FC<ObituaryCardProps> = ({ name, funeralHome, burialDate, photoUrl, slug }) => {
  return (
    <Link href={`/obituary/${slug}`} className="premium-card overflow-hidden group block">
      <div className="relative h-64 w-full">
        <Image 
          src={photoUrl || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=600'} 
          alt={name}
          fill
          className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent"></div>
        <div className="absolute bottom-4 left-4">
          <span className="bg-primary/90 text-primary-foreground text-[10px] uppercase tracking-widest px-3 py-1 rounded-full font-bold">
            Digital Obituary
          </span>
        </div>
      </div>
      
      <div className="p-6 space-y-3">
        <h3 className="text-2xl font-bold">故 {name}</h3>
        <div className="space-y-1.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            <span>{funeralHome}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            <span>발인: {burialDate}</span>
          </div>
        </div>
        
        <div className="pt-4 flex justify-between items-center border-t border-muted">
          <span className="text-[10px] uppercase font-bold tracking-tighter opacity-40">Better Life Premium</span>
          <div className="text-gold flex items-center gap-1 text-sm font-bold group-hover:gap-2 transition-all">
            자세히 보기
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ObituaryCard;
