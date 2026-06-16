import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/Layout';
import api from '../../api/client';
import TransferOrderForm from './TransferOrderForm';
import TransferOrderDetail from './TransferOrderDetail';
import { usePermission } from '../../hooks/usePermission';
import { useToast } from '../../context/ToastContext';

const STATUS_BADGE = {
    draft:      'badge-gray',
    dispatched: 'badge-sky',
    received:   'badge-green',
    cancelled:  'badge-red',
};

export default function TransferOrdersPage() {
    const [modal, setModal]   = useState(null);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [page, setPage]     = useState(1);
    const qc = useQueryClient();
    const { can } = usePermission();
    const { addToast } = useToast();

    useEffect(() => { setPage(1); }, [search, status]);

    const { data, isLoading } = useQuery({
        queryKey: ['transfer-orders', search, status, page],
        queryFn: () => api.get('/transfer-orders', {
            params: {
                search: search || undefined,
                status: status || undefined,
                page,
            },
        }).then(r => r.data),
    });

    const cancelMutation = useMutation({
        mutationFn: (id) => api.post(`/transfer-orders/${id}/cancel`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['transfer-orders'] }); addToast('Transfer cancelled', 'error'); },
    });

    const orders = data?.data ?? [];

    return (
        <Layout>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Transfer Orders</h1>
                    <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', marginTop: 2 }}>{data?.total ?? orders.length} transfers</p>
                </div>
                {can('doInventory') && (
                    <button className="btn btn-primary" onClick={() => setModal({ type: 'create' })}>
                        <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/></svg>
                        New Transfer
                    </button>
                )}
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 300 }}>
                    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"
                        style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }}>
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
                    </svg>
                    <input type="text" placeholder="Search transfers…" value={search} onChange={e => setSearch(e.target.value)} className="field" style={{ paddingLeft: 34 }} />
                </div>
                <select className="field" style={{ width: 160 }} value={status} onChange={e => setStatus(e.target.value)}>
                    <option value="">All statuses</option>
                    <option value="draft">Draft</option>
                    <option value="dispatched">Dispatched</option>
                    <option value="received">Received</option>
                    <option value="cancelled">Cancelled</option>
                </select>
                {(search || status) && (
                    <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setStatus(''); }}>Clear</button>
                )}
            </div>

            {isLoading ? (
                <div style={{ display: 'flex', gap: 6, padding: 24 }}>{[0,1,2].map(i => <span key={i} className="loading-dot" style={{ animationDelay: `${i * 0.2}s` }} />)}</div>
            ) : (
                <div className="card" style={{ overflow: 'hidden' }}>
                    <table className="data-table">
                        <thead>
                            <tr>{['Transfer #', 'From', 'To', 'Date', 'Status', ''].map(h => <th key={h}>{h}</th>)}</tr>
                        </thead>
                        <tbody>
                            {orders.map(to => (
                                <tr key={to.id}>
                                    <td>
                                        <code style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.875rem', color: 'var(--violet)' }}>{to.transfer_number}</code>
                                    </td>
                                    <td style={{ fontWeight: 500 }}>{to.from_branch?.name ?? '—'}</td>
                                    <td style={{ fontWeight: 500 }}>{to.to_branch?.name ?? '—'}</td>
                                    <td style={{ color: 'var(--text-3)', fontSize: '0.8125rem' }}>{to.transfer_date}</td>
                                    <td><span className={`badge ${STATUS_BADGE[to.status] ?? 'badge-gray'}`} style={{ textTransform: 'capitalize' }}>{to.status}</span></td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                            <button className="btn btn-ghost btn-sm" onClick={() => setModal({ type: 'detail', id: to.id })}>View</button>
                                            {!['received', 'cancelled'].includes(to.status) && (
                                                <button className="btn btn-sm" style={{ background: 'var(--red-light)', color: 'var(--red)', border: 'none' }}
                                                    onClick={() => { if (confirm('Cancel this transfer?')) cancelMutation.mutate(to.id); }}>Cancel</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {orders.length === 0 && (
                                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '40px 16px' }}>No transfer orders found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {data?.last_page > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, fontSize: '0.875rem', color: 'var(--text-3)' }}>
                    <span>Page {data.current_page} of {data.last_page} · {data.total} transfers</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                        <button className="btn btn-ghost btn-sm" disabled={page >= data.last_page} onClick={() => setPage(p => p + 1)}>Next →</button>
                    </div>
                </div>
            )}

            {modal?.type === 'create' && <TransferOrderForm onClose={() => setModal(null)} onSaved={() => addToast('Transfer created')} />}
            {modal?.type === 'detail' && <TransferOrderDetail id={modal.id} onClose={() => setModal(null)} />}
        </Layout>
    );
}
