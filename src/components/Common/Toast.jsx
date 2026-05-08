import React, { useState, useCallback, useEffect, createContext, useContext } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ─── Toast Context ────────────────────────────────────────────────────────────
const ToastContext = createContext(null);

let _addToast = null;

export const addToast = (message, type = 'info', duration = 3500) => {
  if (_addToast) _addToast(message, type, duration);
};

// ─── Provider ────────────────────────────────────────────────────────────────
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
    }
    return id;
  }, []);

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Expose global add for non-component contexts
  useEffect(() => { _addToast = add; return () => { _addToast = null; }; }, [add]);

  return (
    <ToastContext.Provider value={{ add, remove }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={remove} />
    </ToastContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
};

// ─── Toast Container ──────────────────────────────────────────────────────────
const ICONS = {
  success: <CheckCircle2 size={17} className="shrink-0" />,
  error:   <XCircle size={17} className="shrink-0" />,
  warning: <AlertTriangle size={17} className="shrink-0" />,
  info:    <Info size={17} className="shrink-0" />,
};

const STYLES = {
  success: 'bg-emerald-600 text-white shadow-emerald-600/25',
  error:   'bg-red-600 text-white shadow-red-600/25',
  warning: 'bg-amber-500 text-white shadow-amber-500/25',
  info:    'bg-slate-800 text-white shadow-slate-800/25',
};

const ToastContainer = ({ toasts, onRemove }) => {
  if (!toasts.length) return null;
  return (
    <div
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-sm font-semibold max-w-sm
            animate-in slide-in-from-right-4 fade-in duration-300
            ${STYLES[toast.type] || STYLES.info}`}
        >
          {ICONS[toast.type] || ICONS.info}
          <span className="flex-1 leading-snug">{toast.message}</span>
          <button
            onClick={() => onRemove(toast.id)}
            className="ml-1 opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Dismiss"
          >
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  );
};
