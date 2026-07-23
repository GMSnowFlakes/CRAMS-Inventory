import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(form.email, form.password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message ?? 'Invalid credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
            {/* Brand panel */}
            <div style={{
                flex: '0 0 420px',
                background: 'var(--sidebar-bg)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '48px 48px 40px',
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 56 }}>
                        <img src="/logo.png" alt="InventoryOS" style={{ width: 44, height: 44, borderRadius: 12 }} />
                        <span style={{ color: '#f8fafc', fontWeight: 700, fontSize: '1.25rem', letterSpacing: '-0.02em' }}>InventoryOS</span>
                    </div>

                    <h2 style={{ color: '#f8fafc', fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.2, marginBottom: 16 }}>
                        Complete Retail &amp;<br />Asset Management
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '0.9375rem', lineHeight: 1.6 }}>
                        Manage inventory, track purchase orders, run stock counts, and analyse your business — all in one place.
                    </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {[
                        ['Multi-branch inventory', '📦'],
                        ['Purchase order tracking', '🛒'],
                        ['Real-time audit logs', '🔍'],
                    ].map(([label, icon]) => (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: '1rem' }}>{icon}</span>
                            <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Form panel */}
            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--surface-2)',
                padding: '48px 24px',
            }}>
                <div style={{ width: '100%', maxWidth: 380 }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>
                        Sign in
                    </h1>
                    <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', marginBottom: 32 }}>
                        Enter your credentials to continue
                    </p>

                    {error && <div className="alert-error">{error}</div>}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                        <div>
                            <label className="form-label">Email address</label>
                            <input
                                type="email"
                                className="field"
                                placeholder="you@example.com"
                                value={form.email}
                                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                required
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="form-label">Password</label>
                            <input
                                type="password"
                                className="field"
                                placeholder="••••••••"
                                value={form.password}
                                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary"
                            style={{ width: '100%', justifyContent: 'center', padding: '10px 16px', marginTop: 4 }}
                        >
                            {loading ? 'Signing in…' : 'Sign in →'}
                        </button>
                    </form>

                    <p style={{ color: 'var(--text-3)', fontSize: '0.75rem', marginTop: 32, textAlign: 'center' }}>
                        © {new Date().getFullYear()} CRAMS Creative · www.cramscreative.com
                    </p>
                </div>
            </div>
        </div>
    );
}
