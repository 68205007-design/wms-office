import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, Info, XCircle, X } from 'lucide-react';

const ToastContext = createContext(null);

const styles = {
  success: { icon: CheckCircle2, cls: 'border-emerald-200 bg-white text-emerald-700', bar: 'bg-emerald-500' },
  error: { icon: XCircle, cls: 'border-red-200 bg-white text-red-700', bar: 'bg-red-500' },
  info: { icon: Info, cls: 'border-blue-200 bg-white text-blue-700', bar: 'bg-blue-500' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback(
    (type, message) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((t) => [...t.slice(-3), { id, type, message }]);
      setTimeout(() => remove(id), type === 'error' ? 6000 : 3500);
    },
    [remove],
  );

  const toast = {
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
        {toasts.map((t) => {
          const s = styles[t.type];
          const Icon = s.icon;
          return (
            <div
              key={t.id}
              className={`pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-xl border p-3.5 pr-9 shadow-lift animate-slide-in ${s.cls}`}
            >
              <span className={`absolute inset-y-0 left-0 w-1 ${s.bar}`} />
              <Icon className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-sm font-medium text-slate-700">{t.message}</p>
              <button onClick={() => remove(t.id)} className="absolute right-2 top-2 rounded p-1 text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
