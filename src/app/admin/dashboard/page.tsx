'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Link2, Plus, Trash2, Check, Copy, ExternalLink, RefreshCw, 
  Search, UserCheck, LayoutDashboard, Loader2, FileText, Settings, Award, ChevronRightIcon,
  X, Eye, Download, Lock
} from 'lucide-react';

interface LinkConfig {
  id: string;
  title: string;
  products: string[];
  isActive: boolean;
  createdAt: string;
}

interface ProductConfig {
  id: string;
  name: string;
  totalPrice: string;
  monthlyPayment1: string;
  monthlyPayment2: string;
  refundNotice: string;
  eformTemplateId: string;
  productNoticeTerm: string;
  privacyTerm: string;
  thirdPartyTerm: string;
  marketingTerm: string;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'links' | 'logs' | 'products'>('links');
  
  // 인증 상태
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  // PDF 모달 상태
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [selectedPdfId, setSelectedPdfId] = useState<string | null>(null);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);

  const handleDownloadAsImage = async () => {
    if (!selectedPdfId) return;
    
    try {
      setIsDownloadingImage(true);
      const response = await fetch(`/api/download?id=${selectedPdfId}&action=download`);
      if (!response.ok) throw new Error('Failed to fetch PDF');
      
      const arrayBuffer = await response.arrayBuffer();
      
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
      
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      const page = await pdf.getPage(1);
      
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) throw new Error('No canvas context');
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      await page.render({
        canvasContext: context,
        viewport: viewport
      } as any).promise;
      
      // Convert to JPG (0.6 quality for < 300kb)
      const imageUrl = canvas.toDataURL('image/jpeg', 0.6);
      
      const a = document.createElement('a');
      a.href = imageUrl;
      a.download = `contract_${selectedPdfId}.jpg`;
      a.click();
    } catch (error) {
      console.error('Error downloading image:', error);
      alert('이미지 다운로드 중 오류가 발생했습니다.');
    } finally {
      setIsDownloadingImage(false);
    }
  };
  
  // 동적 링크 상태
  const [links, setLinks] = useState<LinkConfig[]>([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(true);
  
  // 신규 링크 입력 폼 상태
  const [newLinkId, setNewLinkId] = useState('');
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [isSubmittingLink, setIsSubmittingLink] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 신청 로그 상태
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sheetFilter, setSheetFilter] = useState('ALL');

  // 상품 설정 상태
  const [products, setProducts] = useState<ProductConfig[]>([]);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<ProductConfig | null>(null);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);

  // 링크 데이터 가져오기
  const fetchLinks = async () => {
    setIsLoadingLinks(true);
    try {
      const res = await fetch('/api/links');
      if (res.ok) {
        const data = await res.json();
        setLinks(data);
      }
    } catch (err) {
      console.error('Failed to fetch links:', err);
    } finally {
      setIsLoadingLinks(false);
    }
  };

  // 신청 내역 가져오기
  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch('/api/apply-logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // 상품 정보 가져오기
  const fetchProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = (await res.json()) as ProductConfig[];
        setProducts(data);
        if (data.length > 0) {
          setSelectedProductForEdit(prev => {
            if (prev && !isAddingProduct) {
              const updated = data.find(p => p.id === prev.id);
              return updated || data[0];
            }
            return data[0];
          });
          setIsAddingProduct(false);
        }
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchLinks();
    fetchLogs();
    fetchProducts();
  }, []);

  // 링크 복사 핸들러
  const handleCopyLink = (id: string) => {
    const url = `${window.location.origin}/apply/${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 링크 생성 핸들러
  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLinkId || !newLinkTitle || selectedProducts.length === 0) {
      alert('모든 필드를 채워주세요.');
      return;
    }

    setIsSubmittingLink(true);
    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newLinkId.trim().toUpperCase(),
          title: newLinkTitle,
          products: selectedProducts,
          isActive: true
        })
      });

      if (res.ok) {
        setNewLinkId('');
        setNewLinkTitle('');
        setSelectedProducts([]);
        fetchLinks();
      } else {
        const err = await res.json();
        alert(err.error || '링크 생성에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('오류가 발생했습니다.');
    } finally {
      setIsSubmittingLink(false);
    }
  };

  // 링크 토글 활성화
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/links/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      if (res.ok) {
        fetchLinks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 링크 삭제
  const handleDeleteLink = async (id: string) => {
    if (!confirm('정말로 이 링크 설정을 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/links/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchLinks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 상품 체크박스 토글
  const handleProductToggle = (product: string) => {
    setSelectedProducts(prev => 
      prev.includes(product) ? prev.filter(p => p !== product) : [...prev, product]
    );
  };

  // 상품 상세 설정 저장 / 등록
  const handleSaveProductConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForEdit) return;
    if (!selectedProductForEdit.id.trim()) {
      alert('상품 식별자(ID)를 입력해 주세요.');
      return;
    }

    setIsSavingProduct(true);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedProductForEdit)
      });

      if (res.ok) {
        alert(isAddingProduct ? '신규 상품이 성공적으로 등록되었습니다.' : '상품 정보와 약관이 저장되었습니다.');
        setIsAddingProduct(false);
        fetchProducts();
      } else {
        const err = await res.json();
        alert(err.error || '상품 저장에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('저장 도중 오류가 발생했습니다.');
    } finally {
      setIsSavingProduct(false);
    }
  };

  // 상품 삭제 핸들러
  const handleDeleteProduct = async (id: string) => {
    if (!confirm(`정말로 '${id}' 상품을 완전히 삭제하시겠습니까?\n이 상품을 노출하는 링크 화면에 더 이상 상품이 표시되지 않습니다.`)) return;

    try {
      const res = await fetch(`/api/products?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        alert('상품이 성공적으로 삭제되었습니다.');
        setSelectedProductForEdit(null);
        setIsAddingProduct(false);
        fetchProducts();
      } else {
        const err = await res.json();
        alert(err.error || '상품 삭제에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('삭제 도중 오류가 발생했습니다.');
    }
  };

  // 편집 필드 업데이트 헬퍼
  const updateEditField = (field: keyof ProductConfig, value: string) => {
    if (!selectedProductForEdit) return;
    
    // 만약 ID(식별자)를 바꾼다면 상품명(name)도 기본적으로 동조화시킴
    if (field === 'id') {
      setSelectedProductForEdit({
        ...selectedProductForEdit,
        id: value,
        name: value
      });
    } else {
      setSelectedProductForEdit({
        ...selectedProductForEdit,
        [field]: value
      });
    }
  };

  // 필터링된 로그 목록
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      (log['계약자'] && log['계약자'].includes(searchTerm)) ||
      (log['연락처'] && log['연락처'].includes(searchTerm)) ||
      (log['영업자'] && log['영업자'].includes(searchTerm)) ||
      (log['상품명'] && log['상품명'].includes(searchTerm));
      
    const matchesSheet = sheetFilter === 'ALL' || log['시트구분'] === sheetFilter;
    return matchesSearch && matchesSheet;
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === '880805') {
      setIsAuthenticated(true);
    } else {
      alert('비밀번호가 일치하지 않습니다.');
      setPasswordInput('');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 w-full max-w-sm space-y-8">
          <div className="text-center space-y-3">
            <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <Lock size={24} />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-800">통합 신청 시스템</h1>
              <p className="text-[10px] font-bold text-slate-400 tracking-widest mt-1">관리자 접근을 위해 비밀번호를 입력해주세요</p>
            </div>
          </div>
          <div className="space-y-4">
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-center tracking-widest text-lg font-black text-slate-800 focus:border-indigo-600 focus:outline-none transition-colors"
              placeholder="••••••"
              autoFocus
            />
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3.5 font-black text-sm transition-colors shadow-sm">
              시스템 접속하기
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-40 px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/15">
            <LayoutDashboard className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight flex items-center gap-1.5 text-slate-900">
              통합 신청 시스템 <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">관리자 대시보드</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">PREMIUM ADMIN PANEL V3</p>
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex bg-slate-100 border border-slate-200/60 p-1 rounded-2xl self-start md:self-center">
          <button 
            onClick={() => setActiveTab('links')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'links' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/20' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'}`}
          >
            <Link2 size={14} /> 신청 링크 매니저
          </button>
          <button 
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'products' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/20' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'}`}
          >
            <Settings size={14} /> 상품/약관 매니저
          </button>
          <button 
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'logs' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/20' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'}`}
          >
            <UserCheck size={14} /> 통합 신청 내역
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-8">
        <AnimatePresence mode="wait">
          {activeTab === 'links' && (
            <motion.div
              key="tab-links"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid lg:grid-cols-3 gap-8 items-start"
            >
              {/* 링크 생성 폼 */}
              <div className="lg:col-span-1 bg-white border border-slate-200 p-8 rounded-[2.5rem] space-y-6 shadow-sm">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Plus size={18} />
                  </div>
                  <h2 className="text-md font-black text-slate-850">신규 가입신청 링크 생성</h2>
                </div>

                <form onSubmit={handleCreateLink} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">링크 고유 식별자 (ID)</label>
                    <input 
                      type="text" 
                      placeholder="예: A (영문/숫자)" 
                      value={newLinkId} 
                      onChange={(e) => setNewLinkId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white outline-none rounded-xl py-3 px-4 text-sm font-bold text-slate-800 placeholder:text-slate-400 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">링크 명칭/설명</label>
                    <input 
                      type="text" 
                      placeholder="예: 라이즈 및 크루즈 전용 링크" 
                      value={newLinkTitle} 
                      onChange={(e) => setNewLinkTitle(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white outline-none rounded-xl py-3 px-4 text-sm font-bold text-slate-800 placeholder:text-slate-400 transition-all"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">노출할 상품 선택 (다중 선택)</label>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1 border border-slate-200 p-3 rounded-xl bg-slate-50/50">
                      {products.map(prod => (
                        <label key={prod.id} className="flex items-center gap-3 p-2 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors text-xs font-bold text-slate-700">
                          <input 
                            type="checkbox" 
                            checked={selectedProducts.includes(prod.id)}
                            onChange={() => {
                              setSelectedProducts(prev => 
                                prev.includes(prod.id) ? prev.filter(p => p !== prod.id) : [...prev, prod.id]
                              );
                            }}
                            className="accent-indigo-600 w-4.5 h-4.5 rounded"
                          />
                          {prod.name}
                        </label>
                      ))}
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isSubmittingLink}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white rounded-xl font-black text-sm transition-all shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2"
                  >
                    {isSubmittingLink ? <Loader2 className="animate-spin" size={16} /> : '가입신청 링크 생성'}
                  </button>
                </form>
              </div>

              {/* 링크 목록 */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-md font-black flex items-center gap-2 text-slate-900">
                    활성화된 가입 링크 <span className="text-xs bg-indigo-50 border border-indigo-100 text-indigo-600 px-2.5 py-0.5 rounded-full font-bold">{links.length}개</span>
                  </h2>
                  <button onClick={fetchLinks} className="p-2.5 border border-slate-200 bg-white rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors shadow-sm">
                    <RefreshCw size={14} />
                  </button>
                </div>

                {isLoadingLinks ? (
                  <div className="space-y-4">
                    {[1, 2].map(i => <div key={i} className="h-32 bg-white border border-slate-200 animate-pulse rounded-[2rem]"></div>)}
                  </div>
                ) : links.length === 0 ? (
                  <div className="bg-white border border-slate-200 p-16 rounded-[2.5rem] text-center space-y-4 shadow-sm">
                    <p className="text-slate-400 font-bold text-sm">등록된 신청 링크가 없습니다.</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {links.map(link => (
                      <div key={link.id} className="bg-white border border-slate-200 p-6 rounded-[2rem] flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:border-indigo-200/80 shadow-sm hover:shadow-md">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xs font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-xl shadow-sm">
                              ID: {link.id}
                            </span>
                            <h3 className="text-sm font-black text-slate-800">{link.title}</h3>
                          </div>
                          
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {link.products.map(p => (
                              <span key={p} className="text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-200/80 px-2 py-0.5 rounded-md">
                                {p}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end md:self-center">
                          <button 
                            onClick={() => handleToggleActive(link.id, link.isActive)}
                            className={`px-3 py-2 rounded-xl text-[10px] font-black border transition-all ${
                              link.isActive 
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-sm' 
                                : 'bg-slate-100 border-slate-200 text-slate-400'
                            }`}
                          >
                            {link.isActive ? '사용중' : '중지됨'}
                          </button>
                          
                          <button 
                            onClick={() => handleCopyLink(link.id)}
                            className="p-3 bg-slate-50 border border-slate-200 hover:border-slate-350 rounded-xl hover:bg-white text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center shadow-sm"
                            title="신청 링크 주소 복사"
                          >
                            {copiedId === link.id ? <Check className="text-emerald-500" size={14} /> : <Copy size={14} />}
                          </button>
                          
                          <a 
                            href={`/apply/${link.id}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-3 bg-slate-50 border border-slate-200 hover:border-slate-350 rounded-xl hover:bg-white text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center shadow-sm"
                            title="링크 직접 테스트 접속"
                          >
                            <ExternalLink size={14} />
                          </a>

                          <button 
                            onClick={() => handleDeleteLink(link.id)}
                            className="p-3 bg-slate-50 border border-slate-200 hover:border-red-400 rounded-xl hover:bg-red-50 text-slate-500 hover:text-red-500 transition-colors flex items-center justify-center shadow-sm"
                            title="링크 설정 삭제"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'products' && (
            <motion.div
              key="tab-products"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid lg:grid-cols-4 gap-8 items-start"
            >
              {/* 왼쪽: 상품 리스트 선택 */}
              <div className="lg:col-span-1 bg-white border border-slate-200 p-6 rounded-[2.5rem] space-y-4 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Award size={18} className="text-indigo-600" />
                    <h3 className="text-sm font-black text-slate-800">대상 상품 목록</h3>
                  </div>
                  <button onClick={fetchProducts} className="p-1.5 border border-slate-100 rounded-lg hover:bg-slate-55 text-slate-400 hover:text-slate-600 transition-colors">
                    <RefreshCw size={12} />
                  </button>
                </div>
                {isLoadingProducts ? (
                  <div className="space-y-2 py-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-100 animate-pulse rounded-xl"></div>)}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {products.map(prod => (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => {
                          setSelectedProductForEdit(prod);
                          setIsAddingProduct(false);
                        }}
                        className={`w-full text-left py-3.5 px-4 rounded-2xl text-xs font-black transition-all flex items-center justify-between border ${
                          selectedProductForEdit?.id === prod.id && !isAddingProduct
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm'
                            : 'bg-white border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                        }`}
                      >
                        <span>{prod.name}</span>
                        <ChevronRightIcon size={12} className={selectedProductForEdit?.id === prod.id && !isAddingProduct ? 'text-indigo-500' : 'text-slate-350'} />
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProductForEdit({
                          id: '',
                          name: '',
                          totalPrice: '',
                          monthlyPayment1: '',
                          monthlyPayment2: '',
                          refundNotice: '',
                          eformTemplateId: '',
                          productNoticeTerm: '',
                          privacyTerm: '',
                          thirdPartyTerm: '',
                          marketingTerm: ''
                        });
                        setIsAddingProduct(true);
                      }}
                      className="w-full mt-4 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-dashed border-indigo-200 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5"
                    >
                      <Plus size={14} /> 신규 상품 등록
                    </button>
                  </div>
                )}
              </div>

              {/* 오른쪽: 상세 편집 폼 */}
              <div className="lg:col-span-3">
                {selectedProductForEdit ? (
                  <form onSubmit={handleSaveProductConfig} className="bg-white border border-slate-200 p-8 rounded-[2.5rem] space-y-6 shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div>
                        <h3 className="text-md font-black text-slate-900">
                          {isAddingProduct ? '신규 상품 등록' : `${selectedProductForEdit.name} 설정`}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                          {isAddingProduct 
                            ? '신청서 화면에 노출될 새로운 상품 정보 및 약관, 이폼사인 템플릿 ID를 새로 생성합니다.'
                            : '신청서 폼 내에 표시될 약관 문구와 요금 세부사항을 수정합니다.'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {!isAddingProduct && (
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(selectedProductForEdit.id)}
                            className="px-4 py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-650 rounded-xl font-black text-xs transition-all flex items-center gap-1.5"
                            title="상품 삭제"
                          >
                            <Trash2 size={14} /> 상품 삭제
                          </button>
                        )}
                        <button
                          type="submit"
                          disabled={isSavingProduct}
                          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white rounded-xl font-black text-xs transition-all shadow-md shadow-indigo-600/10 flex items-center gap-1.5"
                        >
                          {isSavingProduct ? <Loader2 className="animate-spin" size={14} /> : isAddingProduct ? '신규 상품 등록' : '설정 저장'}
                        </button>
                      </div>
                    </div>

                    {/* 요금 및 식별자 정보 그룹 */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest">1. 기본 정보 및 요금/이폼사인 연동</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500">상품 고유 식별자 (ID)</label>
                          <input
                            type="text"
                            value={selectedProductForEdit.id}
                            onChange={(e) => updateEditField('id', e.target.value)}
                            disabled={!isAddingProduct}
                            placeholder="예: 더좋은라이즈498 (공백없이 입력)"
                            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white outline-none rounded-xl py-2.5 px-4 text-xs font-bold text-slate-800 transition-all disabled:bg-slate-100 disabled:text-slate-400"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500">이폼사인 템플릿 ID (e-FormSign Template ID)</label>
                          <input
                            type="text"
                            value={selectedProductForEdit.eformTemplateId}
                            onChange={(e) => updateEditField('eformTemplateId', e.target.value)}
                            placeholder="예: 413d37beb6e8476498026303b14a6718"
                            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white outline-none rounded-xl py-2.5 px-4 text-xs font-bold text-slate-805 transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500">총 상품 금액 (예: 498만원)</label>
                          <input
                            type="text"
                            value={selectedProductForEdit.totalPrice}
                            onChange={(e) => updateEditField('totalPrice', e.target.value)}
                            placeholder="예: 498만원"
                            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white outline-none rounded-xl py-2.5 px-4 text-xs font-bold text-slate-800 transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500">만기 환급금 안내 문구</label>
                          <input
                            type="text"
                            value={selectedProductForEdit.refundNotice}
                            onChange={(e) => updateEditField('refundNotice', e.target.value)}
                            placeholder="예: 만기 시 498만원 100% 환급"
                            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white outline-none rounded-xl py-2.5 px-4 text-xs font-bold text-slate-800 transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500">1차 납입 요금 안내 (예: 35,000원 (1~60회))</label>
                          <input
                            type="text"
                            value={selectedProductForEdit.monthlyPayment1}
                            onChange={(e) => updateEditField('monthlyPayment1', e.target.value)}
                            placeholder="예: 35,000원 (1~60회)"
                            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white outline-none rounded-xl py-2.5 px-4 text-xs font-bold text-slate-800 transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500">2차 납입 요금 안내 (예: 16,000원 (61~240회))</label>
                          <input
                            type="text"
                            value={selectedProductForEdit.monthlyPayment2}
                            onChange={(e) => updateEditField('monthlyPayment2', e.target.value)}
                            placeholder="예: 16,000원 (61~240회) / 없을 경우 비워둠"
                            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white outline-none rounded-xl py-2.5 px-4 text-xs font-bold text-slate-800 transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <hr className="border-slate-100" />

                    {/* 약관 정보 그룹 */}
                    <div className="space-y-5">
                      <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest">2. 가입 약관 내용 에디터</h4>
                      
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-700 block">1. 상품내용고지 약관 (필수)</label>
                        <textarea
                          rows={6}
                          value={selectedProductForEdit.productNoticeTerm}
                          onChange={(e) => updateEditField('productNoticeTerm', e.target.value)}
                          placeholder="가입 신청 폼 1번 단계에서 노출될 상품 세부 고지 내용입니다."
                          className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white outline-none rounded-xl py-3 px-4 text-xs font-medium text-slate-700 transition-all"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-700 block">2. 개인정보 수집·이용 약관 (필수)</label>
                        <textarea
                          rows={6}
                          value={selectedProductForEdit.privacyTerm}
                          onChange={(e) => updateEditField('privacyTerm', e.target.value)}
                          placeholder="개인정보 수집 및 이용 목적, 수집 항목, 보유 기간 안내문입니다."
                          className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white outline-none rounded-xl py-3 px-4 text-xs font-medium text-slate-700 transition-all"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-700 block">3. 제3자 제공 동의 약관 (필수)</label>
                        <textarea
                          rows={6}
                          value={selectedProductForEdit.thirdPartyTerm}
                          onChange={(e) => updateEditField('thirdPartyTerm', e.target.value)}
                          placeholder="금융기관, 공제조합 및 제휴사에 정보가 제공되는 것에 대한 동의 사항입니다."
                          className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white outline-none rounded-xl py-3 px-4 text-xs font-medium text-slate-700 transition-all"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-700 block">4. 마케팅 정보 제공 동의 약관 (선택)</label>
                        <textarea
                          rows={4}
                          value={selectedProductForEdit.marketingTerm}
                          onChange={(e) => updateEditField('marketingTerm', e.target.value)}
                          placeholder="신규 이벤트 및 제휴 혜택 마케팅 수신동의에 관한 조항입니다."
                          className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white outline-none rounded-xl py-3 px-4 text-xs font-medium text-slate-700 transition-all"
                        />
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="bg-white border border-slate-200 p-20 rounded-[2.5rem] text-center shadow-sm">
                    <p className="text-slate-400 font-bold text-sm">수정할 상품을 왼쪽 목록에서 선택하거나, 신규 상품을 등록해 주세요.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'logs' && (
            <motion.div
              key="tab-logs"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* 필터 및 검색 바 */}
              <div className="bg-white border border-slate-200 p-6 rounded-[2rem] flex flex-col lg:flex-row gap-4 items-center justify-between shadow-sm">
                <div className="relative w-full lg:max-w-md group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={16} />
                  <input 
                    type="text" 
                    placeholder="계약자명, 연락처, 상품명, 영업사원 검색" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white outline-none rounded-xl py-3 pl-11 pr-4 text-xs font-bold text-slate-800 placeholder:text-slate-400 transition-all"
                  />
                </div>

                <div className="flex flex-wrap gap-2 w-full lg:w-auto items-center">
                  <div className="flex bg-slate-100 border border-slate-200 p-1 rounded-xl overflow-x-auto max-w-full font-sans">
                    {['ALL', '하이브리드698', '프리미엄540', '라이즈498', '크루즈', '굿라이프헬스케어', '헬스케어580', '통신결합'].map(sheet => (
                      <button 
                        key={sheet}
                        onClick={() => setSheetFilter(sheet)}
                        className={`px-3 py-2 rounded-lg text-[10px] font-black transition-all whitespace-nowrap ${sheetFilter === sheet ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        {sheet === 'ALL' ? '전체' : sheet}
                      </button>
                    ))}
                  </div>
                  <button onClick={fetchLogs} className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-white text-slate-400 hover:text-slate-650 transition-colors shadow-sm">
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>

              {/* 신청 내역 테이블 */}
              {isLoadingLogs ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white border border-slate-200 animate-pulse rounded-2xl"></div>)}
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="bg-white border border-slate-200 p-20 rounded-[2.5rem] text-center shadow-sm">
                  <p className="text-slate-400 font-bold text-sm">신청 현황 기록이 존재하지 않습니다.</p>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                          <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-wider">신청일시</th>
                          <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-wider">헬스케어 대상자</th>
                          <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-wider">계약자 정보</th>
                          <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-wider">상품 및 구좌</th>
                          <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-wider">결제 구분</th>
                          <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">결제일</th>
                          <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-wider">영업 담당</th>
                          <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-wider">PDF 문서</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredLogs.map((log, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors text-xs font-bold text-slate-700">
                            <td className="p-5 whitespace-nowrap text-slate-400 font-mono">
                              {log['신청일시'] || '-'}
                            </td>
                            <td className="p-5 whitespace-nowrap">
                              {log['_targets'] && log['_targets'].length > 0 ? (
                                <div className="flex flex-col gap-0.5">
                                  {log['_targets'].map((t: string, tIdx: number) => (
                                    <span key={tIdx} className="text-slate-600 font-normal">{t}</span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-400 font-bold">-</span>
                              )}
                            </td>
                            <td className="p-5 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="text-slate-900 font-black text-sm">{log['계약자'] || log['성명'] || '-'}</span>
                                <span className="text-[10px] text-slate-400 mt-0.5 font-normal">{log['연락처'] || '-'}</span>
                              </div>
                            </td>
                            <td className="p-5">
                              <div className="flex flex-col">
                                <span className="text-slate-800 font-black">{log['상품명'] || '-'}</span>
                                <span className="text-[10px] text-slate-400 mt-0.5 font-normal">
                                  구좌: {log['구좌수'] || log['수량'] || '-'} {log['제품명'] && `// 제품: ${log['제품명']}`}
                                </span>
                              </div>
                            </td>
                            <td className="p-5 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="text-slate-700">{log['결제정보(카드/cms)'] || log['결제수단'] || '-'}</span>
                                <span className="text-[10px] text-slate-400 mt-0.5 font-normal">
                                  {log['카드사/은행명'] || log['결제기관'] || ''}
                                </span>
                              </div>
                            </td>
                            <td className="p-5 whitespace-nowrap text-slate-700">
                              {log['결제일'] || '-'}
                            </td>
                            <td className="p-5 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="text-slate-700">{log['영업자'] || log['영업담당'] || '-'}</span>
                                <span className="text-[10px] text-slate-400 mt-0.5 font-normal">
                                  {(() => {
                                    const aff = log['영업자소속'] || log['영업소속'] || '';
                                    if (!aff) return '본인섭외-';
                                    return aff.startsWith('본인섭외-') ? aff : `본인섭외-${aff}`;
                                  })()}
                                </span>
                              </div>
                            </td>
                            <td className="p-5 whitespace-nowrap">
                              {log['document_id'] ? (
                                <button 
                                  onClick={() => { setSelectedPdfId(log['document_id']); setPdfModalOpen(true); }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-150 text-indigo-600 hover:bg-indigo-650 hover:text-white hover:border-transparent rounded-lg transition-all text-[10px] font-black shadow-sm"
                                >
                                  <FileText size={12} /> 계약서 보기
                                </button>
                              ) : (
                                <span className="text-slate-400 font-bold">서명 미완료</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* PDF 모달 */}
      <AnimatePresence>
        {pdfModalOpen && selectedPdfId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setPdfModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-[2rem] w-full max-w-5xl h-[95vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800">계약서 확인</h3>
                    <p className="text-[10px] font-bold text-slate-400">PDF 원본 문서를 열람하거나 다운로드합니다.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href={`/api/download?id=${selectedPdfId}&action=download`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl text-xs font-black transition-colors"
                  >
                    <Download size={14} /> PDF 원본
                  </a>
                  <button
                    onClick={handleDownloadAsImage}
                    disabled={isDownloadingImage}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl text-xs font-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDownloadingImage ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} 
                    {isDownloadingImage ? '다운로드 중...' : '이미지로 다운로드'}
                  </button>
                  <button 
                    onClick={() => setPdfModalOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 bg-slate-100/50 relative overflow-hidden">
                <iframe 
                  src={`/api/download?id=${selectedPdfId}#view=FitV`} 
                  className="w-full h-full border-0"
                  title="PDF Viewer"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
