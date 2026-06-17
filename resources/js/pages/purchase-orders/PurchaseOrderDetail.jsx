import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import { useCurrency } from '../../hooks/useCurrency';
import { useToast } from '../../context/ToastContext';

const PAYMENT_METHODS = ['cash','card','bank_transfer','gcash','check','other'];

const STATUS_BADGE = {
    draft:     'badge-gray',
    sent:      'badge-sky',
    partial:   'badge-amber',
    received:  'badge-green',
    cancelled: 'badge-red',
};

export default function PurchaseOrderDetail({ id, onClose }) {
    const qc = useQueryClient();
    const [receiving, setReceiving] = useState({});
    const [payment, setPayment] = useState({ amount: '', payment_method: 'cash', reference: '', notes: '' });
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const { fmt } = useCurrency();
    const { addToast } = useToast();

    const { data: po, isLoading } = useQuery({
        queryKey: ['purchase-order', id],
        queryFn: () => api.get(`/purchase-orders/${id}`).then(r => r.data),
    });

    const receiveMutation = useMutation({
        mutationFn: (items) => api.post(`/purchase-orders/${id}/receive`, { items }).then(r => r.data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['purchase-orders'] });
            qc.invalidateQueries({ queryKey: ['purchase-order', id] });
            setReceiving({});
            addToast('Items received');
        },
    });

    const paymentMutation = useMutation({
        mutationFn: (data) => api.post(`/purchase-orders/${id}/record-payment`, data).then(r => r.data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['purchase-orders'] });
            qc.invalidateQueries({ queryKey: ['purchase-order', id] });
            setPayment({ amount: '', payment_method: 'cash', reference: '', notes: '' });
            setShowPaymentForm(false);
            addToast('Payment recorded');
        },
    });

    const submitPayment = () => {
        if (!payment.amount || parseFloat(payment.amount) <= 0) return;
        paymentMutation.mutate({ ...payment, amount: parseFloat(payment.amount) });
    };

    const handlePrint = () => {
        if (!po) return;
        const w = window.open('', '_blank', 'width=800,height=600');
        const rows = (po.items ?? []).map(item => `
            <tr>
                <td>${item.product?.name ?? '—'}</td>
                <td style="text-align:right">${item.quantity}</td>
                <td style="text-align:right">${Number(item.unit_price).toFixed(2)}</td>
                <td style="text-align:right">${(item.quantity * item.unit_price).toFixed(2)}</td>
            </tr>`).join('');
        w.document.write(`<!DOCTYPE html><html><head><title>PO ${po.po_number}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;font-size:13px;color:#111;padding:32px}
  h1{font-size:20px;margin-bottom:4px}
  table{width:100%;border-collapse:collapse;margin-top:16px}
  th{background:#f3f4f6;text-align:left;padding:8px 10px;font-size:11px;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #e5e7eb}
  td{padding:8px 10px;border-bottom:1px solid #f3f4f6}
  .totals{margin-top:16px;text-align:right;font-size:14px}
  .totals div{margin-bottom:4px}
  .grand{font-size:18px;font-weight:700;margin-top:8px}
  @media print{body{padding:0}}
</style></head><body>
<h1>Purchase Order</h1>
<p style="color:#555;margin-bottom:16px">PO# ${po.po_number} &bull; ${po.order_date} &bull; Status: ${po.status}</p>
<div style="margin-bottom:12px"><strong>Supplier:</strong> ${po.supplier?.name ?? '—'}</div>
<table><thead><tr><th>Product</th><th style="text-align:right">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Total</th></tr></thead>
<tbody>${rows}</tbody></table>
<div class="totals">
  <div>Subtotal: ${Number(po.subtotal ?? 0).toFixed(2)}</div>
  <div>Tax: ${Number(po.tax_amount ?? 0).toFixed(2)}</div>
  <div class="grand">Total: ${Number(po.total).toFixed(2)}</div>
  <div style="color:#059669">Paid: ${Number(po.amount_paid ?? 0).toFixed(2)}</div>
  <div style="color:#d97706">Balance: ${(Number(po.total) - Number(po.amount_paid ?? 0)).toFixed(2)}</div>
</div>
<script>window.onload=()=>{window.print();}</script>
</body></html>`);
        w.document.close();
    };

    if (isLoading) return (
        <div className="modal-overlay">
            <div className="modal-box" style={{ maxWidth: 400, padding: 40, textAlign: 'center' }}>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                    {[0,1,2].map(i => <span key={i} className="loading-dot" style={{ animationDelay: `${i * 0.2}s` }} />)}
                </div>
            </div>
        </div>
    );

    const canReceive = po && !['received', 'cancelled'].includes(po.status);

    const submitReceive = () => {
        const items = Object.entries(receiving)
            .filter(([, qty]) => parseFloat(qty) > 0)
            .map(([product_id, quantity_received]) => ({ product_id: +product_id, quantity_received: +quantity_received }));
        if (items.length === 0) return;
        receiveMutation.mutate(items);
    };

    return (
        <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box" style={{ maxWidth: 680, margin: '0 16px' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <code style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem', color: 'var(--indigo)' }}>{po?.po_number}</code>
                        <span className={`badge ${STATUS_BADGE[po?.status] ?? 'badge-gray'}`} style={{ textTransform: 'capitalize' }}>{po?.status}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button onClick={handlePrint} className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '5px 12px' }}>
                            🖨 Print
                        </button>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}>
                            <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
                        </button>
                    </div>
                </div>

                {/* Meta */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px', padding: '16px 24px 0', fontSize: '0.875rem' }}>
                    <div><span style={{ color: 'var(--text-3)' }}>Supplier: </span><span style={{ fontWeight: 600 }}>{po?.supplier?.name}</span></div>
                    <div><span style={{ color: 'var(--text-3)' }}>Branch: </span><span>{po?.branch?.name ?? 'All'}</span></div>
                    <div><span style={{ color: 'var(--text-3)' }}>Order Date: </span>{po?.order_date}</div>
                    <div><span style={{ color: 'var(--text-3)' }}>Expected: </span>{po?.expected_date ?? '—'}</div>
                </div>

                {/* Items table */}
                <div style={{ padding: '16px 24px 0', overflowX: 'auto' }}>
                    <table className="data-table" style={{ marginTop: 0 }}>
                        <thead>
                            <tr>
                                {['Product', 'Ordered', 'Received', 'Unit Cost', 'Total', canReceive && 'Receive Qty'].filter(Boolean).map(h => <th key={h}>{h}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {po?.items?.map(item => (
                                <tr key={item.id}>
                                    <td style={{ fontWeight: 500 }}>{item.product?.name}</td>
                                    <td>{item.quantity_ordered}</td>
                                    <td style={{ color: item.quantity_received > 0 ? 'var(--green)' : 'var(--text-3)' }}>{item.quantity_received}</td>
                                    <td style={{ color: 'var(--text-2)' }}>{fmt(item.unit_cost)}</td>
                                    <td style={{ fontWeight: 600 }}>{fmt(item.total_cost)}</td>
                                    {canReceive && (
                                        <td>
                                            <input
                                                type="number" min="0" step="0.001" placeholder="0"
                                                className="field" style={{ width: 80, padding: '4px 8px' }}
                                                value={receiving[item.product_id] ?? ''}
                                                onChange={e => setReceiving(r => ({ ...r, [item.product_id]: e.target.value }))}
                                            />
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div style={{ borderTop: '1px solid var(--border)', margin: '16px 24px 0', paddingTop: 12, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, fontSize: '0.875rem' }}>
                    <div style={{ color: 'var(--text-2)' }}>Subtotal: <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>${Number(po?.subtotal).toFixed(2)}</span></div>
                    <div style={{ color: 'var(--text-2)' }}>Tax: <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>${Number(po?.tax).toFixed(2)}</span></div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-1)' }}>Total: ${Number(po?.total_amount ?? po?.total).toFixed(2)}</div>
                    {po?.amount_paid > 0 && <>
                        <div style={{ color: 'var(--green)', fontWeight: 600 }}>Paid: {fmt(po.amount_paid)}</div>
                        <div style={{ color: Number(po.total_amount ?? po.total) - Number(po.amount_paid) > 0 ? 'var(--amber)' : 'var(--text-3)', fontWeight: 700 }}>
                            Balance: {fmt(Math.max(0, Number(po.total_amount ?? po.total) - Number(po.amount_paid)))}
                        </div>
                    </>}
                </div>

                {/* Payment history */}
                {po?.payments?.length > 0 && (
                    <div style={{ padding: '12px 24px 0' }}>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>Payment History</div>
                        <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                            <table className="data-table" style={{ margin: 0 }}>
                                <thead>
                                    <tr>
                                        <th>Date</th><th>Method</th><th>Reference</th><th style={{ textAlign: 'right' }}>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {po.payments.map(p => (
                                        <tr key={p.id}>
                                            <td style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>{p.created_at?.slice(0,10)}</td>
                                            <td style={{ textTransform: 'capitalize' }}>{p.payment_method?.replace('_',' ')}</td>
                                            <td style={{ color: 'var(--text-3)' }}>{p.reference ?? '—'}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--green)' }}>{fmt(p.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Record payment form */}
                {po && !['cancelled'].includes(po.status) && (
                    <div style={{ padding: '12px 24px 0' }}>
                        {!showPaymentForm ? (
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => setShowPaymentForm(true)}
                                style={{ color: 'var(--indigo)', borderColor: 'var(--indigo-light)', background: 'var(--indigo-light)' }}
                            >+ Record Payment</button>
                        ) : (
                            <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Record Supplier Payment</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-3)', display: 'block', marginBottom: 3 }}>Amount *</label>
                                        <input type="number" min="0.01" step="0.01" className="field" style={{ width: '100%' }}
                                            value={payment.amount} onChange={e => setPayment(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-3)', display: 'block', marginBottom: 3 }}>Method</label>
                                        <select className="field" style={{ width: '100%' }} value={payment.payment_method}
                                            onChange={e => setPayment(p => ({ ...p, payment_method: e.target.value }))}>
                                            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace('_',' ')}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-3)', display: 'block', marginBottom: 3 }}>Reference</label>
                                        <input type="text" className="field" style={{ width: '100%' }}
                                            value={payment.reference} onChange={e => setPayment(p => ({ ...p, reference: e.target.value }))} placeholder="Check #, receipt #…" />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-3)', display: 'block', marginBottom: 3 }}>Notes</label>
                                        <input type="text" className="field" style={{ width: '100%' }}
                                            value={payment.notes} onChange={e => setPayment(p => ({ ...p, notes: e.target.value }))} placeholder="Optional" />
                                    </div>
                                </div>
                                {paymentMutation.error && (
                                    <div className="alert-error">{paymentMutation.error.response?.data?.message ?? 'Error recording payment'}</div>
                                )}
                                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                    <button className="btn btn-ghost btn-sm" onClick={() => setShowPaymentForm(false)}>Cancel</button>
                                    <button className="btn btn-primary btn-sm" onClick={submitPayment} disabled={paymentMutation.isPending}>
                                        {paymentMutation.isPending ? 'Saving…' : 'Save Payment'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {receiveMutation.error && (
                    <div style={{ padding: '0 24px', marginTop: 12 }}>
                        <div className="alert-error">{receiveMutation.error.response?.data?.message ?? 'Error'}</div>
                    </div>
                )}

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '20px 24px' }}>
                    <button onClick={onClose} className="btn btn-ghost">Close</button>
                    {canReceive && (
                        <button onClick={submitReceive} disabled={receiveMutation.isPending} className="btn btn-primary" style={{ background: 'var(--green)', '--btn-hover': '#15803d' }}>
                            {receiveMutation.isPending ? 'Receiving…' : 'Confirm Receipt'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
