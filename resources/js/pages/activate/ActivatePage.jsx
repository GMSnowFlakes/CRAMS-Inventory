import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';

export default function ActivatePage() {
    const navigate = useNavigate();
    const [key, setKey]       = useState('');
    const [success, setSuccess] = useState(null);

    const activate = useMutation({
        mutationFn: () => client.post('/license/activate', { license_key: key.trim() }),
        onSuccess: (res) => {
            setSuccess(res.data);
            setTimeout(() => navigate('/dashboard'), 2500);
        },
    });

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--surface-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
        }}>
            <div style={{
                width: '100%', maxWidth: 520,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '40px 40px 36px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
            }}>
                {/* Logo / brand */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: 'var(--indigo)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <svg viewBox="0 0 20 20" fill="white" width="18" height="18">
                            <path d="M3 3a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 13.846 4.632 16 6.414 16H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 5H6.28l-.31-1.243A1 1 0 005 3H3z"/>
                        </svg>
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-1)', letterSpacing: '-0.02em' }}>CRAMS</div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-3)' }}>Inventory Platform</div>
                    </div>
                </div>

                <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>
                    Activate your license
                </h1>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-3)', marginBottom: 28 }}>
                    Enter the license key provided to you to unlock this installation.
                </p>

                {success ? (
                    <div style={{
                        padding: '20px 20px',
                        background: 'var(--green-light)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid #6ee7b7',
                        textAlign: 'center',
                    }}>
                        <p style={{ fontWeight: 600, color: '#065f46', marginBottom: 4 }}>License activated!</p>
                        <p style={{ fontSize: '0.8125rem', color: '#065f46' }}>
                            {success.tier.charAt(0).toUpperCase() + success.tier.slice(1)} plan · {success.max_users === 0 ? 'Unlimited' : success.max_users} users · Expires {success.expires_at}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: '#6ee7b7', marginTop: 8 }}>Redirecting…</p>
                    </div>
                ) : (
                    <form onSubmit={e => { e.preventDefault(); activate.mutate(); }}>
                        <div style={{ marginBottom: 16 }}>
                            <label className="form-label">License key</label>
                            <textarea
                                value={key}
                                onChange={e => setKey(e.target.value)}
                                placeholder="Paste your license key here…"
                                rows={5}
                                style={{
                                    width: '100%', resize: 'vertical',
                                    fontFamily: 'monospace', fontSize: '0.75rem',
                                    padding: '10px 12px',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-sm)',
                                    background: 'var(--surface-2)',
                                    color: 'var(--text-1)',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                }}
                            />
                        </div>

                        {activate.isError && (
                            <div className="alert-error" style={{ marginBottom: 16 }}>
                                {activate.error?.response?.data?.message ?? 'Invalid or expired license key.'}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ width: '100%' }}
                            disabled={!key.trim() || activate.isPending}
                        >
                            {activate.isPending ? 'Verifying…' : 'Activate License'}
                        </button>
                    </form>
                )}

                <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 20, textAlign: 'center' }}>
                    Need a license key? Contact your vendor.
                </p>
            </div>
        </div>
    );
}
