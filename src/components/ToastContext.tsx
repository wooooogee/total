'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  X, 
  HelpCircle, 
  RotateCw, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check 
} from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

export interface AlertOptions {
  title?: string;
  message: string;
  type?: 'error' | 'warning' | 'success' | 'info';
  details?: string;
  confirmText?: string;
  actionButton?: {
    text: string;
    onClick: () => void;
  };
  onConfirm?: () => void;
}

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel?: () => void;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  showAlert: (options: AlertOptions | string) => void;
  showConfirm: (options: ConfirmOptions) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [alertModal, setAlertModal] = useState<AlertOptions | null>(null);
  const [confirmModal, setConfirmModal] = useState<ConfirmOptions | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const toast = useCallback((message: string, type: ToastType = 'info', title?: string, duration = 3500) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type, title, duration }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const showAlert = useCallback((options: AlertOptions | string) => {
    setShowDetails(false);
    setCopied(false);
    if (typeof options === 'string') {
      setAlertModal({
        title: '알림',
        message: options,
        type: 'info'
      });
    } else {
      setAlertModal(options);
    }
  }, []);

  const showConfirm = useCallback((options: ConfirmOptions) => {
    setConfirmModal(options);
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Override browser window.alert to automatically use our stylish showAlert popup
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const originalAlert = window.alert;

    window.alert = (message?: any) => {
      const msgStr = String(message ?? '');
      
      // Server Action hash mismatch detection
      if (
        msgStr.includes('Server Action') || 
        msgStr.includes('failed-to-find-server-action') ||
        msgStr.includes('was not found on the server')
      ) {
        setAlertModal({
          title: '서버 업데이트 안내',
          message: '시스템이 최신 버전으로 업데이트되었습니다. 페이지를 새로고침 하시면 정상 작동합니다.',
          type: 'warning',
          details: msgStr,
          actionButton: {
            text: '페이지 새로고침',
            onClick: () => window.location.reload()
          }
        });
      } else {
        setAlertModal({
          title: '알림',
          message: msgStr,
          type: 'info'
        });
      }
    };

    return () => {
      window.alert = originalAlert;
    };
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ToastContext.Provider value={{ toast, showAlert, showConfirm }}>
      {children}

      {/* Floating Toast Container */}
      <div className="fixed top-5 right-5 z-[99999] flex flex-col gap-3 max-w-md w-full pointer-events-none px-4 sm:px-0">
        <AnimatePresence mode="popLayout">
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -25, scale: 0.9, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.85, y: -10, transition: { duration: 0.15 } }}
              className={`pointer-events-auto w-full backdrop-blur-2xl rounded-2xl p-4 shadow-2xl shadow-slate-950/20 border flex items-start gap-3.5 relative overflow-hidden transition-all ${
                t.type === 'error'
                  ? 'bg-rose-950/90 border-rose-800/60 text-rose-100 dark:bg-rose-950/95'
                  : t.type === 'warning'
                  ? 'bg-amber-950/90 border-amber-800/60 text-amber-100 dark:bg-amber-950/95'
                  : t.type === 'success'
                  ? 'bg-emerald-950/90 border-emerald-800/60 text-emerald-100 dark:bg-emerald-950/95'
                  : 'bg-slate-900/90 border-slate-700/60 text-slate-100 dark:bg-slate-900/95'
              }`}
            >
              {/* Left Accent Icon Pill */}
              <div className={`shrink-0 p-2 rounded-xl flex items-center justify-center ${
                t.type === 'error' ? 'bg-rose-500/20 text-rose-400' :
                t.type === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                t.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                'bg-indigo-500/20 text-indigo-400'
              }`}>
                {t.type === 'success' && <CheckCircle2 size={20} />}
                {t.type === 'error' && <AlertCircle size={20} />}
                {t.type === 'warning' && <AlertTriangle size={20} />}
                {t.type === 'info' && <Info size={20} />}
              </div>

              {/* Message */}
              <div className="flex-1 min-w-0 pr-2">
                {t.title && <h4 className="text-xs font-black tracking-wide uppercase opacity-90 mb-0.5">{t.title}</h4>}
                <p className="text-xs font-bold leading-relaxed break-words opacity-95">{t.message}</p>
              </div>

              {/* Close Button */}
              <button
                onClick={() => removeToast(t.id)}
                className="shrink-0 text-white/50 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X size={15} />
              </button>

              {/* Progress bar animation */}
              <motion.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: (t.duration || 3500) / 1000, ease: 'linear' }}
                className={`absolute bottom-0 left-0 right-0 h-1 origin-left ${
                  t.type === 'error' ? 'bg-rose-400/60' :
                  t.type === 'warning' ? 'bg-amber-400/60' :
                  t.type === 'success' ? 'bg-emerald-400/60' :
                  'bg-indigo-400/60'
                }`}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Styled Alert Modal (Replaces native browser alert popups) */}
      <AnimatePresence>
        {alertModal && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 overflow-hidden relative"
            >
              {/* Top Accent Gradient Bar */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                alertModal.type === 'error' ? 'bg-gradient-to-r from-rose-500 via-red-500 to-pink-500' :
                alertModal.type === 'warning' ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500' :
                alertModal.type === 'success' ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500' :
                'bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500'
              }`} />

              <div className="flex items-start gap-4 pt-2">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
                  alertModal.type === 'error' ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/80 dark:text-rose-400' :
                  alertModal.type === 'warning' ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/80 dark:text-amber-400' :
                  alertModal.type === 'success' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400' :
                  'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-400'
                }`}>
                  {alertModal.type === 'error' && <AlertCircle size={26} />}
                  {alertModal.type === 'warning' && <AlertTriangle size={26} />}
                  {alertModal.type === 'success' && <CheckCircle2 size={26} />}
                  {(!alertModal.type || alertModal.type === 'info') && <Info size={26} />}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100 leading-snug">
                    {alertModal.title || (
                      alertModal.type === 'error' ? '오류 발생' :
                      alertModal.type === 'warning' ? '주의' :
                      alertModal.type === 'success' ? '완료' : '안내'
                    )}
                  </h3>
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed break-words">
                    {alertModal.message}
                  </p>
                </div>
              </div>

              {/* Collapsible Technical Details (e.g. Server Action Hash or Stack Trace) */}
              {alertModal.details && (
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-950/50">
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                  >
                    <span>기술적 오류 상세 정보</span>
                    {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {showDetails && (
                    <div className="p-3 border-t border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300 bg-slate-100/70 dark:bg-slate-900/80 break-all space-y-2">
                      <div className="max-h-36 overflow-y-auto pr-1 select-text">
                        {alertModal.details}
                      </div>
                      <button
                        onClick={() => copyToClipboard(alertModal.details || '')}
                        className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer pt-1"
                      >
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                        {copied ? '복사됨!' : '오류 내용 복사하기'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Modal Buttons */}
              <div className="flex items-center gap-2 pt-2">
                {alertModal.actionButton && (
                  <button
                    onClick={() => {
                      alertModal.actionButton?.onClick();
                      setAlertModal(null);
                    }}
                    className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCw size={14} />
                    {alertModal.actionButton.text}
                  </button>
                )}

                <button
                  onClick={() => {
                    if (alertModal.onConfirm) alertModal.onConfirm();
                    setAlertModal(null);
                  }}
                  className={`flex-1 py-3 px-4 rounded-xl font-black text-xs text-white transition-all shadow-lg cursor-pointer ${
                    alertModal.type === 'error'
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                      : alertModal.type === 'warning'
                      ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                      : alertModal.type === 'success'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                  }`}
                >
                  {alertModal.confirmText || '확인'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Styled Confirm Modal */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-5"
            >
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                  confirmModal.type === 'danger' ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/80 dark:text-rose-400' :
                  confirmModal.type === 'warning' ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/80 dark:text-amber-400' :
                  'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-400'
                }`}>
                  {confirmModal.type === 'danger' ? <AlertCircle size={22} /> : <HelpCircle size={22} />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                    {confirmModal.title || '확인'}
                  </h3>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1 leading-normal break-words">
                    {confirmModal.message}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => {
                    if (confirmModal.onCancel) confirmModal.onCancel();
                    setConfirmModal(null);
                  }}
                  className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition-all cursor-pointer"
                >
                  {confirmModal.cancelText || '취소'}
                </button>
                <button
                  onClick={() => {
                    confirmModal.onConfirm();
                    setConfirmModal(null);
                  }}
                  className={`flex-1 py-3 px-4 rounded-xl font-black text-xs text-white transition-all shadow-lg cursor-pointer ${
                    confirmModal.type === 'danger'
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                  }`}
                >
                  {confirmModal.confirmText || '확인'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      toast: (msg: string, type: ToastType = 'info') => {
        if (typeof window !== 'undefined') window.alert(msg);
      },
      showAlert: (opts: AlertOptions | string) => {
        const message = typeof opts === 'string' ? opts : opts.message;
        if (typeof window !== 'undefined') window.alert(message);
      },
      showConfirm: (opts: ConfirmOptions) => {
        if (typeof window !== 'undefined' && window.confirm(opts.message)) {
          opts.onConfirm();
        }
      }
    };
  }
  return context;
};
