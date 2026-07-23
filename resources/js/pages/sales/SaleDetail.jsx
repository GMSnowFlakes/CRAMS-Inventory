import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { printDocument } from '../../utils/printTemplate';

const STATUS_BADGE = {
    draft:     'badge-gray',
    confirmed: 'badge-sky',
    partial:   'badge-amber',
    paid:      'badge-green',
    cancelled: 'badge-red',
};

const PAYMENT_METHODS = [
    { value: 'cash',          label: 'Cash' },
    { value: 'card',          label: 'Card' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'gcash',         label: 'GCash' },
    { value: 'check',         label: 'Check' },
    { value: 'other',         label: 'Other' },
];

export default function SaleDetail({ id, onClose }) {
    const qc = useQueryClient();
    const { addToast } = useToast();
    const [payAmount, setPayAmount] = useState('');
    const [payMethod, setPayMethod] = useState('cash');
    const [payRef,    setPayRef]    = useState('');
    const [payError,  setPayError]  = useState('');

    const { data: sale, isLoading } = useQuery({
        queryKey: ['sale', id],
        queryFn: () => api.get(`/sales/${id}`).then(r => r.data),
    });

    const payMutation = useMutation({
        mutationFn: (payload) => api.post(`/sales/${id}/record-payment`, payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['sale', id] });
            qc.invalidateQueries({ queryKey: ['sales'] });
            setPayAmount('');
            setPayRef('');
            setPayError('');
            addToast('Payment recorded');
        },
        onError: (err) => setPayError(err.response?.data?.message ?? 'Error recording payment'),
    });

    const handlePay = () => {
        const amt = parseFloat(payAmount);
        if (!amt || amt <= 0) { setPayError('Enter a valid amount'); return; }
        payMutation.mutate({ amount: amt, payment_method: payMethod, reference: payRef });
    };

    const handlePrint = () => {
        if (!sale) return;
        const rows = (sale.items ?? []).map(it => `
            <tr>
                <td>${it.product?.name ?? '—'}</td>
                <td style="text-align:right">${it.quantity}</td>
                <td style="text-align:right">${Number(it.unit_price ?? 0).toFixed(2)}</td>
                <td style="text-align:right">${Number(it.total ?? 0).toFixed(2)}</td>
            </tr>`).join('');
        const balance = Number(sale.total) - Number(sale.amount_paid);
        printDocument({
            title: 'Invoice',
            subtitle: `${sale.invoice_number} &bull; ${sale.sale_date} &bull; <span class="badge badge-${sale.status}">${sale.status}</span>`,
            companyName: sale.customer?.name ?? 'Walk-in Customer',
            body: `
                <div class="doc-section">
                    <div class="doc-section-title">Customer</div>
                    <div>${sale.customer?.name ?? 'Walk-in'}</div>
                </div>
                <table><thead><tr>
                    <th>Product</th><th style="text-align:right">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Total</th>
                </tr></thead><tbody>${rows}</tbody></table>
                <div class="totals">
                    <div class="row"><span>Subtotal</span><span>${Number(sale.subtotal ?? sale.total ?? 0).toFixed(2)}</span></div>
                    ${sale.tax_amount ? `<div class="row"><span>Tax</span><span>${Number(sale.tax_amount).toFixed(2)}</span></div>` : ''}
                    <div class="grand row"><span>Total</span><span>${Number(sale.total).toFixed(2)}</span></div>
                    <div class="row" style="color:#059669"><span>Paid</span><span>${Number(sale.amount_paid).toFixed(2)}</span></div>
                    ${balance > 0.01 ? `<div class="row" style="color:#d97706"><span>Balance Due</span><span>${balance.toFixed(2)}</span></div>` : ''}
                </div>`,
        });
    };

    if (isLoading) return (
        <div className="modal-overlay">
            <div className="modal-box" style={{ maxWidth: 640, margin: '0 16px', padding: 40, display: 'flex', gap: 6 }}>
                {[0,1,2].map(i => <span key={i} className="loading-dot" style={{ animationDelay: `${i * 0.2}s` }} />)}
            </div>
        </div>
    );

    const balance = Number(sale.total) - Number(sale.amount_paid);
    const canPay  = ['confirmed', 'partial'].includes(sale.status);

    return (
        <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box" style={{ maxWidth: 660, margin: '0 16px' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '20px 24px 0' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <code style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem', color: 'var(--indigo)' }}>
                                {sale.invoice_number}
                            </code>
                            <span className={`badge ${STATUS_BADGE[sale.status] ?? 'badge-gray'}`} style={{ textTransform: 'capitalize' }}>
                                {sale.status}
                            </span>
                        </div>
                        <div style={{ color: 'var(--text-3)', fontSize: '0.8125rem', marginTop: 3 }}>
                            {sale.sale_date} {sale.customer ? `· ${sale.customer.name}` : '· Walk-in'}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button onClick={handlePrint} className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '5px 12px' }}>
                            🖨 Print
                        </button>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}>
                            <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                            </svg>
                        </button>
                    </div>
                </div>

                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Hidden printable content */}
                    <div id="invoice-print-content" style={{ display: 'none' }}>
                        <div className="header">
                            <div>
                                <h1>Invoice</h1>
                                <div className="meta">
                                    <strong>{sale.invoice_number}</strong><br />
                                    Date: {sale.sale_date}<br />
                                    Status: <span className={`badge badge-${sale.status}`}>{sale.status}</span>
                                </div>
                            </div>
                            <div className="meta" style={{ textAlign: 'right' }}>
                                {sale.customer ? (
                                    <>Bill To:<br /><strong>{sale.customer.name}</strong><br />{sale.customer.email || ''}<br />{sale.customer.phone || ''}</>
                                ) : 'Walk-in Customer'}
                            </div>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Product</th><th>Qty</th><th>Unit Price</th><th>Discount</th><th style={{ textAlign: 'right' }}>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(sale.items ?? []).map(item => (
                                    <tr key={item.id}>
                                        <td>{item.product?.name ?? `Product #${item.product_id}`}</td>
                                        <td>{Number(item.quantity)}</td>
                                        <td>{Number(item.unit_price).toFixed(2)}</td>
                                        <td>{Number(item.discount) > 0 ? Number(item.discount).toFixed(2) : '—'}</td>
                                        <td style={{ textAlign: 'right' }}>{Number(item.total).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="totals">
                            <div><span>Subtotal</span><span>{Number(sale.subtotal).toFixed(2)}</span></div>
                            {Number(sale.discount) > 0 && <div><span>Discount</span><span>−{Number(sale.discount).toFixed(2)}</span></div>}
                            <div><span>Tax</span><span>{Number(sale.tax).toFixed(2)}</span></div>
                            <div className="total-row"><span>Total</span><span>{Number(sale.total).toFixed(2)}</span></div>
                            <div><span>Paid</span><span>{Number(sale.amount_paid).toFixed(2)}</span></div>
                            {balance > 0 && <div><span>Balance Due</span><span>{balance.toFixed(2)}</span></div>}
                        </div>
                        {sale.notes && <p style={{ marginTop: 20, color: '#6b7280', fontSize: '12px' }}>Notes: {sale.notes}</p>}
                    </div>

                    {/* Line items */}
                    <table className="data-table">
                        <thead>
                            <tr>
                                {['Product', 'Qty', 'Unit Price', 'Discount', 'Total'].map(h => <th key={h}>{h}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {(sale.items ?? []).map(item => (
                                <tr key={item.id}>
                                    <td style={{ fontWeight: 500 }}>{item.product?.name ?? `Product #${item.product_id}`}</td>
                                    <td>{Number(item.quantity)}</td>
                                    <td>{Number(item.unit_price).toFixed(2)}</td>
                                    <td>{Number(item.discount) > 0 ? Number(item.discount).toFixed(2) : '—'}</td>
                                    <td style={{ fontWeight: 600 }}>{Number(item.total).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Totals */}
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, fontSize: '0.875rem' }}>
                        <div style={{ color: 'var(--text-2)' }}>Subtotal: <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{Number(sale.subtotal).toFixed(2)}</span></div>
                        {Number(sale.discount) > 0 && (
                            <div style={{ color: 'var(--text-2)' }}>Discount: <span style={{ fontWeight: 600, color: 'var(--red)' }}>−{Number(sale.discount).toFixed(2)}</span></div>
                        )}
                        <div style={{ color: 'var(--text-2)' }}>Tax: <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{Number(sale.tax).toFixed(2)}</span></div>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-1)' }}>Total: {Number(sale.total).toFixed(2)}</div>
                        <div style={{ color: 'var(--text-2)' }}>Paid: <span style={{ fontWeight: 600, color: 'var(--green)' }}>{Number(sale.amount_paid).toFixed(2)}</span></div>
                        {balance > 0 && (
                            <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--amber)' }}>Balance: {balance.toFixed(2)}</div>
                        )}
                    </div>

                    {/* Payment history */}
                    {sale.payments?.length > 0 && (
                        <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '12px 14px' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Payment History</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {sale.payments.map(p => (
                                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                                        <span style={{ color: 'var(--text-3)' }}>{p.created_at?.slice(0, 10)} · {PAYMENT_METHODS.find(m => m.value === p.payment_method)?.label ?? p.payment_method}</span>
                                        <span style={{ fontWeight: 600, color: 'var(--green)' }}>+{Number(p.amount).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Record payment */}
                    {canPay && (
                        <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Record Payment</span>
                            {payError && <div className="alert-error" style={{ fontSize: '0.8125rem' }}>{payError}</div>}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                <div>
                                    <label className="field-label">Amount</label>
                                    <input
                                        type="number" min="0.01" step="0.01"
                                        className="field"
                                        placeholder={`Max ${balance.toFixed(2)}`}
                                        value={payAmount}
                                        onChange={e => setPayAmount(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="field-label">Method</label>
                                    <select className="field" value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                                        {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="field-label">Reference (optional)</label>
                                <input className="field" placeholder="Receipt #, transaction ID…" value={payRef} onChange={e => setPayRef(e.target.value)} />
                            </div>
                            <button className="btn btn-primary" onClick={handlePay} disabled={payMutation.isPending} style={{ alignSelf: 'flex-end' }}>
                                {payMutation.isPending ? 'Saving…' : 'Record Payment'}
                            </button>
                        </div>
                    )}

                    {/* Notes */}
                    {sale.notes && (
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-2)', background: 'var(--surface-2)', borderRadius: 8, padding: '10px 14px' }}>
                            {sale.notes}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 24px 20px' }}>
                    <button onClick={onClose} className="btn btn-ghost">Close</button>
                </div>
            </div>
        </div>
    );
}
