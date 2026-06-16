import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/Layout';
import client from '../../api/client';

const emptyForm = { supplier_id: '', label: '', expires_at: '' };

export default function SupplierPortalPage() {
    const qc = useQueryClient();
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [copied, setCopied] = useState(null);

    const { data: tokens, isLoading } = useQuery({
        queryKey: ['supplier-portal-tokens'],
        queryFn: () => client.get('/supplier-portal/tokens').then(r => r.data),
    });

    const create = useMutation({
        mutationFn: (d) => client.post('/supplier-portal/tokens', d).then(r => r.data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['supplier-portal-tokens'] });
            setShowCreate(false);
            setForm(emptyForm);
        },
    });

    const revoke = useMutation({
        mutationFn: (id) => client.delete(`/supplier-portal/tokens/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['supplier-portal-tokens'] }),
    });

    function portalUrl(token) {
        return `${window.location.origin}/supplier-portal/${token}`;
    }

    function copyUrl(token) {
        navigator.clipboard.writeText(portalUrl(token));
        setCopied(token);
        setTimeout(() => setCopied(null), 2000);
    }

    const rows = Array.isArray(tokens) ? tokens : [];

    return (
        <Layout>
            <div style={{ padding: 32, maxWidth: 1100, margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <div>
                        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>Supplier Portal</h1>
                        <p style={{ color: 'var(--text-3)', fontSize: 14 }}>Generate share links for suppliers to view their purchase orders.</p>
                    </div>
                    <button onClick={() => setShowCreate(true)} style={{ padding: '8px 20px', background: 'var(--indigo)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                        + Generate Link
                    </button>
                </div>

                {isLoading && <p style={{ color: 'var(--text-2)' }}>Loading…</p>}

                {!isLoading && rows.length === 0 && (
                    <p style={{ color: 'var(--text-3)', textAlign: 'center', padding: 40 }}>No portal tokens yet. Generate one for a supplier.</p>
                )}

                {rows.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {rows.map(t => (
                            <div key={t.id} style={{
                                background: 'var(--surface)',
                                border: '1px solid var(--border)',
                                borderRadius: 10,
                                padding: '16px 20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 16,
                                opacity: t.is_active ? 1 : 0.5,
                            }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, color: 'var(--text-1)', marginBottom: 2 }}>{t.label}</div>
                                    <div style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 4 }}>
                                        Supplier: <strong>{t.supplier?.name ?? `#${t.supplier_id}`}</strong>
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                                        Created {new Date(t.created_at).toLocaleDateString()}
                                        {t.expires_at && ` · Expires ${new Date(t.expires_at).toLocaleDateString()}`}
                                        {t.last_accessed_at && ` · Last accessed ${new Date(t.last_accessed_at).toLocaleDateString()}`}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{
                                        padding: '2px 10px',
                                        borderRadius: 20,
                                        fontSize: 12,
                                        fontWeight: 600,
                                        background: t.is_active ? 'var(--green)' : 'var(--border)',
                                        color: t.is_active ? '#fff' : 'var(--text-2)',
                                    }}>
                                        {t.is_active ? 'Active' : 'Revoked'}
                                    </span>

                                    {t.is_active && (
                                        <>
                                            <button
                                                onClick={() => copyUrl(t.token)}
                                                style={{ padding: '6px 14px', background: copied === t.token ? 'var(--green)' : 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: copied === t.token ? '#fff' : 'var(--text-2)' }}
                                            >
                                                {copied === t.token ? 'Copied!' : 'Copy Link'}
                                            </button>
                                            <button
                                                onClick={() => { if (confirm('Revoke this token?')) revoke.mutate(t.id); }}
                                                style={{ padding: '6px 14px', background: 'none', border: '1px solid var(--red)', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: 'var(--red)' }}
                                            >
                                                Revoke
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Create Modal */}
                {showCreate && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                        <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 32, width: 440, maxWidth: '95vw' }}>
                            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)', marginBottom: 20 }}>Generate Portal Link</h2>
                            <form onSubmit={e => { e.preventDefault(); create.mutate({ ...form, supplier_id: Number(form.supplier_id), expires_at: form.expires_at || null }); }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <div>
                                    <label style={labelStyle}>Supplier ID *</label>
                                    <input type="number" required value={form.supplier_id} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))} style={inputStyle} placeholder="Enter supplier ID" />
                                </div>
                                <div>
                                    <label style={labelStyle}>Label *</label>
                                    <input required value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} style={inputStyle} placeholder="e.g. Q3 2026 Access" />
                                </div>
                                <div>
                                    <label style={labelStyle}>Expires At (optional)</label>
                                    <input type="datetime-local" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} style={inputStyle} />
                                </div>
                                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                                    <button type="button" onClick={() => setShowCreate(false)} style={cancelBtnStyle}>Cancel</button>
                                    <button type="submit" disabled={create.isPending} style={{ padding: '8px 20px', background: 'var(--indigo)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                                        {create.isPending ? 'Generating…' : 'Generate'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}

const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: 14,
    background: 'var(--surface)',
    color: 'var(--text-1)',
    boxSizing: 'border-box',
};
const labelStyle = { fontSize: 13, color: 'var(--text-2)', display: 'block', marginBottom: 4 };
const cancelBtnStyle = { padding: '8px 20px', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', background: 'none', color: 'var(--text-2)' };
