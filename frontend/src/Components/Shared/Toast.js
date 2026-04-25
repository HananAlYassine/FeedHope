import React, { createContext, useCallback, useContext, useState, useEffect } from 'react';
import './Toast.css';

const ToastContext = createContext({ toast: () => {} });

let nextId = 1;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((arr) => arr.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message, opts = {}) => {
    const id = nextId++;
    const item = {
      id,
      message,
      type: opts.type || 'info',
      duration: opts.duration ?? 3500,
    };
    setToasts((arr) => [...arr, item]);
    return id;
  }, []);

  // Provide ergonomic helpers
  const value = {
    toast,
    success: (m, o) => toast(m, { ...o, type: 'success' }),
    error: (m, o) => toast(m, { ...o, type: 'error' }),
    info: (m, o) => toast(m, { ...o, type: 'info' }),
    warn: (m, o) => toast(m, { ...o, type: 'warning' }),
    dismiss: remove,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fh-toast-stack" role="region" aria-label="Notifications">
        {toasts.map((t) => (
          <ToastItem key={t.id} item={t} onDone={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem = ({ item, onDone }) => {
  useEffect(() => {
    if (!item.duration) return;
    const timer = setTimeout(onDone, item.duration);
    return () => clearTimeout(timer);
  }, [item.duration, onDone]);

  return (
    <div className={`fh-toast fh-toast--${item.type}`} role="status">
      <span className="fh-toast-dot" aria-hidden="true" />
      <span className="fh-toast-msg">{item.message}</span>
      <button className="fh-toast-close" onClick={onDone} aria-label="Dismiss">×</button>
    </div>
  );
};

export const useToast = () => useContext(ToastContext);

export default ToastProvider;
