import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const DEMO_DURATION = 30 * 60;
const STORAGE_KEY = 'hyperbeam_demo_session';

export default function DemoPage() {
    const navigate = useNavigate();
    const [embedUrl, setEmbedUrl] = useState(null);
    const [sessionId, setSessionId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [timeLeft, setTimeLeft] = useState(DEMO_DURATION);
    const [started, setStarted] = useState(false);
    const iframeRef = useRef(null);
    const sessionRef = useRef(null);

    const endDemo = useCallback(async (sid) => {
        const id = sid || sessionRef.current;
        if (!id) return;
        sessionRef.current = null;
        try {
            await fetch('/api/demo/end', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: id }),
            });
        } catch {}
        try { localStorage.removeItem(STORAGE_KEY); } catch {}
    }, []);

    const cleanupStaleSession = useCallback(async () => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const old = JSON.parse(raw);
            if (old?.session_id) {
                await fetch('/api/demo/end', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ session_id: old.session_id }),
                }).catch(() => {});
            }
            localStorage.removeItem(STORAGE_KEY);
        } catch {}
    }, []);

    const startDemo = async () => {
        setLoading(true);
        setError(null);
        try {
            await cleanupStaleSession();
            const resp = await fetch('/api/demo/start', { method: 'POST' });
            if (!resp.ok) {
                const err = await resp.json().catch(() => ({}));
                throw new Error(err.message || `HTTP ${resp.status}`);
            }
            const data = await resp.json();
            setEmbedUrl(data.embed_url);
            setSessionId(data.session_id);
            sessionRef.current = data.session_id;
            setStarted(true);
            setTimeLeft(data.expires_in || DEMO_DURATION);
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify({
                    session_id: data.session_id,
                    started_at: Date.now(),
                }));
            } catch {}
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEndDemo = useCallback(async () => {
        await endDemo();
        setEmbedUrl(null);
        setSessionId(null);
        setStarted(false);
        setTimeLeft(DEMO_DURATION);
    }, [endDemo]);

    useEffect(() => {
        cleanupStaleSession();
    }, [cleanupStaleSession]);

    useEffect(() => {
        if (!started) return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    endDemo();
                    setStarted(false);
                    setEmbedUrl(null);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [started, endDemo]);

    useEffect(() => {
        const onUnload = () => {
            const sid = sessionRef.current;
            if (!sid) return;
            const blob = new Blob(
                [JSON.stringify({ session_id: sid })],
                { type: 'application/json' }
            );
            try {
                navigator.sendBeacon('/api/demo/end', blob);
            } catch {}
        };
        window.addEventListener('pagehide', onUnload);
        window.addEventListener('beforeunload', onUnload);
        return () => {
            window.removeEventListener('pagehide', onUnload);
            window.removeEventListener('beforeunload', onUnload);
        };
    }, []);

    const fmt = (s) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    };

    if (error) {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <h1 style={styles.h1}>Demo unavailable</h1>
                    <p style={styles.errorText}>{error}</p>
                    <p style={styles.subText}>
                        Make sure HYPERBEAM_API_KEY is set in the .env file.
                        Get a key at <a href="https://hyperbeam.com" target="_blank" rel="noopener" style={styles.link}>hyperbeam.com</a>
                    </p>
                    <button onClick={() => setError(null)} style={styles.btn}>Try again</button>
                </div>
            </div>
        );
    }

    if (!started || !embedUrl) {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <img src="/logo.png" alt="InventoryOS" style={styles.logo} />
                    <h1 style={styles.h1}>Try InventoryOS Live</h1>
                    <p style={styles.subText}>
                        Get instant access to a fully-loaded demo environment.
                        Browse products, run reports, explore the POS — no install required.
                    </p>
                    <ul style={styles.featureList}>
                        <li>16 pre-loaded products across 4 categories</li>
                        <li>3 suppliers, 3 customers, 2 branches</li>
                        <li>Full reports, forecasting, and health scoring</li>
                        <li>Session auto-expires in 30 minutes</li>
                    </ul>
                    <button onClick={startDemo} disabled={loading} style={loading ? styles.btnLoading : styles.btn}>
                        {loading ? 'Starting your session…' : 'Launch Live Demo →'}
                    </button>
                    <p style={styles.footer}>Powered by Hyperbeam · CRAMS Creative</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f172a' }}>
            <div style={styles.bar}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <img src="/logo.png" alt="" style={{ width: 28, height: 28, borderRadius: 8 }} />
                    <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 14 }}>InventoryOS Live Demo</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <button onClick={() => { handleEndDemo(); navigate('/dashboard'); }} style={styles.endBtn}>← Back to App</button>
                    <span style={{ ...styles.timer, ...(timeLeft < 60 ? styles.timerWarn : {}) }}>
                        {fmt(timeLeft)}
                    </span>
                    <button onClick={handleEndDemo} style={styles.endBtn}>End Demo</button>
                </div>
            </div>
            <iframe
                ref={iframeRef}
                src={embedUrl}
                style={{ flex: 1, border: 'none', width: '100%' }}
                allow="autoplay; fullscreen; clipboard-read; clipboard-write; display-capture"
                allowFullScreen
                title="InventoryOS Demo"
            />
        </div>
    );
}

const styles = {
    container: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        fontFamily: 'Inter, system-ui, sans-serif',
    },
    card: {
        textAlign: 'center',
        maxWidth: 480,
        padding: '48px 40px',
        background: 'rgba(30,41,59,0.6)',
        borderRadius: 24,
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(12px)',
    },
    logo: {
        width: 72, height: 72, borderRadius: 18, marginBottom: 24,
        boxShadow: '0 8px 32px rgba(52,211,153,0.2)',
    },
    h1: {
        color: '#f1f5f9', fontSize: 28, fontWeight: 700,
        margin: '0 0 12px', letterSpacing: '-0.02em',
    },
    subText: {
        color: '#94a3b8', fontSize: 15, lineHeight: 1.6,
        margin: '0 0 24px',
    },
    errorText: {
        color: '#f87171', fontSize: 14, margin: '0 0 16px',
    },
    featureList: {
        listStyle: 'none', padding: 0, margin: '0 0 32px',
        color: '#cbd5e1', fontSize: 14, lineHeight: 2,
        textAlign: 'left',
        display: 'inline-block',
    },
    btn: {
        background: '#34d399', color: '#0f172a',
        border: 'none', borderRadius: 12,
        padding: '14px 36px', fontSize: 16, fontWeight: 600,
        cursor: 'pointer', transition: 'all 0.2s',
    },
    btnLoading: {
        background: '#1e293b', color: '#64748b',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
        padding: '14px 36px', fontSize: 16, fontWeight: 600,
        cursor: 'not-allowed',
    },
    footer: {
        color: '#475569', fontSize: 12, marginTop: 24,
    },
    link: {
        color: '#34d399',
    },
    bar: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 20px', background: '#0f172a',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
    },
    timer: {
        color: '#34d399', fontFamily: 'monospace', fontSize: 16,
        fontWeight: 600, background: 'rgba(52,211,153,0.1)',
        padding: '4px 12px', borderRadius: 8,
    },
    timerWarn: {
        color: '#f87171', background: 'rgba(248,113,113,0.1)',
    },
    endBtn: {
        background: 'transparent', color: '#94a3b8',
        border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8,
        padding: '6px 16px', fontSize: 13, cursor: 'pointer',
    },
};
