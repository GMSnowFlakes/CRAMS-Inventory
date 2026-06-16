import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client';
import Layout from '../../components/Layout';
import SupplierForm from './SupplierForm';
import { usePermission } from '../../hooks/usePermission';
import { useCurrency } from '../../hooks/useCurrency';
import { useToast } from '../../context/ToastContext';

function SupplierStatementModal({ supplierId, onClose }) {
    const { fmt } = useCurrency();
    const { data, isLoading } = useQuery({
        queryKey: ['supplier-statement', supplierId],
        queryFn: () => client.get(`/reports/supplier-statement/${supplierId}`).then(r => r.data),
    });

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box" style={{ maxWidth: 700, margin: '0 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0' }}>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                            {isLoading ? 'Loading…' : data?.supplier?.name} — Supplier Statement
                        </div>
                        {data?.supplier?.email && <div style={{ fontSize: '0.8125rem', color: 'var(--text-3)', marginTop: 2 }}>{data.supplier.email}{data.supplier.phone ? ` · ${data.supplier.phone}` : ''}</div>}
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}>
                        <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                        </svg>
                    </button>
                </div>

                <div style={{ padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {isLoading ? (
                        <div style={{ display: 'flex', gap: 6 }}>{[0,1,2].map(i => <span key={i} className="loading-dot" style={{ animationDelay: `${i*0.2}s` }} />)}</div>
                    ) : (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                                {[
                                    { label: 'Total Ordered', val: fmt(data.total_ordered), color: 'var(--indigo)' },
                                    { label: 'Total Paid',    val: fmt(data.total_paid),    color: 'var(--green)' },
                                    { label: 'Total Owing',  val: fmt(data.total_owing),   color: data.total_owing > 0 ? 'var(--amber)' : 'var(--text-3)' },
                                ].map(({ label, val, color }) => (
                                    <div key={label} className="card" style={{ padding: '12px 14px' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 4 }}>{label}</div>
                                        <div style={{ fontWeight: 700, fontSize: '1.1rem', color }}>{val}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="card" style={{ overflow: 'hidden' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>PO #</th><th>Date</th><th>Status</th>
                                            <th style={{ textAlign: 'right' }}>Total</th>
                                            <th style={{ textAlign: 'right' }}>Paid</th>
                                            <th style={{ textAlign: 'right' }}>Balance</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(data.purchase_orders ?? []).map(po => (
                                            <tr key={po.id}>
                                                <td><code style={{ fontSize: '0.75rem', color: 'var(--indigo)' }}>{po.po_number}</code></td>
                                                <td style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>{po.order_date}</td>
                                                <td><span className={`badge badge-${po.status === 'received' ? 'green' : po.status === 'cancelled' ? 'red' : 'amber'}`} style={{ textTransform: 'capitalize' }}>{po.status}</span></td>
                                                <td style={{ textAlign: 'right' }}>{fmt(po.total)}</td>
                                                <td style={{ textAlign: 'right', color: 'var(--green)' }}>{fmt(po.amount_paid)}</td>
                                                <td style={{ textAlign: 'right', fontWeight: po.balance > 0 ? 700 : 400, color: po.balance > 0 ? 'var(--amber)' : 'var(--text-3)' }}>{fmt(po.balance)}</td>
                                            </tr>
                                        ))}
                                        {!data.purchase_orders?.length && (
                                            <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '24px 0' }}>No purchase orders</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function SuppliersPage() {
    const qc = useQueryClient();
    const { can } = usePermission();
    const { addToast } = useToast();
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [statementId, setStatementId] = useState(null);

    useEffect(() => { setPage(1); }, [search]);

    const { data, isLoading } = useQuery({
        queryKey: ['suppliers', search, page],
        queryFn: () => client.get('/suppliers', { params: { search: search || undefined, page } }).then(r => r.data),
    });

    const destroy = useMutation({
        mutationFn: (id) => client.delete(`/suppliers/${id}`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); addToast('Supplier deleted', 'error'); },
    });

    return (
        <Layout>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Suppliers</h1>
                    <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', marginTop: 2 }}>{data?.total ?? 0} suppliers</p>
                </div>
                {can('manageSuppliers') && (
                    <button onClick={() => { setEditing(null); setFormOpen(true); }} className="btn btn-primary">
                        <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/></svg>
                        Add Supplier
                    </button>
                )}
            </div>

            <div style={{ position: 'relative', maxWidth: 320, marginBottom: 16 }}>
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"
                    style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }}>
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
                </svg>
                <input type="text" placeholder="Search suppliers…" value={search} onChange={e => setSearch(e.target.value)} className="field" style={{ paddingLeft: 34 }} />
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
                                {['Name', 'Contact Person', 'Email', 'Phone', 'Status', ''].map(h => <th key={h}>{h}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {data?.data?.map(s => (
                                <tr key={s.id}>
                                    <td style={{ fontWeight: 500 }}>{s.name}</td>
                                    <td style={{ color: 'var(--text-2)' }}>{s.contact_person ?? '—'}</td>
                                    <td style={{ color: 'var(--text-2)' }}>{s.email ?? '—'}</td>
                                    <td style={{ color: 'var(--text-2)' }}>{s.phone ?? '—'}</td>
                                    <td><span className={`badge ${s.is_active ? 'badge-green' : 'badge-gray'}`}>{s.is_active ? 'Active' : 'Inactive'}</span></td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                            <button className="btn btn-ghost btn-sm" onClick={() => setStatementId(s.id)}>Statement</button>
                                            {can('manageSuppliers') && (
                                                <button onClick={() => { setEditing(s); setFormOpen(true); }} className="btn btn-ghost btn-sm">Edit</button>
                                            )}
                                            {can('manageSuppliers') && (
                                                <button onClick={() => { if (confirm(`Delete "${s.name}"?`)) destroy.mutate(s.id); }} className="btn btn-sm" style={{ background: 'var(--red-light)', color: 'var(--red)', border: 'none' }}>Delete</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!data?.data?.length && (
                                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '40px 16px' }}>No suppliers found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
            {data?.last_page > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, fontSize: '0.875rem', color: 'var(--text-3)' }}>
                    <span>Page {data.current_page} of {data.last_page} · {data.total} suppliers</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                        <button className="btn btn-ghost btn-sm" disabled={page >= data.last_page} onClick={() => setPage(p => p + 1)}>Next →</button>
                    </div>
                </div>
            )}
            {formOpen && <SupplierForm supplier={editing} onClose={() => { setFormOpen(false); setEditing(null); }} onSaved={() => addToast(editing ? 'Supplier updated' : 'Supplier added')} />}
            {statementId && <SupplierStatementModal supplierId={statementId} onClose={() => setStatementId(null)} />}
        </Layout>
    );
}
