import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/Layout';
import api from '../../api/client';
import CustomerForm from './CustomerForm';
import { useCurrency } from '../../hooks/useCurrency';
import { useToast } from '../../context/ToastContext';

const STATUS_BADGE = {
    draft:     'badge-gray',
    confirmed: 'badge-sky',
    partial:   'badge-amber',
    paid:      'badge-green',
    cancelled: 'badge-red',
};

function CustomerStatementModal({ customerId, onClose }) {
    const { fmt } = useCurrency();
    const { data, isLoading } = useQuery({
        queryKey: ['customer-statement', customerId],
        queryFn: () => api.get(`/reports/customer-statement/${customerId}`).then(r => r.data),
    });

    const today = new Date().toISOString().slice(0, 10);

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box" style={{ maxWidth: 700, margin: '0 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0' }}>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                            {isLoading ? 'Loading…' : data?.customer?.name} — Statement
                        </div>
                        {data?.customer?.email && <div style={{ fontSize: '0.8125rem', color: 'var(--text-3)', marginTop: 2 }}>{data.customer.email}{data.customer.phone ? ` · ${data.customer.phone}` : ''}</div>}
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
                                    { label: 'Total Billed',  val: fmt(data.total_billed),      color: 'var(--indigo)' },
                                    { label: 'Total Paid',    val: fmt(data.total_paid),        color: 'var(--green)' },
                                    { label: 'Outstanding',   val: fmt(data.total_outstanding), color: data.total_outstanding > 0 ? 'var(--amber)' : 'var(--text-3)' },
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
                                            <th>Invoice</th><th>Date</th><th>Due</th>
                                            <th>Status</th>
                                            <th style={{ textAlign: 'right' }}>Total</th>
                                            <th style={{ textAlign: 'right' }}>Paid</th>
                                            <th style={{ textAlign: 'right' }}>Balance</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(data.invoices ?? []).map(inv => {
                                            const overdue = inv.due_date && inv.due_date < today && inv.balance > 0;
                                            return (
                                                <tr key={inv.id}>
                                                    <td><code style={{ fontSize: '0.75rem', color: 'var(--indigo)' }}>{inv.invoice_number}</code></td>
                                                    <td style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>{inv.sale_date}</td>
                                                    <td style={{ color: overdue ? 'var(--red)' : 'var(--text-3)', fontSize: '0.8rem', fontWeight: overdue ? 600 : 400 }}>{inv.due_date ?? '—'}{overdue ? ' ⚠' : ''}</td>
                                                    <td><span className={`badge ${STATUS_BADGE[inv.status] ?? 'badge-gray'}`} style={{ textTransform: 'capitalize' }}>{inv.status}</span></td>
                                                    <td style={{ textAlign: 'right' }}>{fmt(inv.total)}</td>
                                                    <td style={{ textAlign: 'right', color: 'var(--green)' }}>{fmt(inv.amount_paid)}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: inv.balance > 0 ? 700 : 400, color: inv.balance > 0 ? 'var(--amber)' : 'var(--text-3)' }}>{fmt(inv.balance)}</td>
                                                </tr>
                                            );
                                        })}
                                        {!data.invoices?.length && (
                                            <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '24px 0' }}>No invoices found</td></tr>
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

export default function CustomersPage() {
    const qc = useQueryClient();
    const { addToast } = useToast();
    const [search, setSearch]         = useState('');
    const [page, setPage]             = useState(1);
    const [editing, setEditing]       = useState(null);
    const [formOpen, setFormOpen]     = useState(false);
    const [statementId, setStatementId] = useState(null);

    useEffect(() => { setPage(1); }, [search]);

    const { data, isLoading } = useQuery({
        queryKey: ['customers', search, page],
        queryFn: () => api.get('/customers', { params: { search: search || undefined, page } }).then(r => r.data),
    });

    const destroy = useMutation({
        mutationFn: (id) => api.delete(`/customers/${id}`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); addToast('Customer deleted', 'error'); },
    });

    const rows = data?.data ?? [];

    const openCreate = () => { setEditing(null); setFormOpen(true); };
    const openEdit   = (c) => { setEditing(c);   setFormOpen(true); };
    const closeForm  = () => { setFormOpen(false); setEditing(null); };

    return (
        <Layout>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Customers</h1>
                    <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', marginTop: 2 }}>
                        {data?.total ?? 0} customers
                    </p>
                </div>
                <button className="btn btn-primary" onClick={openCreate}>
                    <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
                    </svg>
                    New Customer
                </button>
            </div>

            <div style={{ marginBottom: 16 }}>
                <input
                    className="field"
                    style={{ maxWidth: 320 }}
                    placeholder="Search name, email, phone…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
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
                                {['Name', 'Email', 'Phone', 'Contact Person', 'Status', ''].map(h => (
                                    <th key={h}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(c => (
                                <tr key={c.id}>
                                    <td style={{ fontWeight: 500 }}>{c.name}</td>
                                    <td style={{ color: 'var(--text-2)' }}>{c.email ?? '—'}</td>
                                    <td style={{ color: 'var(--text-2)' }}>{c.phone ?? '—'}</td>
                                    <td style={{ color: 'var(--text-2)' }}>{c.contact_person ?? '—'}</td>
                                    <td>
                                        <span className={`badge ${c.is_active ? 'badge-green' : 'badge-gray'}`}>
                                            {c.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                            <button className="btn btn-ghost btn-sm" onClick={() => setStatementId(c.id)}>Statement</button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}>Edit</button>
                                            <button
                                                className="btn btn-sm"
                                                style={{ background: 'var(--red-light)', color: 'var(--red)', border: 'none' }}
                                                onClick={() => { if (confirm(`Delete ${c.name}?`)) destroy.mutate(c.id); }}
                                            >Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {rows.length === 0 && (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '40px 16px' }}>
                                        No customers yet
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {data?.last_page > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, fontSize: '0.875rem', color: 'var(--text-3)' }}>
                    <span>Page {data.current_page} of {data.last_page} · {data.total} customers</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                        <button className="btn btn-ghost btn-sm" disabled={page >= data.last_page} onClick={() => setPage(p => p + 1)}>Next →</button>
                    </div>
                </div>
            )}
            {formOpen && <CustomerForm customer={editing} onClose={closeForm} onSaved={() => addToast(editing ? 'Customer updated' : 'Customer added')} />}
            {statementId && <CustomerStatementModal customerId={statementId} onClose={() => setStatementId(null)} />}
        </Layout>
    );
}
