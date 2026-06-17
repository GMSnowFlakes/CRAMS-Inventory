import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';

const emptyItem = () => ({ product_id: '', quantity: '1', unit_price: '', discount: '0', tax_rate: '0' });

export default function SaleForm({ onClose, onSaved }) {
    const qc = useQueryClient();
    const [form, setForm] = useState({
        customer_id: '',
        branch_id:   '',
        sale_date:   new Date().toISOString().slice(0, 10),
        due_date:    '',
        tax_rate:    '0',
        discount:    '0',
        status:      'draft',
        notes:       '',
    });
    const [items, setItems] = useState([emptyItem()]);

    const { data: customers } = useQuery({ queryKey: ['customers-all'], queryFn: () => api.get('/customers?all=1').then(r => r.data) });
    const { data: branches }  = useQuery({ queryKey: ['branches-all'],  queryFn: () => api.get('/branches').then(r => r.data.data ?? []) });
    const { data: products }  = useQuery({ queryKey: ['products-all'],  queryFn: () => api.get('/products?per_page=500').then(r => r.data.data ?? []) });

    const set     = (k, v) => setForm(f => ({ ...f, [k]: v }));
    const setItem = (i, k, v) => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [k]: v } : it));
    const addItem    = () => setItems(prev => [...prev, emptyItem()]);
    const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));

    const autofillPrice = (i, productId) => {
        const p = (products ?? []).find(p => String(p.id) === String(productId));
        if (p) setItems(prev => prev.map((it, idx) => idx === i ? { ...it, product_id: productId, unit_price: String(p.selling_price ?? '') } : it));
        else setItem(i, 'product_id', productId);
    };

    const subtotal = items.reduce((s, it) => {
        const gross   = (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0) - (parseFloat(it.discount) || 0);
        const lineTax = gross * ((parseFloat(it.tax_rate) || 0) / 100);
        return s + Math.max(0, gross + lineTax);
    }, 0);
    const orderDiscount = parseFloat(form.discount) || 0;
    const tax   = (subtotal - orderDiscount) * ((parseFloat(form.tax_rate) || 0) / 100);
    const total = Math.max(0, subtotal - orderDiscount + tax);

    const mutation = useMutation({
        mutationFn: (data) => api.post('/sales', data).then(r => r.data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['sales'] }); onSaved?.(); onClose(); },
    });

    const submit = (status) => {
        const validItems = items.filter(it => it.product_id && it.quantity && it.unit_price);
        if (!validItems.length) return;
        mutation.mutate({
            ...form,
            status,
            customer_id: form.customer_id || undefined,
            branch_id:   form.branch_id   || undefined,
            due_date:    form.due_date     || undefined,
            items: validItems.map(it => ({
                product_id: +it.product_id,
                quantity:   +it.quantity,
                unit_price: +it.unit_price,
                discount:   +it.discount  || 0,
                tax_rate:   +it.tax_rate  || 0,
            })),
        });
    };

    return (
        <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box" style={{ maxWidth: 720, margin: '0 16px' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0' }}>
                    <h2 style={{ fontSize: '1.0625rem', fontWeight: 600, color: 'var(--text-1)' }}>New Sale</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}>
                        <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                        </svg>
                    </button>
                </div>

                <div style={{ padding: '20px 24px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {mutation.error && (
                        <div className="alert-error">{mutation.error.response?.data?.message ?? 'Error saving'}</div>
                    )}

                    {/* Meta grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label className="form-label">Customer</label>
                            <select className="field" value={form.customer_id} onChange={e => set('customer_id', e.target.value)}>
                                <option value="">Walk-in customer</option>
                                {(customers ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Branch</label>
                            <select className="field" value={form.branch_id} onChange={e => set('branch_id', e.target.value)}>
                                <option value="">All branches</option>
                                {(branches ?? []).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Sale Date *</label>
                            <input type="date" className="field" value={form.sale_date} onChange={e => set('sale_date', e.target.value)} />
                        </div>
                        <div>
                            <label className="form-label">Due Date</label>
                            <input type="date" className="field" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
                        </div>
                        <div>
                            <label className="form-label">Tax Rate (%)</label>
                            <input type="number" min="0" max="100" step="0.01" className="field" value={form.tax_rate} onChange={e => set('tax_rate', e.target.value)} />
                        </div>
                        <div>
                            <label className="form-label">Order Discount</label>
                            <input type="number" min="0" step="0.01" className="field" value={form.discount} onChange={e => set('discount', e.target.value)} />
                        </div>
                    </div>

                    {/* Line items */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                                Line Items
                            </span>
                            <button onClick={addItem} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', color: 'var(--indigo)', fontWeight: 500 }}>
                                + Add item
                            </button>
                        </div>

                        {/* Column labels */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 100px 80px 70px 90px 24px', gap: 6, marginBottom: 4, fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 500, paddingLeft: 2 }}>
                            <span>Product</span><span>Qty</span><span>Unit Price</span><span>Discount</span><span>Tax %</span><span style={{ textAlign: 'right' }}>Line Total</span><span />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {items.map((item, i) => {
                                const gross    = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0) - (parseFloat(item.discount) || 0);
                                const lineTax  = gross * ((parseFloat(item.tax_rate) || 0) / 100);
                                const lineTotal = Math.max(0, gross + lineTax);
                                return (
                                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 100px 80px 70px 90px 24px', gap: 6, alignItems: 'center' }}>
                                        <select className="field" value={item.product_id} onChange={e => autofillPrice(i, e.target.value)}>
                                            <option value="">Select product</option>
                                            {(products ?? []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                        <input type="number" min="0.001" step="0.001" className="field" value={item.quantity} onChange={e => setItem(i, 'quantity', e.target.value)} />
                                        <input type="number" min="0" step="0.01" className="field" value={item.unit_price} onChange={e => setItem(i, 'unit_price', e.target.value)} />
                                        <input type="number" min="0" step="0.01" className="field" value={item.discount} onChange={e => setItem(i, 'discount', e.target.value)} />
                                        <input type="number" min="0" max="100" step="0.01" className="field" value={item.tax_rate} onChange={e => setItem(i, 'tax_rate', e.target.value)} placeholder="0" />
                                        <span style={{ textAlign: 'right', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-1)' }}>
                                            {lineTotal.toFixed(2)}
                                        </span>
                                        {items.length > 1 && (
                                            <button onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: '1.125rem', lineHeight: 1, padding: 2 }}>×</button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Totals */}
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, fontSize: '0.875rem' }}>
                        <div style={{ color: 'var(--text-2)' }}>Subtotal: <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{subtotal.toFixed(2)}</span></div>
                        {orderDiscount > 0 && <div style={{ color: 'var(--text-2)' }}>Discount: <span style={{ fontWeight: 600, color: 'var(--red)' }}>−{orderDiscount.toFixed(2)}</span></div>}
                        <div style={{ color: 'var(--text-2)' }}>Tax ({form.tax_rate}%): <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{tax.toFixed(2)}</span></div>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-1)' }}>Total: {total.toFixed(2)}</div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="form-label">Notes</label>
                        <textarea className="field" rows={2} style={{ resize: 'vertical' }} value={form.notes} onChange={e => set('notes', e.target.value)} />
                    </div>
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '20px 24px' }}>
                    <button onClick={onClose} className="btn btn-ghost">Cancel</button>
                    <button onClick={() => submit('draft')} disabled={mutation.isPending} className="btn btn-ghost">
                        Save as Draft
                    </button>
                    <button onClick={() => submit('confirmed')} disabled={mutation.isPending} className="btn btn-primary">
                        {mutation.isPending ? 'Creating…' : 'Confirm & Deduct Stock'}
                    </button>
                </div>
            </div>
        </div>
    );
}
