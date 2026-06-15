'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';

interface TermItem {
  id: string;
  title: string;
  content: string;
  required: boolean;
}

interface TermsAgreementProps {
  terms: TermItem[];
  onAgreementChange: (agreements: Record<string, boolean>) => void;
}

const TermsAgreement: React.FC<TermsAgreementProps> = ({ terms, onAgreementChange }) => {
  const [agreements, setAgreements] = useState<Record<string, boolean>>(
    Object.fromEntries(terms.map((t) => [t.id, false]))
  );
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleAgreement = (id: string) => {
    const newAgreements = { ...agreements, [id]: !agreements[id] };
    setAgreements(newAgreements);
    onAgreementChange(newAgreements);
  };

  const toggleAll = () => {
    const allChecked = Object.values(agreements).every((v) => v);
    const newAgreements = Object.fromEntries(terms.map((t) => [t.id, !allChecked]));
    setAgreements(newAgreements);
    onAgreementChange(newAgreements);
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isAllChecked = Object.values(agreements).every((v) => v);

  return (
    <div className="flex flex-col gap-4 w-full p-6 bg-white">
      <div 
        onClick={toggleAll}
        className={`flex items-center gap-3 p-5 rounded-2xl cursor-pointer transition-all border ${
          isAllChecked ? 'bg-zinc-900 border-zinc-900 text-white shadow-lg' : 'bg-zinc-50 border-zinc-100 text-zinc-600 hover:border-zinc-200'
        }`}
      >
        <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all ${isAllChecked ? 'bg-white border-white' : 'border-zinc-200'}`}>
          {isAllChecked && <Check size={14} className="text-zinc-900" />}
        </div>
        <span className="font-bold">전체 약관에 동의합니다.</span>
      </div>

      <div className="space-y-3">
        {terms.map((term) => (
          <div key={term.id} className="bg-white border border-zinc-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between p-4 px-5">
              <div 
                onClick={() => toggleAgreement(term.id)}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${agreements[term.id] ? 'bg-zinc-900 border-zinc-900' : 'border-zinc-200 group-hover:border-zinc-400'}`}>
                  {agreements[term.id] && <Check size={12} className="text-white" />}
                </div>
                <span className="text-sm font-medium text-zinc-700">
                  {term.title} <span className={term.required ? 'text-indigo-600' : 'text-zinc-400'}>{term.required ? '(필수)' : '(선택)'}</span>
                </span>
              </div>
              <button 
                onClick={() => toggleExpand(term.id)}
                className="text-zinc-400 hover:text-zinc-900 transition-colors p-1"
              >
                {expanded[term.id] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>
            
            {expanded[term.id] && (
              <div className="p-5 bg-zinc-50 text-[11px] text-zinc-500 leading-relaxed border-t border-zinc-100 max-h-48 overflow-y-auto whitespace-pre-wrap">
                {term.content}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TermsAgreement;
