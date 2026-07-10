'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Link2, Plus, Trash2, Check, Copy, ExternalLink, RefreshCw, 
  Search, UserCheck, LayoutDashboard, Loader2, FileText, Settings, Award, ChevronRightIcon,
  X, Eye, Download, Lock, ChevronDown, ChevronLeft, ChevronRight, BarChart2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';

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
  monthlyPayment1Title?: string;
  monthlyPayment1: string;
  monthlyPayment2Title?: string;
  monthlyPayment2: string;
  refundNotice: string;
  eformTemplateId: string;
  targetSheetName?: string;
  productNoticeTerm: string;
  privacyTerm: string;
  thirdPartyTerm: string;
  marketingTerm: string;
}

const KLJ_DEFAULT_TEMPLATE = `송하인\\t수취인\\t진화번호\\t주소\\t상품명\\t상품옵션\\t수량\\t공급가\n더홈온라이프\\t{고객명}\\t{연락처}\\t{주소}\\t{제품명}\\t\\t1\\t{공급가}`;

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'links' | 'logs' | 'products' | 'orders'>('logs');
  
  // 인증 상태
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  // PDF 모달 상태
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [selectedPdfId, setSelectedPdfId] = useState<string | null>(null);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [bulkDownloadProgress, setBulkDownloadProgress] = useState({ current: 0, total: 0 });

  const getFormattedFileName = (log: any) => {
    if (!log) return '';
    let dateStr = '';
    if (log['신청일시']) {
      const match = String(log['신청일시']).match(/(\d{4})[\.\-\/]\s*(\d{1,2})[\.\-\/]\s*(\d{1,2})/);
      if (match) {
        dateStr = `${match[1]}${match[2].padStart(2, '0')}${match[3].padStart(2, '0')}`;
      } else {
        dateStr = String(log['신청일시']).split(' ')[0].replace(/[^0-9]/g, '');
      }
    }
    const productName = log['상품명'] || '';
    const contractorName = log['계약자'] || log['성명'] || '';
    
    const parts = [dateStr, productName, contractorName].filter(Boolean);
    return parts.length > 0 ? parts.join('_') : `contract_${log['document_id'] || ''}`;
  };

  const handleDownloadAsImage = async (documentId?: string | React.MouseEvent, fileName?: string) => {
    const targetId = typeof documentId === 'string' ? documentId : selectedPdfId;
    if (!targetId) return;
    
    try {
      setIsDownloadingImage(true);
      const response = await fetch(`/api/download?id=${targetId}&action=download`);
      if (!response.ok) throw new Error('Failed to fetch PDF');
      
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      const pdfjsLib = await import('pdfjs-dist');
      
      // Use unpkg to get the worker file
      const pdfjsVersion = pdfjsLib.version || '4.0.379';
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.mjs`;
      
      const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
      const pdf = await loadingTask.promise;
      
      // 사용자 요청에 따라 1페이지만 가져옵니다.
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
      a.download = fileName && typeof fileName === 'string' ? `${fileName}.jpg` : `contract_${targetId}_page1.jpg`;
      a.click();
    } catch (error: any) {
      console.error('Error downloading image:', error);
      alert(`이미지 다운로드 중 오류가 발생했습니다: ${error.message || error}`);
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
  const [expandedLinks, setExpandedLinks] = useState<{ [key: string]: boolean }>({});

  const toggleProductLinks = (id: string) => {
    setExpandedLinks(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // 신청 로그 상태
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const AVAILABLE_SHEETS = ['하이브리드698', '프리미엄540', '라이즈498', '크루즈', '굿라이프헬스케어', '굿라이프헬스케어골드', '굿라이프헬스케어실버', '골드', '실버', '헬스케어580', '통신결합'];
  const [startDate, setStartDate] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });

  // 상품 설정 상태
  const [products, setProducts] = useState<ProductConfig[]>([]);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<ProductConfig | null>(null);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);

  // --- 수기 발주 및 공급사 상태 ---
  const [orderSubTab, setOrderSubTab] = useState<'list' | 'suppliers' | 'products'>('list');
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(true);
  const [supplyProducts, setSupplyProducts] = useState<any[]>([]);
  const [isLoadingSupplyProducts, setIsLoadingSupplyProducts] = useState(true);

  // 수기 발주 모달
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedLogForOrder, setSelectedLogForOrder] = useState<any>(null);
  const [orderCustomerName, setOrderCustomerName] = useState('');
  const [orderCustomerPhone, setOrderCustomerPhone] = useState('');
  const [orderCustomerAddress, setOrderCustomerAddress] = useState('');
  const [orderSelectedProduct, setOrderSelectedProduct] = useState('');
  const [orderMemo, setOrderMemo] = useState('');
  const [orderStatus, setOrderStatus] = useState('발주대기');
  const [generatedOrderTemplate, setGeneratedOrderTemplate] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // 결과 모달
  const [isOrderResultModalOpen, setIsOrderResultModalOpen] = useState(false);
  const [finalOrderText, setFinalOrderText] = useState('');
  const [finalOrderGroups, setFinalOrderGroups] = useState<{supplierName: string, text: string}[]>([]);
  const [activePreviewTab, setActivePreviewTab] = useState<string>('');

  // 필터 상태
  const [orderFilterSupplier, setOrderFilterSupplier] = useState('');
  const [orderFilterSettlement, setOrderFilterSettlement] = useState('');
  const [orderFilterStatus, setOrderFilterStatus] = useState('');
  const [orderFilterMonth, setOrderFilterMonth] = useState('');
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isUpdatingOrderStatus, setIsUpdatingOrderStatus] = useState(false);

  // 공급사/제품 등록 입력
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierSettlement, setNewSupplierSettlement] = useState('건바이건');
  const [newSupplierBank, setNewSupplierBank] = useState('');
  const [newSupplierAccount, setNewSupplierAccount] = useState('');
  const [newSupplierHolder, setNewSupplierHolder] = useState('');
  const [newSupplierTemplate, setNewSupplierTemplate] = useState('');
  const [isSubmittingSupplier, setIsSubmittingSupplier] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductSupplier, setNewProductSupplier] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [isSubmittingSupplyProduct, setIsSubmittingSupplyProduct] = useState(false);

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

  const fetchOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const res = await fetch('/api/orders');
      if (res.ok) setOrders(await res.json());
    } catch (err) { console.error(err); }
    finally { setIsLoadingOrders(false); }
  };

  const fetchSuppliers = async () => {
    setIsLoadingSuppliers(true);
    try {
      const res = await fetch('/api/suppliers');
      if (res.ok) setSuppliers(await res.json());
    } catch (err) { console.error(err); }
    finally { setIsLoadingSuppliers(false); }
  };

  const fetchSupplyProducts = async () => {
    setIsLoadingSupplyProducts(true);
    try {
      const res = await fetch('/api/supply-products');
      if (res.ok) setSupplyProducts(await res.json());
    } catch (err) { console.error(err); }
    finally { setIsLoadingSupplyProducts(false); }
  };

  useEffect(() => {
    fetchLinks();
    fetchLogs();
    fetchProducts();
    fetchOrders();
    fetchSuppliers();
    fetchSupplyProducts();
  }, []);

    // 링크 복사 핸들러
  const handleCopyLink = (id: string) => {
    const link = links.find(l => l.id === id);
    const url = link && link.products.length === 1
      ? `${window.location.origin}/apply/${id}?product=${encodeURIComponent(link.products[0])}`
      : `${window.location.origin}/apply/${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyProductLink = (linkId: string, productName: string) => {
    const url = `${window.location.origin}/apply/${linkId}?product=${encodeURIComponent(productName)}`;
    navigator.clipboard.writeText(url);
    const key = `${linkId}-${productName}`;
    setCopiedId(key);
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

  // 날짜 파싱 헬퍼 함수
  const parseLogDate = (dt: string | undefined | null) => {
    if (!dt || dt === '-') return null;
    const regex = /(\d{4})[\.\-\/]\s*(\d{1,2})[\.\-\/]\s*(\d{1,2})[\.\-\/]?\s*(AM|PM|오전|오후)?\s*(\d{1,2}):(\d{1,2}):?(\d{1,2})?/i;
    const match = dt.match(regex);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      const ampm = (match[4] || '').toUpperCase();
      let hour = parseInt(match[5], 10);
      const minute = parseInt(match[6], 10);
      const second = parseInt(match[7] || '0', 10);

      if ((ampm === 'PM' || ampm === '오후') && hour < 12) hour += 12;
      if ((ampm === 'AM' || ampm === '오전') && hour === 12) hour = 0;

      return new Date(year, month, day, hour, minute, second);
    }
    
    const dateRegex = /(\d{4})[\.\-\/]\s*(\d{1,2})[\.\-\/]\s*(\d{1,2})/i;
    const dateMatch = dt.match(dateRegex);
    if (dateMatch) {
      const year = parseInt(dateMatch[1], 10);
      const month = parseInt(dateMatch[2], 10) - 1;
      const day = parseInt(dateMatch[3], 10);
      return new Date(year, month, day);
    }
    
    return null;
  };

  // 필터링 및 정렬된 로그 목록
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      (log['계약자'] && log['계약자'].includes(searchTerm)) ||
      (log['연락처'] && log['연락처'].includes(searchTerm)) ||
      (log['영업자'] && log['영업자'].includes(searchTerm)) ||
      (log['상품명'] && log['상품명'].includes(searchTerm));
      
    const matchesSheet = selectedSheets.length === 0 || selectedSheets.includes(log['시트구분']);
    
    let matchesDate = true;
    if (startDate && endDate) {
      const logDateObj = parseLogDate(log['신청일시']);
      if (logDateObj) {
        const year = logDateObj.getFullYear();
        const month = String(logDateObj.getMonth() + 1).padStart(2, '0');
        const day = String(logDateObj.getDate()).padStart(2, '0');
        const logDateStr = `${year}-${month}-${day}`;
        matchesDate = logDateStr >= startDate && logDateStr <= endDate;
      } else {
        matchesDate = false;
      }
    }

    return matchesSearch && matchesSheet && matchesDate;
  }).sort((a, b) => {
    const dateA = parseLogDate(a['신청일시']);
    const dateB = parseLogDate(b['신청일시']);
    const timeA = dateA ? dateA.getTime() : 0;
    const timeB = dateB ? dateB.getTime() : 0;
    return timeB - timeA;
  });

  const handleBulkDownloadImages = async () => {
    const logsWithDocs = filteredLogs.filter(log => log['document_id']);
    if (logsWithDocs.length === 0) {
      alert('다운로드할 이미지(계약서)가 없습니다.');
      return;
    }

    if (!confirm(`현재 조건에 해당하는 총 ${logsWithDocs.length}건의 이미지를 일괄 다운로드하시겠습니까?\n(건수가 많을 경우 시간이 다소 소요될 수 있습니다.)`)) {
      return;
    }

    try {
      setIsBulkDownloading(true);
      setBulkDownloadProgress({ current: 0, total: logsWithDocs.length });

      const JSZip = (await import('jszip')).default;
      const { saveAs } = await import('file-saver');
      const zip = new JSZip();

      const pdfjsLib = await import('pdfjs-dist');
      const pdfjsVersion = pdfjsLib.version || '4.0.379';
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.mjs`;

      let successCount = 0;

      for (let i = 0; i < logsWithDocs.length; i++) {
        const log = logsWithDocs[i];
        try {
          const response = await fetch(`/api/download?id=${log['document_id']}&action=download`);
          if (!response.ok) throw new Error('Failed to fetch PDF');
          
          const arrayBuffer = await response.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          
          const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
          const pdf = await loadingTask.promise;
          const page = await pdf.getPage(1);
          
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) throw new Error('No canvas context');
          
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          
          await page.render({ canvasContext: context, viewport: viewport }).promise;
          
          const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.6));
          if (blob) {
            const fileName = getFormattedFileName(log) || `contract_${log['document_id']}`;
            zip.file(`${fileName}.jpg`, blob);
            successCount++;
          }
        } catch (err) {
          console.error(`Error downloading document ${log['document_id']}:`, err);
        }
        setBulkDownloadProgress({ current: i + 1, total: logsWithDocs.length });
      }

      if (successCount > 0) {
        const content = await zip.generateAsync({ type: 'blob' });
        const today = new Date();
        const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
        saveAs(content, `통합신청내역_이미지_${dateStr}.zip`);
      } else {
        alert('다운로드에 성공한 이미지가 없습니다.');
      }
    } catch (error: any) {
      console.error('Error during bulk download:', error);
      alert(`일괄 다운로드 중 오류가 발생했습니다: ${error.message || error}`);
    } finally {
      setIsBulkDownloading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === '880805') {
      setIsAuthenticated(true);
        } else {
      alert('비밀번호가 일치하지 않습니다.');
      setPasswordInput('');
    }
  };

  // --- 수기 발주 및 정산 처리 핸들러 추가 ---

  // 발주 템플릿 실시간 치환 로직
  const getSubstitutedTemplate = (
    template: string,
    customerName: string,
    customerPhone: string,
    customerAddress: string,
    productName: string,
    price: string,
    settlementType: string,
    supplierName: string,
    bankName: string,
    accountNumber: string,
    accountHolder: string,
    memo: string,
    deliveryCompany: string = '',
    trackingNumber: string = ''
  ) => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const timeStr = today.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    
    let processedTemplate = template || '';

    // 스마트 폴백: 사용자가 구글 시트에 템플릿을 저장할 때 실수로 데이터 행(줄바꿈)을 빼먹고 헤더(1줄)만 저장한 경우 대비
    if (processedTemplate.includes('\\t') || processedTemplate.includes('\t')) {
      const hasNewline = processedTemplate.includes('\\n') || processedTemplate.includes('\n');
      if (!hasNewline) {
        // 헤더만 있는 상태로 간주, 탭 개수에 맞춰 자동으로 데이터 치환 행을 생성해줌
        const cols = processedTemplate.split(/\\t|\t/);
        const dataRow = cols.map(col => {
          const c = col.replace(/\\t|\t/g, '').trim();
          if (c.includes('수취인') || c.includes('고객') || c.includes('이름')) return '{고객명}';
          if (c.includes('전화') || c.includes('연락처') || c.includes('번호') || c.includes('진화')) return '{연락처}';
          if (c.includes('주소') || c.includes('배송지')) return '{주소}';
          if (c.includes('상품명') || c.includes('제품')) return '{제품명}';
          if (c.includes('수량')) return '1';
          if (c.includes('공급가') || c.includes('가격') || c.includes('단가') || c.includes('원가')) return '{공급가}';
          if (c.includes('옵션')) return ' ';
          if (c.includes('송하인') || c.includes('발송자')) return supplierName || '판매자';
          return '-';
        }).join('\\t');
        processedTemplate += `\\n${dataRow}`;
      }
    }

    return processedTemplate
      .replace(/{(고객명|이름|계약자|계약고객명|수취인)}/g, customerName)
      .replace(/{(연락처|전화번호|휴대폰|휴대폰번호|진화번호)}/g, customerPhone)
      .replace(/{(주소|배송지|배송지주소)}/g, customerAddress)
      .replace(/{(제품명|상품명|공급제품리스트|기기명)}/g, productName)
      .replace(/{(공급가|가격|원가|단가)}/g, Number(price || 0).toLocaleString())
      .replace(/{(정산방식|정산구분)}/g, settlementType)
      .replace(/{(발주일자|오늘날짜)}/g, dateStr)
      .replace(/{(발주일시|현재시간)}/g, timeStr)
      .replace(/{(공급사명|공급사|업체명)}/g, supplierName)
      .replace(/{(은행명|은행)}/g, bankName)
      .replace(/{(계좌번호|계좌)}/g, accountNumber)
      .replace(/{(예금주)}/g, accountHolder)
      .replace(/{(메모|특이사항|비고|요청사항)}/g, memo || '-')
      .replace(/\\t/g, '\t')
      .replace(/\\n/g, '\n');
  };

  // 탭구분 발주서 렌더링 헬퍼 (엑셀 형태의 표로 표시)
  const renderOrderPreview = (text: string) => {
    if (!text) return null;
    const hasTab = text.includes('\t');
    if (hasTab) {
      const lines = text.split('\n').filter(line => line.trim() !== '');
      if (lines.length > 0) {
        return (
          <div className="overflow-x-auto w-full border border-slate-200/85 rounded-xl bg-white shadow-sm my-1">
            <table className="w-full text-[11px] text-left border-collapse font-sans">
              <tbody>
                {lines.map((line, rIdx) => {
                  const cols = line.split('\t');
                  return (
                    <tr key={rIdx} className={rIdx === 0 ? 'bg-slate-100/90 font-black text-slate-700 border-b border-slate-200' : 'hover:bg-slate-50 border-b border-slate-100'}>
                      {cols.map((col, cIdx) => (
                        <td key={cIdx} className="p-3 border-r border-slate-150 last:border-r-0 whitespace-nowrap min-w-[100px] text-slate-800 font-bold">
                          {col || <span className="text-slate-350 font-normal italic">(빈 값)</span>}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      }
    }

    return (
      <div className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-700">
        {text}
      </div>
    );
  };

  // 모달 열기 핸들러
  const handleOpenOrderModal = (log: any) => {
    setSelectedLogForOrder(log);
    setOrderCustomerName(log['계약자'] || log['성명'] || '');
    setOrderCustomerPhone(log['연락처'] || '');
    setOrderCustomerAddress(log['주소'] || '');
    setOrderSelectedProduct('');
    setOrderMemo('');
    setOrderStatus('발주대기');
    setGeneratedOrderTemplate('');
    setIsOrderModalOpen(true);
  };

  // 제품 선택 변경 시 템플릿 실시간 생성
  useEffect(() => {
    if (!orderSelectedProduct) {
      setGeneratedOrderTemplate('');
      return;
    }
        const product = supplyProducts.find(p => p.name === orderSelectedProduct);
    if (!product) return;

    if (!product.supplierName) {
      alert('선택한 제품에 연결된 공급사명이 존재하지 않습니다. 공급제품 관리를 통해 공급사를 매핑해 주세요.');
      return;
    }

    const supplier = suppliers.find(s => s.name === product.supplierName);
    const template = supplier?.template || `[발주서]
공급사: {공급사명}
수신: {공급사명} 담당자님

아래와 같이 제품 발주를 요청합니다.

1. 고객정보
- 성명: {고객명}
- 연락처: {연락처}
- 배송지 주소: {주소}

2. 발주내역
- 제품명: {제품명}
- 공급가: {공급가}원
- 수량: 1개
- 정산방식: {정산방식}

발주일시: {발주일시}
메모: {메모}`;

    const text = getSubstitutedTemplate(
      template,
      orderCustomerName,
      orderCustomerPhone,
      orderCustomerAddress,
      orderSelectedProduct,
      product.price,
      supplier?.settlementType || '건바이건',
      product.supplierName,
      supplier?.bankName || '',
      supplier?.accountNumber || '',
      supplier?.accountHolder || '',
      orderMemo,
      '',
      ''
    );
    setGeneratedOrderTemplate(text);
  }, [
    orderSelectedProduct,
    orderCustomerName,
    orderCustomerPhone,
    orderCustomerAddress,
    orderMemo,
    suppliers,
    supplyProducts
  ]);

  // 발주 등록 및 생성 핸들러
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderSelectedProduct) {
      alert('공급제품을 선택해주세요.');
      return;
    }
    const product = supplyProducts.find(p => p.name === orderSelectedProduct);
    if (!product) return;

    const supplier = suppliers.find(s => s.name === product.supplierName);

    setIsSubmittingOrder(true);
    try {
      const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: orderId,
          createdAt: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
          customerName: orderCustomerName,
          customerPhone: orderCustomerPhone,
          customerAddress: orderCustomerAddress,
          supplierName: product.supplierName,
          productName: orderSelectedProduct,
          price: product.price,
          settlementType: supplier?.settlementType || '건바이건',
          status: orderStatus,
          memo: orderMemo
        })
      });

      if (res.ok) {
        setIsOrderModalOpen(false);
        fetchOrders();
        setActiveTab('orders');
        alert('발주 데이터가 등록되었습니다.\n목록에서 선택하여 발주서를 생성하거나 상태를 변경할 수 있습니다.');
      } else {
        const err = await res.json();
        alert(err.error || '발주 등록에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('오류가 발생했습니다.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // 공급사 등록/수정 핸들러
  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierName) {
      alert('공급사명을 입력해주세요.');
      return;
    }
    setIsSubmittingSupplier(true);
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSupplierName,
          settlementType: newSupplierSettlement,
          bankName: newSupplierBank,
          accountNumber: newSupplierAccount,
          accountHolder: newSupplierHolder,
          template: newSupplierTemplate
        })
      });

      if (res.ok) {
        alert('공급사 정보가 성공적으로 저장되었습니다.');
        setNewSupplierName('');
        setNewSupplierBank('');
        setNewSupplierAccount('');
        setNewSupplierHolder('');
        fetchSuppliers();
      } else {
        const err = await res.json();
        alert(err.error || '공급사 저장에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('오류가 발생했습니다.');
    } finally {
      setIsSubmittingSupplier(false);
    }
  };

  // 공급사 삭제 핸들러
  const handleDeleteSupplier = async (name: string) => {
    if (!confirm(`정말로 공급사 '${name}' 설정을 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/suppliers?name=${encodeURIComponent(name)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        alert('공급사가 성공적으로 삭제되었습니다.');
        fetchSuppliers();
      } else {
        const err = await res.json();
        alert(err.error || '공급사 삭제에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('오류가 발생했습니다.');
    }
  };

  // 공급제품 등록/수정 핸들러
  const handleCreateSupplyProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName || !newProductSupplier) {
      alert('제품명과 공급사명을 선택/입력해주세요.');
      return;
    }
    setIsSubmittingSupplyProduct(true);
    try {
      const res = await fetch('/api/supply-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProductName,
          supplierName: newProductSupplier,
          price: newProductPrice
        })
      });

      if (res.ok) {
        alert('공급제품이 성공적으로 저장되었습니다.');
        setNewProductName('');
        setNewProductPrice('');
        fetchSupplyProducts();
      } else {
        const err = await res.json();
        alert(err.error || '공급제품 저장에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('오류가 발생했습니다.');
    } finally {
      setIsSubmittingSupplyProduct(false);
    }
  };

  // 공급제품 삭제 핸들러
  const handleDeleteSupplyProduct = async (name: string) => {
    if (!confirm(`정말로 제품 '${name}'을 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/supply-products?name=${encodeURIComponent(name)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        alert('제품이 성공적으로 삭제되었습니다.');
        fetchSupplyProducts();
      } else {
        const err = await res.json();
        alert(err.error || '제품 삭제에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('오류가 발생했습니다.');
    }
  };

  // 발주 다중 상태 변경 핸들러
  const handleUpdateOrdersStatus = async (status: string) => {
    if (selectedOrderIds.length === 0) {
      alert('선택된 발주 내역이 없습니다.');
      return;
    }
    if (!confirm(`선택한 ${selectedOrderIds.length}건의 발주를 '${status}' 상태로 변경하시겠습니까?`)) return;
    
    setIsUpdatingOrderStatus(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: selectedOrderIds,
          status: status
        })
      });

      if (res.ok) {
        alert('상태가 변경되었습니다.');
        setSelectedOrderIds([]);
        fetchOrders();
      } else {
        const err = await res.json();
        alert(err.error || '상태 업데이트에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('오류가 발생했습니다.');
    } finally {
      setIsUpdatingOrderStatus(false);
    }
  };

  // 발주서 다중 미리보기 열기 (엑셀용 한 시트 텍스트 생성)
  const handleOpenPreviewModal = () => {
    if (selectedOrderIds.length === 0) {
      alert('선택된 발주 내역이 없습니다.');
      return;
    }
    
    const selectedOrders = orders.filter(o => selectedOrderIds.includes(o.id));
    
    const ordersBySupplier: { [key: string]: typeof selectedOrders } = {};
    selectedOrders.forEach(o => {
      const sup = o.supplierName || '미상';
      if (!ordersBySupplier[sup]) ordersBySupplier[sup] = [];
      ordersBySupplier[sup].push(o);
    });

    let overallText = '';

    const newGroups: { supplierName: string, text: string }[] = [];

    Object.keys(ordersBySupplier).forEach(supplierName => {
      const groupOrders = ordersBySupplier[supplierName];
      let combinedLines: string[] = [];
      let baseLines: string[] = [];

      groupOrders.forEach((order, index) => {
        const supplier = suppliers.find(s => s.name === order.supplierName);
        let template = supplier?.template || '';
        if (order.supplierName?.toUpperCase() === 'KLJ') {
          if (!template || template.trim() === '' || template.includes('[발주서]')) {
            const KLJ_DEFAULT_TEMPLATE = `[발주서]\n\n계약자\t{계약자}\n연락처\t{연락처}\n설치주소\t{주소}\n\n제품명\t{상품명}\n\n배송시 주의사항\n{메모}`;
            template = KLJ_DEFAULT_TEMPLATE;
          }
        }
        const text = getSubstitutedTemplate(
          template,
          order.customerName,
          order.customerPhone,
          order.customerAddress,
          order.productName,
          order.price,
          order.settlementType,
          order.supplierName,
          supplier?.bankName || '',
          supplier?.accountNumber || '',
          supplier?.accountHolder || '',
          order.memo,
          order.deliveryCompany || '',
          order.trackingNumber || ''
        );

        const currentLines = text.split('\n');

        if (index === 0) {
          combinedLines.push(...currentLines);
          baseLines = currentLines;
        } else {
          const newDataLines = currentLines.filter((line, i) => line !== baseLines[i]);
          combinedLines.push(...newDataLines);
        }
      });

      const groupText = combinedLines.join('\n');
      newGroups.push({ supplierName, text: groupText });

      overallText += `==== [${supplierName}] 발주 내역 ====\n`;
      overallText += groupText;
      overallText += '\n\n';
    });

    setFinalOrderGroups(newGroups);
    if (newGroups.length > 0) setActivePreviewTab(newGroups[0].supplierName);

    setFinalOrderText(overallText.trim());
    setIsOrderResultModalOpen(true);
  };

  // 단건 발주 내역 삭제 핸들러
  const handleDeleteOrder = async (id: string) => {
    if (!confirm('정말로 이 발주 내역을 삭제하시겠습니까? (구글 시트에서도 삭제됩니다)')) return;
    try {
      const res = await fetch(`/api/orders?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        alert('발주 내역이 성공적으로 삭제되었습니다.');
        fetchOrders();
      } else {
        const err = await res.json();
        alert(err.error || '발주 삭제에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('오류가 발생했습니다.');
    }
  };

  // 총무팀 전달 복사 핸들러
  const handleCopySettlementText = () => {
    if (selectedOrderIds.length === 0) {
      alert('복사할 발주 내역을 선택해주세요.');
      return;
    }

    const selectedOrders = orders.filter(o => selectedOrderIds.includes(o.id));
    
    // 공급사 및 정산방식별로 그룹화
    const groups: Record<string, any[]> = {};
    selectedOrders.forEach(o => {
      const supplier = suppliers.find(s => s.name === o.supplierName);
      const key = `${o.supplierName} (${o.settlementType})`;
      if (!groups[key]) groups[key] = [];
      groups[key].push({
        ...o,
        bankInfo: supplier ? `${supplier.bankName} ${supplier.accountNumber} (${supplier.accountHolder})` : '계좌 정보 없음'
      });
    });

    let text = `📢 [총무팀 정산 요청 내역]\n요청일자: ${new Date().toLocaleDateString('ko-KR')}\n\n`;
    let grandTotal = 0;

    Object.entries(groups).forEach(([groupName, items]) => {
      text += `■ ${groupName}\n`;
      text += `송금처: ${items[0].bankInfo}\n`;
      let groupTotal = 0;
      items.forEach((item, idx) => {
        const priceNum = parseInt(String(item.price).replace(/[^0-9]/g, ''), 10) || 0;
        groupTotal += priceNum;
        text += `  ${idx + 1}. 고객: ${item.customerName} | 제품: ${item.productName} | 금액: ${Number(priceNum).toLocaleString()}원\n`;
      });
      grandTotal += groupTotal;
      text += `소계: ${items.length}건 / ${groupTotal.toLocaleString()}원\n\n`;
    });

    text += `===============================\n`;
    text += `총 요청 건수: ${selectedOrders.length}건\n`;
    text += `총 정산 금액: ${grandTotal.toLocaleString()}원\n`;
    text += `정산 요청을 확인해 주시기 바랍니다. 감사합니다.`;

    navigator.clipboard.writeText(text);
    alert('총무팀 전달용 텍스트가 클립보드에 복사되었습니다. 메신저에 바로 붙여넣어 전송하세요!');
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
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'logs' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/20' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'}`}
          >
            <UserCheck size={14} /> 통합 신청 내역
          </button>
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
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'orders' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/20' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'}`}
          >
            <FileText size={14} /> 수기 발주 및 정산
          </button>
        </div>
      </header>

      {/* Shortcut Links */}
      <div className="bg-white border-b border-slate-200 px-8 py-3 flex items-center gap-3 overflow-x-auto shadow-sm z-30 relative">
        <span className="text-xs font-bold text-slate-500 whitespace-nowrap">빠른 링크</span>
        <div className="h-4 w-px bg-slate-200 mx-1"></div>
        <a href="https://docs.google.com/spreadsheets/d/1MMYWdX6-x7OApeZiwg6ASjo9H0sX8z_09Ci_m2shfZY/edit?gid=1312626530#gid=1312626530" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-bold transition-colors whitespace-nowrap border border-green-200">
          <ExternalLink size={12} />
          전산
        </a>
        <a href="https://docs.google.com/spreadsheets/d/19HQigorXz8j2K2PyQx4k4rGGUMVKk43aNSAI9sEgRyc/edit?gid=844111432#gid=844111432" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors whitespace-nowrap border border-blue-200">
          <ExternalLink size={12} />
          가입신청서
        </a>
        <a href="https://docs.google.com/spreadsheets/d/1Vpn6zTyhaN38TMu1b2MH2_7fGBwDj6S8YQ3O5LeSuJw/edit?gid=0#gid=0" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-xs font-bold transition-colors whitespace-nowrap border border-purple-200">
          <ExternalLink size={12} />
          전체회원정보
        </a>
        <a href="https://sangjo.netlify.app/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg text-xs font-bold transition-colors whitespace-nowrap border border-teal-200">
          <ExternalLink size={12} />
          상조현황
        </a>
        <a href="https://jinwookerp.netlify.app/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 hover:bg-orange-100 rounded-lg text-xs font-bold transition-colors whitespace-nowrap border border-orange-200">
          <ExternalLink size={12} />
          정산ERP
        </a>
      </div>

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
                      <div key={link.id} className="bg-white border border-slate-200 p-6 rounded-[2rem] flex flex-col gap-5 transition-all hover:border-indigo-200/80 shadow-sm hover:shadow-md">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
                              href={`/apply/${link.id}${link.products.length === 1 ? `?product=${encodeURIComponent(link.products[0])}` : ''}`} 
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

                        {/* 상품별 개별 신청 링크 아코디언 */}
                        <div className="border-t border-slate-100/80 pt-3">
                          <button
                            type="button"
                            onClick={() => toggleProductLinks(link.id)}
                            className="text-xs font-black text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-1"
                          >
                            <span>상품별 다이렉트 가입 링크 목록</span>
                            <ChevronDown size={14} className={`transform transition-transform duration-200 ${expandedLinks[link.id] ? 'rotate-180 text-indigo-500' : ''}`} />
                          </button>
                          
                          {expandedLinks[link.id] && (
                            <div className="mt-3 space-y-2 max-w-full">
                              {link.products.map(p => {
                                const key = `${link.id}-${p}`;
                                const productUrl = `${window.location.origin}/apply/${link.id}?product=${encodeURIComponent(p)}`;
                                return (
                                  <div key={p} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-indigo-50/20 hover:border-indigo-100/50 transition-all">
                                    <div className="space-y-0.5 overflow-hidden">
                                      <span className="text-[11px] font-black text-slate-700 block">{p}</span>
                                      <span className="text-[10px] text-slate-400 font-mono block truncate select-all">{productUrl}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                                      <button
                                        onClick={() => handleCopyProductLink(link.id, p)}
                                        className="py-2 px-3 bg-white border border-slate-200 rounded-xl hover:border-slate-350 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-all flex items-center justify-center gap-1.5 shadow-sm text-[10px] font-black"
                                        title={`${p} 신청 링크 주소 복사`}
                                      >
                                        {copiedId === key ? (
                                          <>
                                            <Check className="text-emerald-500" size={12} />
                                            <span className="text-emerald-600 text-[10px]">복사됨</span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy size={12} />
                                            <span>주소 복사</span>
                                          </>
                                        )}
                                      </button>
                                      <a
                                        href={`/apply/${link.id}?product=${encodeURIComponent(p)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2.5 bg-white border border-slate-200 rounded-xl hover:border-slate-350 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-all flex items-center justify-center shadow-sm"
                                        title={`${p} 링크 테스트`}
                                      >
                                        <ExternalLink size={12} />
                                      </a>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
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
                          monthlyPayment1Title: '',
                          monthlyPayment1: '',
                          monthlyPayment2Title: '',
                          monthlyPayment2: '',
                          refundNotice: '',
                          eformTemplateId: '',
                          targetSheetName: '',
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
                        {isAddingProduct && (
                          <div className="mt-3 flex items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-500">기존 양식 복사하기</span>
                            <select
                              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-400"
                              onChange={(e) => {
                                const prod = products.find(p => p.id === e.target.value);
                                if (prod) {
                                  setSelectedProductForEdit({
                                    ...prod,
                                    id: '', // 식별자는 새로 입력해야 함
                                    name: prod.name + ' (복사본)'
                                  });
                                }
                              }}
                            >
                              <option value="">-- 상품 선택 --</option>
                              {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        <p className="text-[10px] text-slate-400 font-bold mt-2">
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
                          <label className="text-[11px] font-bold text-slate-500">상품명 (화면 표시용)</label>
                          <input
                            type="text"
                            value={selectedProductForEdit.name}
                            onChange={(e) => updateEditField('name', e.target.value)}
                            placeholder="예: 더좋은라이즈 498"
                            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white outline-none rounded-xl py-2.5 px-4 text-xs font-bold text-slate-800 transition-all"
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
                          <label className="text-[11px] font-bold text-slate-500">구글 시트 연결 대상 (입력하지 않으면 기본 시트)</label>
                          <input
                            type="text"
                            value={selectedProductForEdit.targetSheetName || ''}
                            onChange={(e) => updateEditField('targetSheetName', e.target.value)}
                            placeholder="예: 신규상품_현황"
                            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white outline-none rounded-xl py-2.5 px-4 text-xs font-bold text-slate-800 transition-all"
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
                          <label className="text-[11px] font-bold text-slate-500">1차 납입금 안내 제목 (입력 안하면 '1차 납입금')</label>
                          <input
                            type="text"
                            value={selectedProductForEdit.monthlyPayment1Title || ''}
                            onChange={(e) => updateEditField('monthlyPayment1Title', e.target.value)}
                            placeholder="예: 1차 납입금"
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
                          <label className="text-[11px] font-bold text-slate-500">2차 납입금 안내 제목 (입력 안하면 '2차 납입금')</label>
                          <input
                            type="text"
                            value={selectedProductForEdit.monthlyPayment2Title || ''}
                            onChange={(e) => updateEditField('monthlyPayment2Title', e.target.value)}
                            placeholder="예: 2차 납입금"
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
              {/* 대시보드 요약 (필터링된 결과 기준) */}
              {(() => {
                const totalRegistrations = filteredLogs.length;
                let totalAccounts = 0;
                const accountsByProduct: Record<string, number> = {};
                const accountsByHQ: Record<string, number> = {};

                filteredLogs.forEach(log => {
                  const rawAccount = log['구좌수'] || log['수량'];
                  let count = 1;
                  if (rawAccount) {
                    const parsed = parseInt(String(rawAccount).replace(/[^0-9]/g, ''), 10);
                    if (!isNaN(parsed) && parsed > 0) {
                      count = parsed;
                    }
                  }
                  totalAccounts += count;

                  const product = log['시트구분'] || log['상품명'] || '기타';
                  accountsByProduct[product] = (accountsByProduct[product] || 0) + count;

                  let hq = log['영업자소속'] || log['영업소속'] || '';
                  hq = String(hq).trim();
                  if (!hq) hq = '소속 미지정/본인';
                  accountsByHQ[hq] = (accountsByHQ[hq] || 0) + count;
                });

                const sortedProducts = Object.entries(accountsByProduct).sort((a, b) => b[1] - a[1]);
                const sortedHQs = Object.entries(accountsByHQ).sort((a, b) => b[1] - a[1]);

                return (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-[2rem] p-6 text-white shadow-sm flex flex-col justify-center">
                      <p className="text-indigo-100 font-bold text-xs uppercase tracking-wider mb-2">총 가입 건수</p>
                      <div className="text-4xl font-black">{totalRegistrations.toLocaleString()}<span className="text-xl font-bold ml-1 opacity-80">건</span></div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-[2rem] p-6 text-white shadow-sm flex flex-col justify-center">
                      <p className="text-blue-100 font-bold text-xs uppercase tracking-wider mb-2">총 구좌 수</p>
                      <div className="text-4xl font-black">{totalAccounts.toLocaleString()}<span className="text-xl font-bold ml-1 opacity-80">구좌</span></div>
                    </div>
                    
                    <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm flex flex-col">
                      <p className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-3">상품별 구좌수</p>
                      <div className="flex-1 overflow-y-auto pr-2 space-y-2 max-h-[100px] custom-scrollbar">
                        {sortedProducts.length > 0 ? sortedProducts.map(([p, c]) => (
                          <div key={p} className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-700 truncate mr-2">{p}</span>
                            <span className="font-black text-indigo-600 whitespace-nowrap">{c.toLocaleString()}구좌</span>
                          </div>
                        )) : <div className="text-slate-400 text-xs">데이터 없음</div>}
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm flex flex-col">
                      <p className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-3">본부별 구좌수</p>
                      <div className="flex-1 overflow-y-auto pr-2 space-y-2 max-h-[100px] custom-scrollbar">
                        {sortedHQs.length > 0 ? sortedHQs.map(([h, c]) => (
                          <div key={h} className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-700 truncate mr-2">{h}</span>
                            <span className="font-black text-blue-600 whitespace-nowrap">{c.toLocaleString()}구좌</span>
                          </div>
                        )) : <div className="text-slate-400 text-xs">데이터 없음</div>}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 필터 및 검색 바 */}
              <div className="bg-white border border-slate-200 p-6 rounded-[2rem] flex flex-col lg:flex-row gap-4 items-center justify-between shadow-sm">
                <div className="flex gap-2 w-full lg:max-w-xl">
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-1 shadow-sm h-[42px] min-w-max">
                    <button
                      onClick={() => {
                        const d = new Date(startDate);
                        d.setDate(d.getDate() - 1);
                        const str = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                        setStartDate(str);
                        setEndDate(str);
                      }}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors flex-shrink-0"
                      title="이전 날짜로 이동"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <div className="flex items-center px-1 border-x border-slate-200 mx-1">
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          if (e.target.value > endDate) setEndDate(e.target.value);
                        }}
                        className="bg-transparent outline-none text-xs font-bold text-slate-800 w-[105px] cursor-pointer"
                      />
                      <span className="text-slate-300 mx-1.5 text-xs font-bold">~</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                          setEndDate(e.target.value);
                          if (e.target.value < startDate) setStartDate(e.target.value);
                        }}
                        className="bg-transparent outline-none text-xs font-bold text-slate-800 w-[105px] cursor-pointer"
                      />
                    </div>
                    <button
                      onClick={() => {
                        const d = new Date(endDate);
                        d.setDate(d.getDate() + 1);
                        const str = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                        setStartDate(str);
                        setEndDate(str);
                      }}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors flex-shrink-0"
                      title="다음 날짜로 이동"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                  <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={16} />
                    <input 
                      type="text" 
                      placeholder="계약자명, 연락처 등 검색" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white outline-none rounded-xl py-3 pl-11 pr-4 text-xs font-bold text-slate-800 placeholder:text-slate-400 transition-all"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 w-full lg:w-auto items-center">
                  <div className="relative font-sans text-xs">
                    <button
                      onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
                      className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 focus:border-indigo-600 outline-none rounded-xl py-3 px-4 text-xs font-bold text-slate-800 min-w-[140px] transition-all"
                    >
                      <span>
                        상품: {selectedSheets.length === 0 ? '전체' : `${selectedSheets[0]}${selectedSheets.length > 1 ? ` 외 ${selectedSheets.length - 1}건` : ''}`}
                      </span>
                      <svg className={`w-4 h-4 transition-transform text-slate-400 ${isProductDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </button>
                    
                    {isProductDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsProductDropdownOpen(false)}></div>
                        <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                          <div className="max-h-60 overflow-y-auto py-1">
                            <label className="flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedSheets.length === 0}
                                onChange={() => setSelectedSheets([])}
                                className="accent-indigo-600 w-4 h-4 rounded cursor-pointer"
                              />
                              <span className={`text-xs font-bold ${selectedSheets.length === 0 ? 'text-indigo-600' : 'text-slate-700'}`}>전체</span>
                            </label>
                            {AVAILABLE_SHEETS.map(sheet => (
                              <label key={sheet} className="flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedSheets.includes(sheet)}
                                  onChange={() => {
                                    if (selectedSheets.includes(sheet)) {
                                      setSelectedSheets(selectedSheets.filter(s => s !== sheet));
                                    } else {
                                      setSelectedSheets([...selectedSheets, sheet]);
                                    }
                                  }}
                                  className="accent-indigo-600 w-4 h-4 rounded cursor-pointer"
                                />
                                <span className={`text-xs font-bold ${selectedSheets.includes(sheet) ? 'text-indigo-600' : 'text-slate-700'}`}>{sheet}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <button onClick={fetchLogs} title="새로고침" className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-white text-slate-400 hover:text-slate-650 transition-colors shadow-sm">
                    <RefreshCw size={14} />
                  </button>
                  <button 
                    onClick={handleBulkDownloadImages}
                    disabled={isBulkDownloading}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-indigo-600/10 whitespace-nowrap"
                  >
                    {isBulkDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                    {isBulkDownloading ? `일괄 다운로드 중 (${bulkDownloadProgress.current}/${bulkDownloadProgress.total})` : '일괄 다운로드'}
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
                          <th className="px-2 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">신청일시</th>
                          <th className="px-2 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">계약자 정보</th>
                          <th className="px-2 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">상품 및 구좌</th>
                          <th className="px-2 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">결제 구분</th>
                          <th className="px-2 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">결제일</th>
                          <th className="px-2 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">헬스케어 대상자</th>
                          <th className="px-2 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">영업 담당</th>
                          <th className="px-2 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">증서 발송</th>
                          <th className="px-2 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">PDF 문서</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredLogs.map((log, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors text-xs font-bold text-slate-700">
                            <td className="px-2 py-3 whitespace-nowrap text-slate-400 font-mono">
                              {(() => {
                                const dt = log['신청일시'];
                                if (!dt || dt === '-') return '-';
                                
                                const date = parseLogDate(dt);
                                if (date) {
                                  const outYear = date.getFullYear();
                                  const outMonth = date.getMonth() + 1;
                                  const outDay = date.getDate();
                                  let outHour = date.getHours();
                                  const outMinute = date.getMinutes();
                                  const outSecond = date.getSeconds();
                                  
                                  const outAmPm = outHour >= 12 ? 'PM' : 'AM';
                                  if (outHour > 12) outHour -= 12;
                                  if (outHour === 0) outHour = 12;
                                  
                                  return (
                                    <div className="flex flex-col">
                                      <span>{`${outYear}. ${outMonth}. ${outDay}.`}</span>
                                      <span className="text-[10px] text-slate-400 opacity-70 mt-0.5">
                                        {`${outAmPm} ${outHour}:${outMinute.toString().padStart(2, '0')}:${outSecond.toString().padStart(2, '0')}`}
                                      </span>
                                    </div>
                                  );
                                }

                                const amIdx = dt.indexOf(' AM ');
                                const pmIdx = dt.indexOf(' PM ');
                                if (amIdx !== -1) {
                                  return (
                                    <div className="flex flex-col">
                                      <span>{dt.substring(0, amIdx).trim()}</span>
                                      <span className="text-[10px] text-slate-400 opacity-70 mt-0.5">{dt.substring(amIdx).trim()}</span>
                                    </div>
                                  );
                                } else if (pmIdx !== -1) {
                                  return (
                                    <div className="flex flex-col">
                                      <span>{dt.substring(0, pmIdx).trim()}</span>
                                      <span className="text-[10px] text-slate-400 opacity-70 mt-0.5">{dt.substring(pmIdx).trim()}</span>
                                    </div>
                                  );
                                }
                                return dt;
                              })()}
                            </td>
                            <td className="px-2 py-3 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="text-slate-900 font-black text-sm">{log['계약자'] || log['성명'] || '-'}</span>
                                <span className="text-[10px] text-slate-400 mt-0.5 font-normal">{log['연락처'] || '-'}</span>
                              </div>
                            </td>
                            <td className="px-2 py-3">
                              <div className="flex flex-col">
                                <span className="text-slate-800 font-black whitespace-nowrap">{log['상품명'] || '-'}</span>
                                <span className="text-[10px] text-slate-400 mt-0.5 font-normal">
                                  구좌: {log['구좌수'] || log['수량'] || '-'} {log['제품명'] && `// 제품: ${log['제품명']}`}
                                </span>
                              </div>
                            </td>
                            <td className="px-2 py-3 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="text-slate-700">{log['결제정보(카드/cms)'] || log['결제수단'] || '-'}</span>
                                <span className="text-[10px] text-slate-400 mt-0.5 font-normal">
                                  {log['카드사/은행명'] || log['결제기관'] || ''}
                                </span>
                              </div>
                            </td>
                            <td className="px-2 py-3 whitespace-nowrap text-slate-700">
                              {log['결제일'] || '-'}
                            </td>
                            <td className="px-2 py-3 whitespace-nowrap">
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
                            <td className="px-2 py-3 whitespace-nowrap">
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
                            <td className="px-2 py-3 whitespace-nowrap">
                              <span className="text-slate-700 font-bold">{log['회원증서수령방법'] || '-'}</span>
                            </td>
                            <td className="px-2 py-3 whitespace-nowrap">
                              <div className="flex flex-col gap-1.5 items-start">
                                {log['document_id'] ? (
                                  <>
                                    <button 
                                      onClick={() => { setSelectedPdfId(log['document_id']); setPdfModalOpen(true); }}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800 rounded-lg transition-all text-[10px] font-black shadow-sm"
                                    >
                                      <FileText size={12} /> 계약서 보기
                                    </button>
                                    <button 
                                      onClick={() => handleDownloadAsImage(log['document_id'], getFormattedFileName(log))}
                                      disabled={isDownloadingImage}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-150 text-indigo-600 hover:bg-indigo-650 hover:text-white hover:border-transparent rounded-lg transition-all text-[10px] font-black shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {isDownloadingImage ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                                      이미지 다운
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-bold mb-1">서명 미완료</span>
                                )}
                                <button 
                                  onClick={() => handleOpenOrderModal(log)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-600 hover:text-white hover:border-transparent rounded-lg transition-all text-[10px] font-black shadow-sm"
                                >
                                  <Plus size={12} /> 수기 발주
                                </button>
                              </div>
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

          {activeTab === 'orders' && (
            <motion.div
              key="tab-orders"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* 서브 탭 내비게이션 */}
              <div className="flex gap-2 border-b border-slate-200 pb-px">
                <button
                  onClick={() => setOrderSubTab('list')}
                  className={`pb-3 px-4 text-xs font-black transition-all border-b-2 ${orderSubTab === 'list' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                  발주 및 정산 내역
                </button>
                <button
                  onClick={() => setOrderSubTab('suppliers')}
                  className={`pb-3 px-4 text-xs font-black transition-all border-b-2 ${orderSubTab === 'suppliers' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                  공급사 설정
                </button>
                <button
                  onClick={() => setOrderSubTab('products')}
                  className={`pb-3 px-4 text-xs font-black transition-all border-b-2 ${orderSubTab === 'products' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                  공급제품 리스트
                </button>
              </div>

              {/* 1. 발주 및 정산 내역 탭 */}
              {orderSubTab === 'list' && (
                <div className="space-y-6">
                  {/* 통계 요약 카드 */}
                  {(() => {
                    const targetPrefix = orderFilterMonth ? `${orderFilterMonth.split('-')[0]}. ${parseInt(orderFilterMonth.split('-')[1])}.` : '';
                    
                    const filteredOrders = targetPrefix 
                      ? orders.filter(o => o.createdAt && o.createdAt.startsWith(targetPrefix))
                      : orders;

                    const totalOrders = filteredOrders.length;
                    
                    const supplierCounts: Record<string, number> = {};
                    const productCounts: Record<string, number> = {};
                    
                    filteredOrders.forEach(o => {
                      const sup = o.supplierName || '미상';
                      const prod = o.productName || '미상';
                      supplierCounts[sup] = (supplierCounts[sup] || 0) + 1;
                      productCounts[prod] = (productCounts[prod] || 0) + 1;
                    });

                    const sortedSuppliers = Object.entries(supplierCounts).sort((a, b) => b[1] - a[1]);
                    const sortedProducts = Object.entries(productCounts).sort((a, b) => b[1] - a[1]);

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        {/* 카드 1: 해당 월 표기 및 이동 컨트롤러 */}
                        <div className="bg-[#6b5bf8] text-white p-6 rounded-3xl shadow-sm flex flex-col justify-center items-center min-h-[140px] relative">
                          <div className="flex items-center gap-4">
                            <button 
                              onClick={() => {
                                const currentDate = orderFilterMonth ? new Date(orderFilterMonth + '-01') : new Date();
                                currentDate.setMonth(currentDate.getMonth() - 1);
                                setOrderFilterMonth(`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`);
                              }}
                              className="p-2 hover:bg-white/20 rounded-full transition-colors"
                            >
                              <ChevronLeft size={24} />
                            </button>
                            
                            <div className="text-3xl font-black text-center whitespace-nowrap">
                              {(() => {
                                if (!orderFilterMonth) {
                                  const d = new Date();
                                  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
                                }
                                const [y, m] = orderFilterMonth.split('-');
                                return `${y}년 ${parseInt(m)}월`;
                              })()}
                            </div>
                            
                            <button 
                              onClick={() => {
                                const currentDate = orderFilterMonth ? new Date(orderFilterMonth + '-01') : new Date();
                                currentDate.setMonth(currentDate.getMonth() + 1);
                                setOrderFilterMonth(`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`);
                              }}
                              className="p-2 hover:bg-white/20 rounded-full transition-colors"
                            >
                              <ChevronRight size={24} />
                            </button>
                          </div>
                          {/* 하단 전체보기 버튼 */}
                          {orderFilterMonth && (
                            <button 
                              onClick={() => setOrderFilterMonth('')} 
                              className="absolute bottom-4 text-[10px] font-bold opacity-70 hover:opacity-100 transition-opacity"
                            >
                              전체 내역 보기
                            </button>
                          )}
                        </div>

                        {/* 카드 2: 총 수기발주 건수 */}
                        <div className="bg-[#1f77ff] text-white p-6 rounded-3xl shadow-sm flex flex-col min-h-[140px]">
                          <span className="text-xs font-bold opacity-90 mb-4">총 수기발주 건수</span>
                          <div className="text-4xl font-black flex items-baseline gap-1 mt-auto">
                            {totalOrders} <span className="text-sm font-bold opacity-90">건</span>
                          </div>
                        </div>

                        {/* 카드 3: 상품별 발주 건수 */}
                        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm min-h-[140px] flex flex-col">
                          <span className="text-xs font-bold text-slate-500 mb-4">상품별 발주 건수</span>
                          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                            {sortedProducts.length === 0 ? (
                              <div className="text-xs text-slate-400">데이터 없음</div>
                            ) : (
                              sortedProducts.map(([prod, count]) => (
                                <div className="flex justify-between items-center text-xs" key={prod}>
                                  <span className="font-bold text-slate-700 truncate mr-2" title={prod}>{prod}</span>
                                  <span className="font-black text-[#6b5bf8] shrink-0">{count}건</span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* 카드 4: 본부별(공급사별) 발주 건수 */}
                        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm min-h-[140px] flex flex-col">
                          <span className="text-xs font-bold text-slate-500 mb-4">본부별 발주 건수</span>
                          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                            {sortedSuppliers.length === 0 ? (
                              <div className="text-xs text-slate-400">데이터 없음</div>
                            ) : (
                              sortedSuppliers.map(([sup, count]) => (
                                <div className="flex justify-between items-center text-xs" key={sup}>
                                  <span className="font-bold text-slate-700 truncate mr-2" title={sup}>{sup}</span>
                                  <span className="font-black text-[#1f77ff] shrink-0">{count}건</span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 필터 바 */}
                  <div className="bg-white border border-slate-200 p-6 rounded-[2rem] flex flex-wrap gap-4 items-center justify-between shadow-sm">
                    <div className="flex flex-wrap gap-3 items-center">
                      {/* 공급사 필터 */}
                      <select
                        value={orderFilterSupplier}
                        onChange={(e) => setOrderFilterSupplier(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold text-slate-800 outline-none"
                      >
                        <option value="">공급사: 전체</option>
                        {suppliers.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                      </select>

                      {/* 정산방식 필터 */}
                      <select
                        value={orderFilterSettlement}
                        onChange={(e) => setOrderFilterSettlement(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold text-slate-800 outline-none"
                      >
                        <option value="">정산방식: 전체</option>
                        <option value="건바이건">건바이건</option>
                        <option value="월정산">월정산</option>
                      </select>

                      {/* 발주상태 필터 */}
                      <select
                        value={orderFilterStatus}
                        onChange={(e) => setOrderFilterStatus(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold text-slate-800 outline-none"
                      >
                        <option value="">발주상태: 전체</option>
                        <option value="발주대기">발주대기</option>
                        <option value="발주완료">발주완료</option>
                        <option value="배송중">배송중</option>
                        <option value="배송완료">배송완료</option>
                      </select>

                      {/* 월별 필터 */}
                      <input
                        type="month"
                        value={orderFilterMonth}
                        onChange={(e) => setOrderFilterMonth(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold text-slate-800 outline-none focus:border-indigo-600"
                      />

                      {/* 텍스트 검색 필터 */}
                      <input
                        type="text"
                        placeholder="고객명, 제품명 검색..."
                        value={orderSearchTerm}
                        onChange={(e) => setOrderSearchTerm(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold text-slate-800 outline-none focus:border-indigo-600 min-w-[200px]"
                      />
                    </div>

                    <button
                      onClick={fetchOrders}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-white text-slate-400 hover:text-slate-650 transition-colors shadow-sm"
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>

                  {/* 발주 목록 테이블 */}
                  {isLoadingOrders ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white border border-slate-200 animate-pulse rounded-2xl"></div>)}
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="bg-white border border-slate-200 p-20 rounded-[2.5rem] text-center shadow-sm">
                      <p className="text-slate-400 font-bold text-sm">발주 내역이 존재하지 않습니다.</p>
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
                      {/* 일괄 액션 패널 */}
                      {selectedOrderIds.length > 0 && (
                        <div className="bg-indigo-50/70 border-b border-indigo-100/50 p-4 px-6 flex justify-between items-center transition-all">
                          <span className="text-xs font-black text-indigo-700">
                            {selectedOrderIds.length}건 선택됨
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={handleCopySettlementText}
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-sm transition-all"
                            >
                              <Copy size={12} /> 총무팀 전달 복사
                            </button>
                            <button
                              onClick={handleOpenPreviewModal}
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm transition-all"
                            >
                              <FileText size={12} /> 발주서 출력 / 엑셀 다운
                            </button>
                            <button
                              onClick={() => handleUpdateOrdersStatus('발주대기')}
                              className="inline-flex items-center px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-xl text-xs font-black shadow-sm transition-all"
                            >
                              발주대기
                            </button>
                            <button
                              onClick={() => handleUpdateOrdersStatus('발주완료')}
                              className="inline-flex items-center px-3 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-xl text-xs font-black shadow-sm transition-all"
                            >
                              발주완료
                            </button>
                            <button
                              onClick={() => handleUpdateOrdersStatus('배송중')}
                              className="inline-flex items-center px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl text-xs font-black shadow-sm transition-all"
                            >
                              배송중
                            </button>
                            <button
                              onClick={() => handleUpdateOrdersStatus('배송완료')}
                              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm transition-all"
                            >
                              <Check size={12} /> 배송완료
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50">
                              <th className="px-2 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider w-10">
                                <input
                                  type="checkbox"
                                  checked={
                                    orders.length > 0 &&
                                    orders.filter(o => {
                                      const mSup = !orderFilterSupplier || o.supplierName === orderFilterSupplier;
                                      const mSet = !orderFilterSettlement || o.settlementType === orderFilterSettlement;
                                      const mSta = !orderFilterStatus || o.status === orderFilterStatus;
                                      const mSearch = !orderSearchTerm || 
                                        (o.customerName && o.customerName.includes(orderSearchTerm)) || 
                                        (o.productName && o.productName.includes(orderSearchTerm));
                                      let mMonth = true;
                                      if (orderFilterMonth && o.createdAt) {
                                        const [y, m] = orderFilterMonth.split('-');
                                        mMonth = o.createdAt.startsWith(`${y}. ${parseInt(m)}.`);
                                      }
                                      return mSup && mSet && mSta && mSearch && mMonth;
                                    }).every(o => selectedOrderIds.includes(o.id))
                                  }
                                  onChange={(e) => {
                                    const filtered = orders.filter(o => {
                                      const mSup = !orderFilterSupplier || o.supplierName === orderFilterSupplier;
                                      const mSet = !orderFilterSettlement || o.settlementType === orderFilterSettlement;
                                      const mSta = !orderFilterStatus || o.status === orderFilterStatus;
                                      const mSearch = !orderSearchTerm || 
                                        (o.customerName && o.customerName.includes(orderSearchTerm)) || 
                                        (o.productName && o.productName.includes(orderSearchTerm));
                                      let mMonth = true;
                                      if (orderFilterMonth && o.createdAt) {
                                        const [y, m] = orderFilterMonth.split('-');
                                        mMonth = o.createdAt.startsWith(`${y}. ${parseInt(m)}.`);
                                      }
                                      return mSup && mSet && mSta && mSearch && mMonth;
                                    });
                                    if (e.target.checked) {
                                      setSelectedOrderIds(filtered.map(o => o.id));
                                    } else {
                                      setSelectedOrderIds([]);
                                    }
                                  }}
                                  className="accent-indigo-600 w-4 h-4 rounded cursor-pointer"
                                />
                              </th>
                              <th className="px-2 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">발주일시</th>
                              <th className="px-2 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">공급사</th>
                              <th className="px-2 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">공급 제품</th>
                              <th className="px-2 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">고객 정보</th>
                              <th className="px-2 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">공급가</th>
                              <th className="px-2 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">배송 정보</th>
                              <th className="px-2 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">상태 / 작업</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {orders
                              .filter(o => {
                                const mSup = !orderFilterSupplier || o.supplierName === orderFilterSupplier;
                                const mSet = !orderFilterSettlement || o.settlementType === orderFilterSettlement;
                                const mSta = !orderFilterStatus || o.status === orderFilterStatus;
                                const mSearch = !orderSearchTerm || 
                                  (o.customerName && o.customerName.includes(orderSearchTerm)) || 
                                  (o.productName && o.productName.includes(orderSearchTerm));
                                let mMonth = true;
                                if (orderFilterMonth && o.createdAt) {
                                  const [y, m] = orderFilterMonth.split('-');
                                  mMonth = o.createdAt.startsWith(`${y}. ${parseInt(m)}.`);
                                }
                                return mSup && mSet && mSta && mSearch && mMonth;
                              })
                              .map((order, idx) => (
                                <tr key={order.id || idx} className="hover:bg-slate-50/50 transition-colors text-xs font-bold text-slate-700">
                                  <td className="px-2 py-3">
                                    <input
                                      type="checkbox"
                                      checked={selectedOrderIds.includes(order.id)}
                                      onChange={() => {
                                        if (selectedOrderIds.includes(order.id)) {
                                          setSelectedOrderIds(selectedOrderIds.filter(id => id !== order.id));
                                        } else {
                                          setSelectedOrderIds([...selectedOrderIds, order.id]);
                                        }
                                      }}
                                      className="accent-indigo-600 w-4 h-4 rounded cursor-pointer"
                                    />
                                  </td>
                                  <td className="px-2 py-3 whitespace-nowrap">
                                    <div className="flex flex-col">
                                      <span className="text-slate-900 font-bold text-[11px]">{order.createdAt?.split(' ').slice(0, 3).join(' ')}</span>
                                      <span className="text-slate-400 font-normal text-[10px] mt-0.5">{order.createdAt?.split(' ').slice(3).join(' ')}</span>
                                    </div>
                                  </td>
                                  <td className="px-2 py-3 whitespace-nowrap">
                                    <span className="text-slate-800 font-black">{order.supplierName}</span>
                                  </td>
                                  <td className="px-2 py-3">
                                    <span className="text-slate-800 font-black">{order.productName}</span>
                                  </td>
                                  <td className="px-2 py-3 whitespace-nowrap">
                                    <div className="flex flex-col">
                                      <span className="text-slate-900 font-black text-sm">{order.customerName}</span>
                                      <span className="text-[10px] text-slate-400 mt-0.5 font-normal">{order.customerPhone}</span>
                                    </div>
                                  </td>
                                  <td className="px-2 py-3 whitespace-nowrap">
                                    <span className="text-indigo-600 font-black">{Number(order.price || 0).toLocaleString()}원</span>
                                  </td>
                                  <td className="px-2 py-3">
                                    <div className="flex flex-col gap-1.5 w-[160px]">
                                      <div className="flex items-center gap-1">
                                        <select 
                                          className="text-[10px] p-1.5 border border-slate-200 rounded outline-none focus:border-indigo-500 text-slate-700 bg-white flex-1"
                                          value={order.deliveryCompany || ''}
                                          onChange={(e) => {
                                            const newOrders = [...orders];
                                            const idxToUpdate = newOrders.findIndex(o => o.id === order.id);
                                            if (idxToUpdate > -1) {
                                              newOrders[idxToUpdate].deliveryCompany = e.target.value;
                                              setOrders(newOrders);
                                            }
                                          }}
                                        >
                                          <option value="">택배사</option>
                                          <option value="CJ대한통운">CJ대한통운</option>
                                          <option value="우체국택배">우체국택배</option>
                                          <option value="한진택배">한진택배</option>
                                          <option value="롯데택배">롯데택배</option>
                                          <option value="로젠택배">로젠택배</option>
                                          <option value="경동택배">경동택배</option>
                                          <option value="일양택배">일양택배</option>
                                        </select>
                                        <button
                                          onClick={async () => {
                                            if (!order.deliveryCompany || !order.trackingNumber) {
                                              alert('택배사와 운송장번호를 모두 기입해주세요.');
                                              return;
                                            }
                                            try {
                                              const res = await fetch('/api/orders', {
                                                method: 'PATCH',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                  id: order.id,
                                                  deliveryCompany: order.deliveryCompany,
                                                  trackingNumber: order.trackingNumber
                                                })
                                              });
                                              if (res.ok) {
                                                alert('저장되었습니다.');
                                              } else {
                                                const err = await res.json();
                                                alert(err.error || '저장에 실패했습니다.');
                                              }
                                            } catch (err) {
                                              alert('오류가 발생했습니다.');
                                            }
                                          }}
                                          className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 px-2.5 py-1.5 rounded text-[10px] font-black whitespace-nowrap transition-colors"
                                          title="배송 정보 저장"
                                        >
                                          저장
                                        </button>
                                        <button
                                          onClick={() => {
                                            if (!order.deliveryCompany || !order.trackingNumber) {
                                              alert('택배사와 운송장번호를 모두 기입해주세요.');
                                              return;
                                            }
                                            let trackingUrl = '';
                                            switch(order.deliveryCompany) {
                                              case 'CJ대한통운': trackingUrl = `https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo=${order.trackingNumber}`; break;
                                              case '우체국택배': trackingUrl = `https://service.epost.go.kr/trace.RetrieveDomRceptBhlRcpt.postal?invcNo=${order.trackingNumber}`; break;
                                              case '한진택배': trackingUrl = `https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&schLang=KR&wblnumText2=${order.trackingNumber}`; break;
                                              case '롯데택배': trackingUrl = `https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo=${order.trackingNumber}`; break;
                                              case '로젠택배': trackingUrl = `https://www.ilogen.com/web/personal/trace/${order.trackingNumber}`; break;
                                              case '경동택배': trackingUrl = `https://kdexp.com/service/delivery/search_detail.do?barcode=${order.trackingNumber}`; break;
                                              case '일양택배': trackingUrl = `https://www.ilyanglogis.com/functionality/tracking_result.asp?hawb_no=${order.trackingNumber}`; break;
                                              default: trackingUrl = `https://search.naver.com/search.naver?query=${order.deliveryCompany}+배송조회+${order.trackingNumber}`;
                                            }
                                            window.open(trackingUrl, '_blank');
                                          }}
                                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-2.5 py-1.5 rounded text-[10px] font-black whitespace-nowrap transition-colors"
                                          title="배송 조회"
                                        >
                                          조회
                                        </button>
                                      </div>
                                      <input 
                                        type="text" 
                                        className="text-[10px] p-1.5 border border-slate-200 rounded w-full outline-none focus:border-indigo-500 text-slate-700" 
                                        placeholder="운송장번호"
                                        value={order.trackingNumber || ''}
                                        onChange={(e) => {
                                          const newOrders = [...orders];
                                          const idxToUpdate = newOrders.findIndex(o => o.id === order.id);
                                          if (idxToUpdate > -1) {
                                            newOrders[idxToUpdate].trackingNumber = e.target.value;
                                            setOrders(newOrders);
                                          }
                                        }}
                                      />
                                    </div>
                                  </td>
                                  <td className="px-2 py-3">
                                    <div className="flex flex-col gap-2 items-start">
                                      <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-black ${
                                        order.status === '발주대기' ? 'bg-amber-50 text-amber-600' :
                                        order.status === '발주완료' ? 'bg-indigo-50 text-indigo-600' :
                                        order.status === '배송중' ? 'bg-blue-50 text-blue-600' :
                                        order.status === '배송완료' ? 'bg-emerald-50 text-emerald-600' :
                                        'bg-slate-100 text-slate-600'
                                      }`}>
                                        {order.status}
                                      </span>
                                      <div className="flex gap-2">
                                        <button
                                        onClick={() => {
                                                                                    const supplier = suppliers.find(s => s.name === order.supplierName);
                                          let template = supplier?.template || '';
                                          if (order.supplierName?.toUpperCase() === 'KLJ') {
                                            if (!template || template.trim() === '' || template.includes('[발주서]')) {
                                              template = KLJ_DEFAULT_TEMPLATE;
                                            }
                                          }
                                          const text = getSubstitutedTemplate(
                                            template,
                                            order.customerName,
                                            order.customerPhone,
                                            order.customerAddress,
                                            order.productName,
                                            order.price,
                                            order.settlementType,
                                            order.supplierName,
                                            supplier?.bankName || '',
                                            supplier?.accountNumber || '',
                                            supplier?.accountHolder || '',
                                            order.memo,
                                            order.deliveryCompany || '',
                                            order.trackingNumber || ''
                                          );
                                          setFinalOrderText(text);
                                          setIsOrderResultModalOpen(true);
                                        }}
                                        className="p-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-500"
                                        title="발주서 다시 보기"
                                      >
                                        <Eye size={12} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteOrder(order.id)}
                                        className="p-1.5 bg-red-50 border border-red-150 hover:bg-red-650 hover:text-white rounded-lg text-red-600"
                                        title="삭제"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 2. 공급사 설정 탭 */}
              {orderSubTab === 'suppliers' && (
                <div className="grid lg:grid-cols-3 gap-8 items-start">
                  {/* 공급사 추가/수정 폼 */}
                  <div className="lg:col-span-1 bg-white border border-slate-200 p-8 rounded-[2.5rem] space-y-6 shadow-sm">
                    <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
                      <Plus size={18} className="text-indigo-600" />
                      <h2 className="text-md font-black text-slate-850">신규 공급사 설정</h2>
                    </div>

                    <form onSubmit={handleCreateSupplier} className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">공급사명</label>
                                                <input
                          type="text"
                          value={newSupplierName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewSupplierName(val);
                            if (val.trim().toUpperCase() === 'KLJ') {
                              setNewSupplierTemplate(KLJ_DEFAULT_TEMPLATE);
                            }
                          }}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white outline-none rounded-xl py-3 px-4 text-xs font-bold text-slate-800"
                          placeholder="예: 삼성전자"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">정산방식</label>
                        <div className="flex gap-2">
                          {['건바이건', '월정산'].map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setNewSupplierSettlement(t)}
                              className={`flex-1 py-3 text-xs font-bold rounded-xl border transition-all ${newSupplierSettlement === t ? 'border-indigo-600 bg-indigo-50/30 text-indigo-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">은행명</label>
                          <input
                            type="text"
                            value={newSupplierBank}
                            onChange={(e) => setNewSupplierBank(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white outline-none rounded-xl py-3 px-4 text-xs font-bold text-slate-800"
                            placeholder="예: 국민은행"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">예금주</label>
                          <input
                            type="text"
                            value={newSupplierHolder}
                            onChange={(e) => setNewSupplierHolder(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white outline-none rounded-xl py-3 px-4 text-xs font-bold text-slate-800"
                            placeholder="예: (주)에스"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">계좌번호</label>
                        <input
                          type="text"
                          value={newSupplierAccount}
                          onChange={(e) => setNewSupplierAccount(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white outline-none rounded-xl py-3 px-4 text-xs font-bold text-slate-800"
                          placeholder="계좌번호 입력 ('-' 제외)"
                        />
                      </div>

                                            <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">발주서 양식 템플릿</label>
                        <textarea
                          value={newSupplierTemplate}
                          onChange={(e) => setNewSupplierTemplate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white outline-none rounded-xl py-3 px-4 text-xs font-bold text-slate-800 min-h-[200px]"
                          placeholder="치환변수 사용 가능: {고객명}, {연락처}, {주소}, {제품명}, {공급가}, {발주일자}, {정산방식}, {메모}"
                          required
                        />
                        <p className="text-[10px] text-slate-400 mt-1 font-bold leading-normal">
                          * 엑셀 복사용(탭 분할) 양식은 탭 구분선 위치에 <code className="text-indigo-600 font-mono font-black">\t</code>를 적어주세요. (예: 송하인\t수취인\t...)
                        </p>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmittingSupplier}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center shadow-sm disabled:opacity-50"
                      >
                        {isSubmittingSupplier ? <Loader2 size={16} className="animate-spin" /> : '공급사 설정 저장'}
                      </button>
                    </form>
                  </div>

                  {/* 공급사 목록 */}
                  <div className="lg:col-span-2 space-y-4">
                    {isLoadingSuppliers ? (
                      <div className="h-40 bg-white border border-slate-200 animate-pulse rounded-[2.5rem]"></div>
                    ) : suppliers.length === 0 ? (
                      <div className="bg-white border border-slate-200 p-20 rounded-[2.5rem] text-center shadow-sm">
                        <p className="text-slate-400 font-bold text-sm">등록된 공급사가 없습니다.</p>
                      </div>
                    ) : (
                      <div className="grid md:grid-cols-2 gap-4">
                        {suppliers.map((s, idx) => (
                          <div key={idx} className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm flex flex-col justify-between">
                            <div className="space-y-4">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h3 className="text-sm font-black text-slate-850">{s.name}</h3>
                                  <span className="inline-block mt-1 px-2.5 py-0.5 bg-slate-100 rounded-full text-[10px] text-slate-600 font-black">{s.settlementType}</span>
                                </div>
                                <button
                                  onClick={() => handleDeleteSupplier(s.name)}
                                  className="p-1.5 bg-red-50 border border-red-150 hover:bg-red-650 hover:text-white rounded-lg text-red-600 transition-colors"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>

                              <div className="text-[11px] text-slate-650 space-y-1 bg-slate-50 p-3.5 rounded-xl border border-slate-100 font-mono">
                                <div>은행: {s.bankName || '-'}</div>
                                <div>예금주: {s.accountHolder || '-'}</div>
                                <div>계좌: {s.accountNumber || '-'}</div>
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                setNewSupplierName(s.name);
                                setNewSupplierSettlement(s.settlementType);
                                setNewSupplierBank(s.bankName);
                                setNewSupplierAccount(s.accountNumber);
                                setNewSupplierHolder(s.accountHolder);
                                setNewSupplierTemplate(s.template);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="mt-4 w-full py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-black rounded-xl transition-all"
                            >
                              설정 불러와서 편집
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 3. 공급제품 리스트 탭 */}
              {orderSubTab === 'products' && (
                <div className="grid lg:grid-cols-3 gap-8 items-start">
                  {/* 공급제품 등록 폼 */}
                  <div className="lg:col-span-1 bg-white border border-slate-200 p-8 rounded-[2.5rem] space-y-6 shadow-sm">
                    <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
                      <Plus size={18} className="text-indigo-600" />
                      <h2 className="text-md font-black text-slate-850">신규 공급제품 등록</h2>
                    </div>

                    <form onSubmit={handleCreateSupplyProduct} className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">제품명</label>
                        <input
                          type="text"
                          value={newProductName}
                          onChange={(e) => setNewProductName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white outline-none rounded-xl py-3 px-4 text-xs font-bold text-slate-800"
                          placeholder="예: 안마의자 메디컬팬텀"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">공급사 선택</label>
                        <select
                          value={newProductSupplier}
                          onChange={(e) => setNewProductSupplier(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white outline-none rounded-xl py-3.5 px-4 text-xs font-bold text-slate-800"
                          required
                        >
                          <option value="">공급사를 선택하세요</option>
                          {suppliers.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">공급가 (원)</label>
                        <input
                          type="number"
                          value={newProductPrice}
                          onChange={(e) => setNewProductPrice(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white outline-none rounded-xl py-3 px-4 text-xs font-bold text-slate-800"
                          placeholder="숫자만 입력"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmittingSupplyProduct}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center shadow-sm disabled:opacity-50"
                      >
                        {isSubmittingSupplyProduct ? <Loader2 size={16} className="animate-spin" /> : '공급제품 등록'}
                      </button>
                    </form>
                  </div>

                  {/* 공급제품 목록 테이블 */}
                  <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
                    {isLoadingSupplyProducts ? (
                      <div className="h-40 bg-white animate-pulse rounded-[2.5rem]"></div>
                    ) : supplyProducts.length === 0 ? (
                      <div className="p-20 text-center text-slate-400 font-bold text-sm">등록된 제품이 없습니다.</div>
                    ) : (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/50">
                            <th className="px-2 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">제품명</th>
                            <th className="px-2 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">공급사명</th>
                            <th className="px-2 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">공급가</th>
                            <th className="px-2 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">작업</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {supplyProducts.map((p, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors text-xs font-bold text-slate-700">
                              <td className="px-2 py-3 font-black text-slate-900">{p.name}</td>
                              <td className="px-2 py-3">{p.supplierName}</td>
                              <td className="px-2 py-3 text-indigo-600 font-black">{Number(p.price || 0).toLocaleString()}원</td>
                              <td className="px-2 py-3">
                                <button
                                  onClick={() => handleDeleteSupplyProduct(p.name)}
                                  className="p-1.5 bg-red-50 border border-red-150 hover:bg-red-650 hover:text-white rounded-lg text-red-600 transition-colors"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
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
                    onClick={() => {
                      const matchedLog = logs.find(l => l['document_id'] === selectedPdfId);
                      handleDownloadAsImage(selectedPdfId || undefined, matchedLog ? getFormattedFileName(matchedLog) : undefined);
                    }}
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

      {/* 1. 수기 발주 생성 모달 */}
      <AnimatePresence>
        {isOrderModalOpen && selectedLogForOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto"
            onClick={() => setIsOrderModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-[2rem] w-full max-w-3xl flex flex-col shadow-2xl overflow-hidden border border-slate-200 max-h-[92vh]"
            >
              {/* 헤더 */}
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                    <Plus size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800">수기 발주 등록</h3>
                    <p className="text-[10px] font-bold text-slate-400">선택된 계약자의 정보에 공급제품을 매핑하여 발주서를 발송/기록합니다.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsOrderModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* 본문 콘텐츠: 상하 레이아웃 */}
              <div className="flex-1 overflow-y-auto flex flex-col custom-scrollbar">
                {/* 상단: 고객 정보 입력 폼 */}
                <form onSubmit={handleCreateOrder} className="p-6 border-b border-slate-100 bg-slate-50/20 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* 계약고객명 */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">계약고객명</label>
                      <input
                        type="text"
                        value={orderCustomerName}
                        onChange={(e) => setOrderCustomerName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white outline-none rounded-xl py-2 px-3 text-xs font-bold text-slate-800"
                        required
                      />
                    </div>

                    {/* 휴대폰 번호 */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">휴대폰 번호</label>
                      <input
                        type="text"
                        value={orderCustomerPhone}
                        onChange={(e) => setOrderCustomerPhone(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white outline-none rounded-xl py-2 px-3 text-xs font-bold text-slate-800"
                        required
                      />
                    </div>

                    {/* 발주 지정 제품 */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">발주 지정 제품 (공급제품리스트)</label>
                      <select
                        value={orderSelectedProduct}
                        onChange={(e) => setOrderSelectedProduct(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white outline-none rounded-xl py-2 px-3 text-xs font-bold text-slate-800"
                        required
                      >
                        <option value="">발주할 제품을 선택하세요</option>
                        {supplyProducts.map(p => (
                          <option key={p.name} value={p.name}>
                            [{p.supplierName}] {p.name} - {Number(p.price || 0).toLocaleString()}원
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    {/* 배송지 주소 */}
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">배송지 주소</label>
                      <input
                        type="text"
                        value={orderCustomerAddress}
                        onChange={(e) => setOrderCustomerAddress(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white outline-none rounded-xl py-2 px-3 text-xs font-bold text-slate-800"
                        required
                      />
                    </div>

                    {/* 메모 / 특이사항 */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">메모 / 특이사항</label>
                      <input
                        type="text"
                        value={orderMemo}
                        onChange={(e) => setOrderMemo(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white outline-none rounded-xl py-2 px-3 text-xs font-bold text-slate-800"
                        placeholder="예: 경비실에 보관해 주세요."
                      />
                    </div>

                    {/* 초기 발주 상태 */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">상태 (처음값)</label>
                      <select
                        value={orderStatus}
                        onChange={(e) => setOrderStatus(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white outline-none rounded-xl py-2 px-3 text-xs font-bold text-slate-800"
                      >
                        <option value="발주대기">발주대기</option>
                        <option value="발주완료">발주완료</option>
                        <option value="배송중">배송중</option>
                        <option value="배송완료">배송완료</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isSubmittingOrder || !orderSelectedProduct}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                    >
                      {isSubmittingOrder ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      수기 발주 등록
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. 발주서 완성 팝업 (인쇄 및 복사용) */}
      <AnimatePresence>
        {isOrderResultModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setIsOrderResultModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-[2rem] w-full max-w-5xl flex flex-col shadow-2xl overflow-hidden border border-slate-200"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800">완성된 발주서 양식</h3>
                    <p className="text-[10px] font-bold text-slate-400">발주서 텍스트를 복사하거나 인쇄할 수 있습니다.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsOrderResultModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-650 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

                            <div className="p-6 space-y-4">
                {/* 탭 UI */}
                {finalOrderGroups.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
                    {finalOrderGroups.map(group => (
                      <button
                        key={group.supplierName}
                        onClick={() => setActivePreviewTab(group.supplierName)}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all shrink-0 ${
                          activePreviewTab === group.supplierName 
                            ? 'bg-indigo-600 text-white shadow-md' 
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {group.supplierName}
                      </button>
                    ))}
                  </div>
                )}

                <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl text-xs font-mono text-slate-700 overflow-auto custom-scrollbar max-h-[400px]">
                  {renderOrderPreview(finalOrderGroups.find(g => g.supplierName === activePreviewTab)?.text || finalOrderText)}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      if (!finalOrderText) return;
                      const todayStr = new Date().toLocaleDateString('ko-KR').replace(/\./g, '').replace(/\s/g, '-');
                      const fileName = `${todayStr}_발주서.xlsx`;
                      
                      const wb = XLSX.utils.book_new();
                      
                      const blocks = finalOrderText.split('==== [');
                      blocks.forEach(block => {
                        if (!block.trim()) return;
                        const endIdx = block.indexOf('] 발주 내역 ====');
                        if (endIdx === -1) return;
                        
                        let sheetName = block.substring(0, endIdx).substring(0, 31);
                        
                        const firstNewLineIdx = block.indexOf('\n');
                        if (firstNewLineIdx === -1) return;
                        
                        const actualContent = block.substring(firstNewLineIdx).trim();
                        if (!actualContent) return;

                        const rows = actualContent.split('\n').map(line => line.split('\t'));
                        const ws = XLSX.utils.aoa_to_sheet(rows);
                        XLSX.utils.book_append_sheet(wb, ws, sheetName);
                      });

                      if (wb.SheetNames.length === 0) {
                        const rows = finalOrderText.split('\n').map(line => line.split('\t'));
                        const ws = XLSX.utils.aoa_to_sheet(rows);
                        XLSX.utils.book_append_sheet(wb, ws, "발주 데이터");
                      }

                      XLSX.writeFile(wb, fileName);
                    }}
                    className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Download size={14} /> 엑셀 다운로드 (전체 거래처)
                  </button>
                  <button
                    onClick={() => {
                      const activeText = finalOrderGroups.find(g => g.supplierName === activePreviewTab)?.text || finalOrderText;
                      navigator.clipboard.writeText(activeText);
                      alert(`[${activePreviewTab || '전체'}] 발주서 내용이 클립보드에 복사되었습니다.`);
                    }}
                    className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Copy size={14} /> 현재 탭 복사
                  </button>
                  <button
                    onClick={() => {
                      const activeText = finalOrderGroups.find(g => g.supplierName === activePreviewTab)?.text || finalOrderText;
                      const printWindow = window.open('', '_blank');
                      if (printWindow) {
                        printWindow.document.write(`<html><head><title>발주서 인쇄</title><style>body { font-family: monospace; white-space: pre-wrap; padding: 40px; font-size: 14px; line-height: 1.6; color: #333; }</style></head><body>${activeText.replace(/\n/g, '<br>')}</body></html>`);
                        printWindow.document.close();
                        printWindow.print();
                      }
                    }}
                    className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 border border-slate-200"
                  >
                    <ExternalLink size={14} /> 현재 탭 인쇄
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
