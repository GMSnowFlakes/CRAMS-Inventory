import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/Layout';
import api from '../../api/client';
import StockCountDetail from './StockCountDetail';
import { useToast } from '../../context/ToastContext';

function NewCountModal({ branches, onClose, onCreate }) {
    const [branchId, setBranchId] = useState('');
    const [notes, setNotes] = useState('');
    const { mutate, isPending } = useMutation({
        mutationFn: (data) => api.post('/stock-counts', data).then(r => r.data),
        onSuccess: (sc) => onCreate(sc),
    });
    return (
        <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box" style={{ maxWidth: 400, margin: '0 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0' }}>
                    <h2 style={{ fontSize: '1.0625rem', fontWeight: 600, color: 'var(--text-1)' }}>Start Stock Count</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}>
                        <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
                    </button>
                </div>
                <div style={{ padding: '20px 24px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                        <label className="form-label">Branch (optional)</label>
                        <select className="field" value={branchId} onChange={e => setBranchId(e.target.value)}>
                            <option value="">All branches</option>
                            {(branches ?? []).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="form-label">Notes</label>
                        <textarea className="field" rows={2} value={notes} onChange={e => setNotes(e.target.value)} style={{ resize: 'vertical' }} />
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '20px 24px' }}>
                    <button onClick={onClose} className="btn btn-ghost">Cancel</button>
                    <button className="btn btn-primary" disabled={isPending} onClick={() => mutate({ branch_id: branchId || null, notes })}>
                        {isPending ? 'Creating…' : 'Start Count'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function StockCountPage() {
    const [modal, setModal]   = useState(null);
    const [status, setStatus] = useState('');
    const [page, setPage]     = useState(1);
    const qc = useQueryClient();
    const { addToast } = useToast();

    useEffect(() => { setPage(1); }, [status]);

    const { data, isLoading } = useQuery({
        queryKey: ['stock-counts', status, page],
        queryFn: () => api.get('/stock-counts', { params: { status: status || undefined, page } }).then(r => r.data),
    });

    const { data: branches } = useQuery({
        queryKey: ['branches-all'],
        queryFn: () => api.get('/branches').then(r => r.data.data ?? []),
    });

    const counts = data?.data ?? [];

    return (
        <Layout>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Stock Counts</h1>
                    <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', marginTop: 2 }}>{data?.total ?? counts.length} counts</p>
                </div>
                <button className="btn btn-primary" onClick={() => setModal({ type: 'new' })}>
                    <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/></svg>
                    New Count
                </button>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <select className="field" style={{ width: 160 }} value={status} onChange={e => setStatus(e.target.value)}>
                    <option value="">All statuses</option>
                    <option value="open">Open</option>
                    <option value="committed">Committed</option>
                </select>
                {status && <button className="btn btn-ghost btn-sm" onClick={() => setStatus('')}>Clear</button>}
            </div>

            {isLoading ? (
                <div style={{ display: 'flex', gap: 6, padding: 24 }}>{[0,1,2].map(i => <span key={i} className="loading-dot" style={{ animationDelay: `${i * 0.2}s` }} />)}</div>
            ) : (
                <div className="card" style={{ overflow: 'hidden' }}>
                    <table className="data-table">
                        <thead>
                            <tr>{['Reference', 'Branch', 'Created By', 'Status', 'Date', ''].map(h => <th key={h}>{h}</th>)}</tr>
                        </thead>
                        <tbody>
                            {counts.map(sc => (
                                <tr key={sc.id}>
                                    <td>
                                        <code style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.875rem', color: 'var(--indigo)' }}>{sc.reference}</code>
                                    </td>
                                    <td style={{ color: 'var(--text-2)' }}>{sc.branch?.name ?? 'All'}</td>
                                    <td style={{ color: 'var(--text-2)' }}>{sc.created_by?.name ?? '—'}</td>
                                    <td>
                                        <span className={`badge ${sc.status === 'committed' ? 'badge-green' : 'badge-amber'}`} style={{ textTransform: 'capitalize' }}>
                                            {sc.status}
                                        </span>
                                    </td>
                                    <td style={{ color: 'var(--text-3)', fontSize: '0.8125rem' }}>{sc.created_at?.slice(0, 10)}</td>
                                    <td>
                                        <button className="btn btn-ghost btn-sm" onClick={() => setModal({ type: 'detail', id: sc.id })}>
                                            {sc.status === 'open' ? 'Count →' : 'View'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {counts.length === 0 && (
                                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '40px 16px' }}>No stock counts found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {data?.last_page > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, fontSize: '0.875rem', color: 'var(--text-3)' }}>
                    <span>Page {data.current_page} of {data.last_page} · {data.total} counts</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                        <button className="btn btn-ghost btn-sm" disabled={page >= data.last_page} onClick={() => setPage(p => p + 1)}>Next →</button>
                    </div>
                </div>
            )}

            {modal?.type === 'new' && (
                <NewCountModal
                    branches={branches}
                    onClose={() => setModal(null)}
                    onCreate={(sc) => { qc.invalidateQueries({ queryKey: ['stock-counts'] }); addToast('Stock count started'); setModal({ type: 'detail', id: sc.id }); }}
                />
            )}
            {modal?.type === 'detail' && <StockCountDetail id={modal.id} onClose={() => setModal(null)} />}
        </Layout>
    );
}
