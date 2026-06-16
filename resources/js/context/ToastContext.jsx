import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

let nextId = 0;

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'success', duration = 3500) => {
        const id = ++nextId;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be inside ToastProvider');
    return ctx;
}

const COLORS = {
    success: { bg: 'var(--green)',  text: '#fff' },
    error:   { bg: 'var(--red)',    text: '#fff' },
    info:    { bg: 'var(--indigo)', text: '#fff' },
    warning: { bg: 'var(--amber)',  text: '#fff' },
};

function ToastContainer({ toasts, onRemove }) {
    if (!toasts.length) return null;
    return (
        <div style={{
            position: 'fixed', bottom: 24, right: 24,
            display: 'flex', flexDirection: 'column', gap: 8,
            zIndex: 9999, maxWidth: 340,
        }}>
            {toasts.map(t => {
                const c = COLORS[t.type] ?? COLORS.info;
                return (
                    <div key={t.id} style={{
                        background: c.bg, color: c.text,
                        padding: '10px 14px', borderRadius: 8,
                        boxShadow: '0 4px 12px rgba(0,0,0,.15)',
                        display: 'flex', alignItems: 'center', gap: 10,
                        fontSize: '0.875rem', fontWeight: 500,
                        animation: 'slideInRight .2s ease',
                    }}>
                        <span style={{ flex: 1 }}>{t.message}</span>
                        <button onClick={() => onRemove(t.id)} style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'inherit', opacity: 0.75, fontSize: '1rem', lineHeight: 1, padding: 0,
                        }}>×</button>
                    </div>
                );
            })}
        </div>
    );
}
