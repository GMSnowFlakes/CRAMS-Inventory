import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/Layout';
import api from '../../api/client';
import PurchaseOrderForm from './PurchaseOrderForm';
import PurchaseOrderDetail from './PurchaseOrderDetail';
import { usePermission } from '../../hooks/usePermission';
import { useCurrency } from '../../hooks/useCurrency';
import { useToast } from '../../context/ToastContext';

const STATUS_BADGE = {
    draft:     'badge-gray',
    sent:      'badge-sky',
    partial:   'badge-amber',
    received:  'badge-green',
    cancelled: 'badge-red',
};

export default function PurchaseOrdersPage() {
    const [modal, setModal] = useState(null);
    const [statusFilter, setStatusFilter] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const qc = useQueryClient();
    const { can } = usePermission();
    const { fmt } = useCurrency();
    const { addToast } = useToast();

    const { data, isLoading } = useQuery({
        queryKey: ['purchase-orders', statusFilter, search, page],
        queryFn: () => api.get('/purchase-orders', {
            params: {
                status: statusFilter || undefined,
                search: search || undefined,
                page,
            },
        }).then(r => r.data),
    });

    const cancelMutation = useMutation({
        mutationFn: (id) => api.post(`/purchase-orders/${id}/cancel`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchase-orders'] }); addToast('PO cancelled', 'error'); },
    });

    const orders = data?.data ?? [];

    return (
        <Layout>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Purchase Orders</h1>
                    <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', marginTop: 2 }}>{data?.total ?? orders.length} orders</p>
                </div>
                {can('createPO') && (
                    <button className="btn btn-primary" onClick={() => setModal({ type: 'create' })}>
                        <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/></svg>
                        New PO
                    </button>
                )}
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 300 }}>
                    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"
                        style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }}>
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
                    </svg>
                    <input
                        type="text"
                        placeholder="Search PO# or supplier…"
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        className="field"
                        style={{ paddingLeft: 34 }}
                    />
                </div>
                <select
                    className="field"
                    style={{ width: 160 }}
                    value={statusFilter}
                    onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                >
                    <option value="">All statuses</option>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="partial">Partial</option>
                    <option value="received">Received</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </div>

            {isLoading ? (
                <div style={{ display: 'flex', gap: 6, padding: 24 }}>{[0,1,2].map(i => <span key={i} className="loading-dot" style={{ animationDelay: `${i * 0.2}s` }} />)}</div>
            ) : (
                <div className="card" style={{ overflow: 'hidden' }}>
                    <table className="data-table">
                        <thead>
                            <tr>{['PO Number', 'Supplier', 'Branch', 'Date', 'Status', 'Total', 'Paid', 'Balance', ''].map(h => <th key={h}>{h}</th>)}</tr>
                        </thead>
                        <tbody>
                            {orders.map(po => {
                                const balance = Number(po.total) - Number(po.amount_paid ?? 0);
                                return (
                                    <tr key={po.id}>
                                        <td>
                                            <code style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.875rem', color: 'var(--indigo)' }}>{po.po_number}</code>
                                        </td>
                                        <td style={{ fontWeight: 500 }}>{po.supplier?.name ?? '—'}</td>
                                        <td style={{ color: 'var(--text-2)' }}>{po.branch?.name ?? 'All'}</td>
                                        <td style={{ color: 'var(--text-3)', fontSize: '0.8125rem' }}>{po.order_date}</td>
                                        <td><span className={`badge ${STATUS_BADGE[po.status] ?? 'badge-gray'}`} style={{ textTransform: 'capitalize' }}>{po.status}</span></td>
                                        <td style={{ fontWeight: 600 }}>{fmt(po.total)}</td>
                                        <td style={{ color: 'var(--green)' }}>{fmt(po.amount_paid ?? 0)}</td>
                                        <td style={{ fontWeight: balance > 0 ? 600 : 400, color: balance > 0 ? 'var(--amber)' : 'var(--text-3)' }}>{fmt(balance)}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                                <button className="btn btn-ghost btn-sm" onClick={() => setModal({ type: 'detail', id: po.id })}>View</button>
                                                {!['received', 'cancelled'].includes(po.status) && (
                                                    <button className="btn btn-sm" style={{ background: 'var(--red-light)', color: 'var(--red)', border: 'none' }}
                                                        onClick={() => { if (confirm('Cancel this PO?')) cancelMutation.mutate(po.id); }}>Cancel</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {orders.length === 0 && (
                                <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '40px 16px' }}>No purchase orders found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {data?.last_page > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, fontSize: '0.875rem', color: 'var(--text-3)' }}>
                    <span>Page {data.current_page} of {data.last_page} · {data.total} orders</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                        <button className="btn btn-ghost btn-sm" disabled={page >= data.last_page} onClick={() => setPage(p => p + 1)}>Next →</button>
                    </div>
                </div>
            )}

            {modal?.type === 'create' && <PurchaseOrderForm onClose={() => setModal(null)} onSaved={() => addToast('PO created')} />}
            {modal?.type === 'detail' && <PurchaseOrderDetail id={modal.id} onClose={() => setModal(null)} />}
        </Layout>
    );
}
