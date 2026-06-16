import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';

const emptyItem = () => ({ product_id: '', quantity: '', unit_cost: '' });

export default function PurchaseOrderForm({ onClose, onSaved }) {
    const qc = useQueryClient();
    const [form, setForm] = useState({
        supplier_id: '', branch_id: '', order_date: new Date().toISOString().slice(0, 10),
        expected_date: '', tax_rate: '0', notes: '',
    });
    const [items, setItems] = useState([emptyItem()]);

    const { data: suppliers } = useQuery({ queryKey: ['suppliers-all'], queryFn: () => api.get('/suppliers?per_page=200').then(r => r.data.data ?? []) });
    const { data: branches }  = useQuery({ queryKey: ['branches-all'],  queryFn: () => api.get('/branches').then(r => r.data.data ?? []) });
    const { data: products }  = useQuery({ queryKey: ['products-all'],  queryFn: () => api.get('/products?per_page=500').then(r => r.data.data ?? []) });

    const mutation = useMutation({
        mutationFn: (data) => api.post('/purchase-orders', data).then(r => r.data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchase-orders'] }); onSaved?.(); onClose(); },
    });

    const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));
    const setItem  = (i, k, v) => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [k]: v } : it));
    const addItem  = () => setItems(prev => [...prev, emptyItem()]);
    const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));

    const subtotal = items.reduce((s, it) => s + (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_cost) || 0), 0);
    const tax = subtotal * ((parseFloat(form.tax_rate) || 0) / 100);

    const submit = () => {
        const validItems = items.filter(it => it.product_id && it.quantity && it.unit_cost);
        mutation.mutate({ ...form, items: validItems.map(it => ({ product_id: +it.product_id, quantity: +it.quantity, unit_cost: +it.unit_cost })) });
    };

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box" style={{ maxWidth: 680, margin: '0 16px' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0' }}>
                    <h2 style={{ fontSize: '1.0625rem', fontWeight: 600, color: 'var(--text-1)' }}>New Purchase Order</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}>
                        <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '20px 24px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {mutation.error && <div className="alert-error">{mutation.error.response?.data?.message ?? 'Error saving'}</div>}

                    {/* Meta grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label className="form-label">Supplier *</label>
                            <select className="field" value={form.supplier_id} onChange={e => setField('supplier_id', e.target.value)}>
                                <option value="">Select supplier</option>
                                {(suppliers ?? []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Branch</label>
                            <select className="field" value={form.branch_id} onChange={e => setField('branch_id', e.target.value)}>
                                <option value="">All branches</option>
                                {(branches ?? []).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Order Date *</label>
                            <input type="date" className="field" value={form.order_date} onChange={e => setField('order_date', e.target.value)} />
                        </div>
                        <div>
                            <label className="form-label">Expected Date</label>
                            <input type="date" className="field" value={form.expected_date} onChange={e => setField('expected_date', e.target.value)} />
                        </div>
                        <div>
                            <label className="form-label">Tax Rate (%)</label>
                            <input type="number" min="0" max="100" className="field" value={form.tax_rate} onChange={e => setField('tax_rate', e.target.value)} />
                        </div>
                    </div>

                    {/* Line items */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Line Items</span>
                            <button onClick={addItem} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', color: 'var(--indigo)', fontWeight: 500 }}>+ Add item</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {items.map((item, i) => (
                                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <select className="field" style={{ flex: 1 }} value={item.product_id} onChange={e => setItem(i, 'product_id', e.target.value)}>
                                        <option value="">Product</option>
                                        {(products ?? []).map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                                    </select>
                                    <input type="number" min="0.001" step="0.001" placeholder="Qty" className="field" style={{ width: 80 }} value={item.quantity} onChange={e => setItem(i, 'quantity', e.target.value)} />
                                    <input type="number" min="0" step="0.01" placeholder="Unit cost" className="field" style={{ width: 100 }} value={item.unit_cost} onChange={e => setItem(i, 'unit_cost', e.target.value)} />
                                    <span style={{ width: 72, textAlign: 'right', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-1)' }}>
                                        ${((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_cost) || 0)).toFixed(2)}
                                    </span>
                                    {items.length > 1 && (
                                        <button onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: '1.125rem', lineHeight: 1, padding: 2 }}>×</button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Totals */}
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, fontSize: '0.875rem' }}>
                        <div style={{ color: 'var(--text-2)' }}>Subtotal: <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>${subtotal.toFixed(2)}</span></div>
                        <div style={{ color: 'var(--text-2)' }}>Tax ({form.tax_rate}%): <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>${tax.toFixed(2)}</span></div>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-1)' }}>Total: ${(subtotal + tax).toFixed(2)}</div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="form-label">Notes</label>
                        <textarea className="field" rows={2} style={{ resize: 'vertical' }} value={form.notes} onChange={e => setField('notes', e.target.value)} />
                    </div>
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '20px 24px' }}>
                    <button onClick={onClose} className="btn btn-ghost">Cancel</button>
                    <button onClick={submit} disabled={mutation.isPending} className="btn btn-primary">
                        {mutation.isPending ? 'Creating…' : 'Create PO'}
                    </button>
                </div>
            </div>
        </div>
    );
}
