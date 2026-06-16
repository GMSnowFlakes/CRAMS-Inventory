import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/Layout';
import api from '../../api/client';
import SaleForm from './SaleForm';
import SaleDetail from './SaleDetail';
import { usePermission } from '../../hooks/usePermission';
import { useToast } from '../../context/ToastContext';

const STATUS_BADGE = {
    draft:     'badge-gray',
    confirmed: 'badge-sky',
    partial:   'badge-amber',
    paid:      'badge-green',
    cancelled: 'badge-red',
};

export default function SalesPage() {
    const qc = useQueryClient();
    const { can } = usePermission();
    const { addToast } = useToast();
    const [modal, setModal] = useState(null);
    const [statusFilter, setStatusFilter] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    // Read ?status=overdue from URL on mount
    useEffect(() => {
        const p = new URLSearchParams(window.location.search);
        if (p.get('status') === 'overdue') setStatusFilter('overdue');
    }, []);

    useEffect(() => { setPage(1); }, [statusFilter, search]);

    const isOverdue = statusFilter === 'overdue';

    const { data: salesData, isLoading: salesLoading } = useQuery({
        queryKey: ['sales', statusFilter, search, page],
        queryFn: () => api.get('/sales', { params: { status: isOverdue ? undefined : statusFilter || undefined, search: search || undefined, page } }).then(r => r.data),
        enabled: !isOverdue,
    });

    const { data: overdueData, isLoading: overdueLoading } = useQuery({
        queryKey: ['overdue-sales'],
        queryFn: () => api.get('/reports/overdue-sales').then(r => r.data),
        enabled: isOverdue,
    });

    const data = isOverdue ? { data: overdueData?.sales ?? [], total: overdueData?.count ?? 0 } : salesData;
    const isLoading = isOverdue ? overdueLoading : salesLoading;

    const cancelMutation = useMutation({
        mutationFn: (id) => api.post(`/sales/${id}/cancel`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['sales'] }); addToast('Sale cancelled', 'error'); },
    });

    const confirmMutation = useMutation({
        mutationFn: (id) => api.post(`/sales/${id}/confirm`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['sales'] }); addToast('Sale confirmed'); },
    });

    const rows = data?.data ?? [];

    return (
        <Layout>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Sales</h1>
                    <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', marginTop: 2 }}>
                        {data?.total ?? 0} invoices
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => setModal({ type: 'create' })}>
                    <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
                    </svg>
                    New Sale
                </button>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                <select
                    className="field"
                    style={{ width: 180 }}
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                >
                    <option value="">All statuses</option>
                    <option value="draft">Draft</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="partial">Partial</option>
                    <option value="paid">Paid</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="overdue">⚠ Overdue</option>
                </select>
                <div style={{ position: 'relative' }}>
                    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"
                        style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }}>
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
                    </svg>
                    <input type="text" placeholder="Invoice # or customer…" value={search} onChange={e => setSearch(e.target.value)}
                        className="field" style={{ paddingLeft: 34, width: 240 }} />
                </div>
            </div>

            {isLoading ? (
                <div style={{ display: 'flex', gap: 6, padding: 24 }}>
                    {[0,1,2].map(i => <span key={i} className="loading-dot" style={{ animationDelay: `${i * 0.2}s` }} />)}
                </div>
            ) : (
                <div className="card" style={{ overflow: 'hidden' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                {['Invoice', 'Customer', 'Date', 'Status', 'Total', 'Paid', 'Balance', ''].map(h => (
                                    <th key={h}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(s => {
                                const balance = Number(s.total) - Number(s.amount_paid);
                                return (
                                    <tr key={s.id}>
                                        <td>
                                            <code style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.875rem', color: 'var(--indigo)' }}>
                                                {s.invoice_number}
                                            </code>
                                        </td>
                                        <td style={{ fontWeight: 500 }}>{s.customer?.name ?? <span style={{ color: 'var(--text-3)' }}>Walk-in</span>}</td>
                                        <td style={{ color: 'var(--text-3)', fontSize: '0.8125rem' }}>{s.sale_date}</td>
                                        <td>
                                            <span className={`badge ${STATUS_BADGE[s.status] ?? 'badge-gray'}`} style={{ textTransform: 'capitalize' }}>
                                                {s.status}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{Number(s.total).toFixed(2)}</td>
                                        <td style={{ color: 'var(--text-2)' }}>{Number(s.amount_paid).toFixed(2)}</td>
                                        <td style={{ fontWeight: balance > 0 ? 600 : 400, color: balance > 0 ? 'var(--amber)' : 'var(--text-3)' }}>
                                            {balance.toFixed(2)}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                                <button className="btn btn-ghost btn-sm" onClick={() => setModal({ type: 'detail', id: s.id })}>
                                                    View
                                                </button>
                                                {s.status === 'draft' && (
                                                    <button
                                                        className="btn btn-sm"
                                                        style={{ background: 'var(--indigo-light)', color: 'var(--indigo)', border: 'none' }}
                                                        onClick={() => confirmMutation.mutate(s.id)}
                                                    >Confirm</button>
                                                )}
                                                {!['paid', 'cancelled'].includes(s.status) && (
                                                    <button
                                                        className="btn btn-sm"
                                                        style={{ background: 'var(--red-light)', color: 'var(--red)', border: 'none' }}
                                                        onClick={() => { if (confirm('Cancel this sale?')) cancelMutation.mutate(s.id); }}
                                                    >Cancel</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {rows.length === 0 && (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '40px 16px' }}>
                                        No sales yet
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {!isOverdue && salesData?.last_page > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, fontSize: '0.875rem', color: 'var(--text-3)' }}>
                    <span>Page {salesData.current_page} of {salesData.last_page} · {salesData.total} invoices</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                        <button className="btn btn-ghost btn-sm" disabled={page >= salesData.last_page} onClick={() => setPage(p => p + 1)}>Next →</button>
                    </div>
                </div>
            )}

            {modal?.type === 'create' && <SaleForm onClose={() => setModal(null)} onSaved={() => addToast('Sale created')} />}
            {modal?.type === 'detail' && <SaleDetail id={modal.id} onClose={() => setModal(null)} />}
        </Layout>
    );
}
