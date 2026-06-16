import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/Layout';
import api from '../../api/client';
import { useCurrency } from '../../hooks/useCurrency';
import { useToast } from '../../context/ToastContext';

export default function FranchisePage() {
    const { fmt } = useCurrency();
    const { addToast } = useToast();
    const qc = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ franchise_company_id: '', label: '' });

    const summary = useQuery({
        queryKey: ['franchise-summary'],
        queryFn: () => api.get('/franchise/summary').then(r => r.data),
        staleTime: 30_000,
    });

    const list = useQuery({
        queryKey: ['franchise-list'],
        queryFn: () => api.get('/franchise/list').then(r => r.data),
        staleTime: 30_000,
        enabled: summary.data?.is_hq === true,
    });

    const addMutation = useMutation({
        mutationFn: (data) => api.post('/franchise/add', data).then(r => r.data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['franchise-summary'] });
            qc.invalidateQueries({ queryKey: ['franchise-list'] });
            setShowModal(false);
            setForm({ franchise_company_id: '', label: '' });
            addToast('Franchise added');
        },
        onError: (err) => {
            addToast(err.response?.data?.message ?? 'Failed to add franchise', 'error');
        },
    });

    const removeMutation = useMutation({
        mutationFn: (id) => api.delete(`/franchise/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['franchise-summary'] });
            qc.invalidateQueries({ queryKey: ['franchise-list'] });
            addToast('Franchise removed');
        },
    });

    const handleAdd = () => {
        if (!form.franchise_company_id || !form.label) return;
        addMutation.mutate({
            franchise_company_id: parseInt(form.franchise_company_id),
            label: form.label,
        });
    };

    if (summary.isLoading) {
        return (
            <Layout>
                <div style={{ display: 'flex', gap: 6, padding: 40 }}>
                    {[0,1,2].map(i => <span key={i} className="loading-dot" style={{ animationDelay: `${i * 0.2}s` }} />)}
                </div>
            </Layout>
        );
    }

    if (!summary.data?.is_hq) {
        return (
            <Layout>
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Franchise</h1>
                        <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', marginTop: 2 }}>Multi-store management</p>
                    </div>
                </div>
                <div style={{ maxWidth: 480, margin: '60px auto', textAlign: 'center', padding: '40px 32px', background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>🏢</div>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>Not configured as Franchise HQ</h2>
                    <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                        You are not configured as a Franchise HQ. Contact support to enable this feature.
                    </p>
                </div>
            </Layout>
        );
    }

    const franchises = list.data ?? [];

    return (
        <Layout>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Franchise</h1>
                    <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', marginTop: 2 }}>
                        {summary.data.active_franchises} active franchise{summary.data.active_franchises !== 1 ? 's' : ''}
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
                    </svg>
                    Add Franchise
                </button>
            </div>

            {/* Aggregate stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
                {[
                    {
                        label: 'Total Revenue (All Franchises)',
                        value: fmt(summary.data.total_revenue),
                        accent: 'var(--green)',
                        accentBg: 'var(--green-light)',
                        icon: <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/></svg>,
                    },
                    {
                        label: 'Total Stock Value',
                        value: fmt(summary.data.total_stock_value),
                        accent: 'var(--indigo)',
                        accentBg: 'var(--indigo-light)',
                        icon: <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20"><path d="M3 3a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 13.846 4.632 16 6.414 16H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 5H6.28l-.31-1.243A1 1 0 005 3H3z"/></svg>,
                    },
                    {
                        label: 'Active Franchises',
                        value: summary.data.active_franchises,
                        accent: 'var(--sky)',
                        accentBg: 'var(--sky-light)',
                        icon: <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd"/></svg>,
                    },
                ].map(({ label, value, accent, accentBg, icon }) => (
                    <div key={label} className="stat-card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '0.8125rem', color: 'var(--text-2)', fontWeight: 500 }}>{label}</span>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: accentBg, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {icon}
                            </div>
                        </div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                            {value}
                        </div>
                    </div>
                ))}
            </div>

            {/* Franchises table */}
            {list.isLoading ? (
                <div style={{ display: 'flex', gap: 6, padding: 24 }}>
                    {[0,1,2].map(i => <span key={i} className="loading-dot" style={{ animationDelay: `${i * 0.2}s` }} />)}
                </div>
            ) : franchises.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '40px 0', fontSize: '0.875rem' }}>
                    No franchise branches added yet. Click "Add Franchise" to get started.
                </div>
            ) : (
                <div className="card" style={{ overflow: 'hidden' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Franchise Name</th>
                                <th>Label / Location</th>
                                <th style={{ textAlign: 'right' }}>Stock Value</th>
                                <th style={{ textAlign: 'right' }}>Active Products</th>
                                <th>Status</th>
                                <th>Last Activity</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {franchises.map(f => (
                                <tr key={f.id}>
                                    <td style={{ fontWeight: 500 }}>{f.name}</td>
                                    <td style={{ color: 'var(--text-2)' }}>{f.label}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--indigo)' }}>{fmt(f.stock_value)}</td>
                                    <td style={{ textAlign: 'right', color: 'var(--text-2)' }}>{f.product_count}</td>
                                    <td>
                                        <span className={`badge ${f.is_active ? 'badge-green' : 'badge-gray'}`}>
                                            {f.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td style={{ color: 'var(--text-3)', fontSize: '0.8125rem' }}>
                                        {f.last_activity ? new Date(f.last_activity).toLocaleDateString() : '—'}
                                    </td>
                                    <td>
                                        <button
                                            className="btn btn-sm"
                                            style={{ background: 'var(--red-light)', color: 'var(--red)', border: 'none' }}
                                            onClick={() => {
                                                if (confirm(`Remove ${f.name} as a franchise?`)) {
                                                    removeMutation.mutate(f.id);
                                                }
                                            }}
                                        >
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add Franchise Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-box" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-1)' }}>Add Franchise Branch</h2>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: '1.25rem' }}>×</button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div>
                                <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-2)', marginBottom: 5, display: 'block' }}>
                                    Company ID <span style={{ color: 'var(--red)' }}>*</span>
                                </label>
                                <input
                                    type="number"
                                    className="field"
                                    placeholder="Enter the franchise company ID"
                                    value={form.franchise_company_id}
                                    onChange={e => setForm(f => ({ ...f, franchise_company_id: e.target.value }))}
                                />
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 4 }}>
                                    The company must already exist in the system.
                                </p>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-2)', marginBottom: 5, display: 'block' }}>
                                    Store Name / Location <span style={{ color: 'var(--red)' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    className="field"
                                    placeholder="e.g. Downtown Branch"
                                    value={form.label}
                                    onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                                />
                            </div>
                        </div>

                        {addMutation.error && (
                            <div className="alert-error" style={{ marginTop: 12, fontSize: '0.8125rem' }}>
                                {addMutation.error.response?.data?.message ?? 'Failed to add franchise'}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                            <button
                                className="btn btn-primary"
                                style={{ flex: 1 }}
                                onClick={handleAdd}
                                disabled={addMutation.isPending || !form.franchise_company_id || !form.label}
                            >
                                {addMutation.isPending ? 'Adding…' : 'Add Franchise'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
