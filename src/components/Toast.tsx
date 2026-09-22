import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-16 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />,
    info: <Info className="w-4 h-4 text-amber-400 shrink-0" />
  };

  const bgStyles = {
    success: 'bg-[#0f1a18] border-emerald-500/30 text-emerald-200',
    error: 'bg-[#1f1015] border-rose-500/30 text-rose-200',
    info: 'bg-[#1a160d] border-amber-500/30 text-amber-200'
  };

  return (
    <div
      className={`pointer-events-auto flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border shadow-xl backdrop-blur-md animate-in slide-in-from-top-2 duration-200 text-xs font-medium ${bgStyles[toast.type]}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {icons[toast.type]}
        <span className="truncate">{toast.message}</span>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="p-1 rounded-md opacity-70 hover:opacity-100 hover:bg-white/10 transition"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
