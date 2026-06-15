'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const PremiumHeader = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled ? 'glass-panel py-3 shadow-md' : 'bg-transparent py-6'
      }`}
    >
      <div className="container mx-auto px-6 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <span className="text-primary-foreground font-bold text-xl">B</span>
          </div>
          <span className="text-2xl font-bold tracking-tight">
            더좋은<span className="text-gold">라이프</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 font-medium text-sm tracking-wide">
          <Link href="/obituaries" className="hover:text-primary transition-colors uppercase">부고 목록</Link>
          <Link href="/services" className="hover:text-primary transition-colors uppercase">라이프케어</Link>
          <Link href="/support" className="hover:text-primary transition-colors uppercase">고객센터</Link>
          <Link 
            href="/create" 
            className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full hover:bg-accent transition-all shadow-lg hover:shadow-primary/20 active:scale-95"
          >
            부고장 생성
          </Link>
        </nav>

        <button className="md:hidden text-foreground p-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
      </div>
    </header>
  );
};

export default PremiumHeader;
