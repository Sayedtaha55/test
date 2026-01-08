
import React, { useState, useEffect, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string | any;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string | any, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string | any, type: ToastType) => {
    const id = Date.now();
    // نضمن أننا نخزن الرسالة بشكل آمن
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-6 left-6 z-[999] flex flex-col gap-3 w-full max-w-sm" dir="rtl">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: -50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`p-5 rounded-[1.5rem] shadow-2xl flex items-center justify-between gap-4 backdrop-blur-xl border ${
                toast.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-600' :
                toast.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-600' :
                'bg-slate-900 border-white/10 text-white'
              }`}
            >
              <div className="flex items-center gap-4">
                {toast.type === 'success' && <CheckCircle2 size={24} />}
                {toast.type === 'error' && <AlertCircle size={24} />}
                {toast.type === 'info' && <Info size={24} className="text-[#00E5FF]" />}
                <p className="font-black text-sm">
                  {typeof toast.message === 'object' ? JSON.stringify(toast.message) : String(toast.message)}
                </p>
              </div>
              <button onClick={() => removeToast(toast.id)} className="opacity-40 hover:opacity-100 transition-opacity">
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};
