import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/Layout';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';

export default function KitSelectorPage() {
    const qc = useQueryClient();
    const { addToast } = useToast();
    const [confirming, setConfirming] = useState(null);
    const [applied, setApplied]       = useState(null);

    const { data: kits = [], isLoading } = useQuery({
        queryKey: ['industry-kits'],
        queryFn: () => api.get('/industry-kits').then(r => r.data),
    });

    const { data: config } = useQuery({
        queryKey: ['industry-kits-config'],
        queryFn: () => api.get('/industry-kits/config').then(r => r.data),
    });

    const applyMutation = useMutation({
        mutationFn: (kit) => api.post('/industry-kits/apply', { kit }).then(r => r.data),
        onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: ['industry-kits-config'] });
            qc.invalidateQueries({ queryKey: ['products-categories'] });
            qc.invalidateQueries({ queryKey: ['expense-categories'] });
            setApplied(data.kit);
            setConfirming(null);
            addToast('Industry kit applied');
        },
    });

    const currentKit = kits.find(k => k.id === applied) ?? null;

    return (
        <Layout>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Industry Kits</h1>
                    <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', marginTop: 2 }}>
                        Switch your workspace to a preset configured for your industry — categories, units, and expense types are tailored automatically.
                    </p>
                </div>
            </div>

            {applied && currentKit && (
                <div style={{ background: 'var(--green-light, #f0fdf4)', border: '1px solid var(--green)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.25rem' }}>{currentKit.icon}</span>
                    <div>
                        <span style={{ fontWeight: 600, color: 'var(--green)' }}>{currentKit.name} kit applied!</span>
                        <span style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}> Product and expense categories have been updated.</span>
                    </div>
                </div>
            )}

            {isLoading ? (
                <div style={{ display: 'flex', gap: 6, padding: 24 }}>
                    {[0,1,2].map(i => <span key={i} className="loading-dot" style={{ animationDelay: `${i*0.2}s` }} />)}
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                    {kits.map(kit => (
                        <KitCard
                            key={kit.id}
                            kit={kit}
                            onSelect={() => setConfirming(kit)}
                        />
                    ))}
                </div>
            )}

            {confirming && (
                <ConfirmModal
                    kit={confirming}
                    isPending={applyMutation.isPending}
                    error={applyMutation.error}
                    onConfirm={() => applyMutation.mutate(confirming.id)}
                    onCancel={() => setConfirming(null)}
                />
            )}
        </Layout>
    );
}

function KitCard({ kit, onSelect }) {
    return (
        <div
            className="card"
            style={{ padding: '20px', cursor: 'pointer', transition: 'box-shadow 0.15s, transform 0.15s', position: 'relative', overflow: 'hidden' }}
            onClick={onSelect}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }}
        >
            {/* Color accent bar */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: kit.color, borderRadius: '8px 8px 0 0' }} />

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginTop: 4 }}>
                <div style={{ fontSize: '2rem', lineHeight: 1, minWidth: 40, textAlign: 'center' }}>{kit.icon}</div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-1)', marginBottom: 4 }}>{kit.name}</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-3)', lineHeight: 1.5 }}>{kit.description}</div>
                </div>
            </div>

            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                    className="btn btn-primary btn-sm"
                    style={{ background: kit.color, border: 'none', fontSize: '0.8125rem' }}
                    onClick={e => { e.stopPropagation(); onSelect(); }}
                >
                    Apply Kit
                </button>
            </div>
        </div>
    );
}

function ConfirmModal({ kit, isPending, error, onConfirm, onCancel }) {
    return (
        <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && onCancel()}>
            <div className="modal-box" style={{ maxWidth: 440, margin: '0 16px' }}>
                <div style={{ padding: '24px 24px 0', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: 12 }}>{kit.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: '1.0625rem', marginBottom: 8 }}>Apply {kit.name} Kit?</div>
                    <div style={{ color: 'var(--text-2)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                        This will update your product categories, expense categories, and unit suggestions to be pre-configured for <strong>{kit.name}</strong>.
                    </div>
                    <div style={{ marginTop: 10, padding: '10px 14px', background: 'var(--surface-2, #f8fafc)', borderRadius: 8, fontSize: '0.8125rem', color: 'var(--text-3)' }}>
                        ℹ️ Your existing products and expenses are <strong>not</strong> deleted. Only suggestions change.
                    </div>
                </div>

                {error && (
                    <div style={{ padding: '12px 24px 0' }}>
                        <div className="alert-error">{error.response?.data?.message ?? 'Failed to apply kit.'}</div>
                    </div>
                )}

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '20px 24px' }}>
                    <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
                    <button
                        className="btn btn-primary"
                        style={{ background: kit.color, border: 'none' }}
                        onClick={onConfirm}
                        disabled={isPending}
                    >
                        {isPending ? 'Applying…' : `Apply ${kit.name} Kit`}
                    </button>
                </div>
            </div>
        </div>
    );
}
