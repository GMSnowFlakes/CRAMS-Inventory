import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/Layout';
import client from '../../api/client';

const SEVERITIES = ['low', 'medium', 'high', 'critical'];

function severityBadge(severity) {
    const colors = {
        critical: { background: 'var(--red)',    color: '#fff' },
        high:     { background: '#ea580c',       color: '#fff' },
        medium:   { background: 'var(--amber)',  color: '#000' },
        low:      { background: 'var(--border)', color: 'var(--text-2)' },
    };
    return (
        <span style={{
            ...colors[severity],
            padding: '2px 10px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 600,
            textTransform: 'capitalize',
        }}>
            {severity}
        </span>
    );
}

const emptyForm = { product_id: '', title: '', reason: '', severity: 'medium', affected_qty: '' };
const emptyResolve = { notes: '', recovered_qty: '' };

export default function RecallsPage() {
    const qc = useQueryClient();
    const [filter, setFilter] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [resolveTarget, setResolveTarget] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [resolveForm, setResolveForm] = useState(emptyResolve);

    const { data: activeCount } = useQuery({
        queryKey: ['recalls-active-count'],
        queryFn: () => client.get('/recalls/active-count').then(r => r.data),
    });

    const { data, isLoading } = useQuery({
        queryKey: ['recalls', filter],
        queryFn: () => client.get('/recalls' + (filter ? `?status=${filter}` : '')).then(r => r.data),
    });

    const create = useMutation({
        mutationFn: (d) => client.post('/recalls', d).then(r => r.data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['recalls'] });
            qc.invalidateQueries({ queryKey: ['recalls-active-count'] });
            setShowCreate(false);
            setForm(emptyForm);
        },
    });

    const resolve = useMutation({
        mutationFn: ({ id, ...body }) => client.post(`/recalls/${id}/resolve`, body).then(r => r.data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['recalls'] });
            qc.invalidateQueries({ queryKey: ['recalls-active-count'] });
            setResolveTarget(null);
            setResolveForm(emptyResolve);
        },
    });

    const rows = data?.data ?? [];
    const count = activeCount?.count ?? 0;

    return (
        <Layout>
            <div style={{ padding: 32, maxWidth: 1100, margin: '0 auto' }}>
                {/* Active recall banner */}
                {count > 0 && (
                    <div style={{ background: 'var(--red)', color: '#fff', borderRadius: 10, padding: '12px 20px', marginBottom: 20, fontWeight: 600, fontSize: 14 }}>
                        ⚠ {count} active recall{count !== 1 ? 's' : ''} in progress. Review and resolve promptly.
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-1)' }}>Recalls</h1>
                    <button onClick={() => setShowCreate(true)} style={{ padding: '8px 20px', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                        + New Recall
                    </button>
                </div>

                {/* Filter */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                    {[['', 'All'], ['active', 'Active'], ['resolved', 'Resolved']].map(([val, label]) => (
                        <button key={val} onClick={() => setFilter(val)} style={{
                            padding: '6px 16px', border: '1px solid var(--border)', borderRadius: 20, cursor: 'pointer', fontSize: 13,
                            background: filter === val ? 'var(--indigo)' : 'var(--surface)',
                            color: filter === val ? '#fff' : 'var(--text-2)',
                        }}>{label}</button>
                    ))}
                </div>

                {isLoading && <p style={{ color: 'var(--text-2)' }}>Loading…</p>}

                {!isLoading && rows.length === 0 && (
                    <p style={{ color: 'var(--text-3)', textAlign: 'center', padding: 40 }}>No recalls found.</p>
                )}

                {rows.length > 0 && (
                    <div style={{ background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                                    {['Product', 'Title', 'Severity', 'Affected', 'Recovered', 'Status', 'Date', 'Actions'].map(h => (
                                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map(r => (
                                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '12px 14px', color: 'var(--text-2)' }}>{r.product?.name ?? '—'}</td>
                                        <td style={{ padding: '12px 14px', color: 'var(--text-1)', fontWeight: 600 }}>{r.title}</td>
                                        <td style={{ padding: '12px 14px' }}>{severityBadge(r.severity)}</td>
                                        <td style={{ padding: '12px 14px', color: 'var(--text-2)' }}>{r.affected_qty}</td>
                                        <td style={{ padding: '12px 14px', color: 'var(--text-2)' }}>{r.recovered_qty}</td>
                                        <td style={{ padding: '12px 14px' }}>
                                            <span style={{ color: r.status === 'active' ? 'var(--red)' : 'var(--green)', fontWeight: 600, fontSize: 13, textTransform: 'capitalize' }}>
                                                {r.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 14px', color: 'var(--text-3)', fontSize: 13 }}>
                                            {new Date(r.created_at).toLocaleDateString()}
                                        </td>
                                        <td style={{ padding: '12px 14px' }}>
                                            {r.status === 'active' && (
                                                <button onClick={() => { setResolveTarget(r); setResolveForm(emptyResolve); }} style={{ padding: '4px 12px', background: 'none', border: '1px solid var(--green)', color: 'var(--green)', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
                                                    Resolve
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Create Modal */}
                {showCreate && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                        <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 32, width: 500, maxWidth: '95vw' }}>
                            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)', marginBottom: 20 }}>New Recall Notice</h2>
                            <form onSubmit={e => { e.preventDefault(); create.mutate({ ...form, affected_qty: Number(form.affected_qty) }); }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <div>
                                    <label style={labelStyle}>Product ID *</label>
                                    <input type="number" required value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))} style={inputStyle} placeholder="Enter product ID" />
                                </div>
                                <div>
                                    <label style={labelStyle}>Title *</label>
                                    <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Reason *</label>
                                    <textarea required rows={3} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} style={{ ...inputStyle, resize: 'vertical' }} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Severity *</label>
                                    <select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))} style={inputStyle}>
                                        {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Affected Qty *</label>
                                    <input type="number" required min={1} value={form.affected_qty} onChange={e => setForm(f => ({ ...f, affected_qty: e.target.value }))} style={inputStyle} />
                                </div>
                                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                                    <button type="button" onClick={() => setShowCreate(false)} style={cancelBtnStyle}>Cancel</button>
                                    <button type="submit" disabled={create.isPending} style={{ padding: '8px 20px', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                                        {create.isPending ? 'Creating…' : 'Create Recall'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Resolve Modal */}
                {resolveTarget && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                        <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 32, width: 440, maxWidth: '95vw' }}>
                            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>Resolve Recall</h2>
                            <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 20 }}>{resolveTarget.title}</p>
                            <form onSubmit={e => { e.preventDefault(); resolve.mutate({ id: resolveTarget.id, ...resolveForm, recovered_qty: Number(resolveForm.recovered_qty) }); }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <div>
                                    <label style={labelStyle}>Recovered Qty *</label>
                                    <input type="number" required min={0} value={resolveForm.recovered_qty} onChange={e => setResolveForm(f => ({ ...f, recovered_qty: e.target.value }))} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Resolution Notes</label>
                                    <textarea rows={3} value={resolveForm.notes} onChange={e => setResolveForm(f => ({ ...f, notes: e.target.value }))} style={{ ...inputStyle, resize: 'vertical' }} />
                                </div>
                                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                                    <button type="button" onClick={() => setResolveTarget(null)} style={cancelBtnStyle}>Cancel</button>
                                    <button type="submit" disabled={resolve.isPending} style={{ padding: '8px 20px', background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                                        {resolve.isPending ? 'Resolving…' : 'Mark Resolved'}
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
