import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';

const emptyItem = () => ({ product_id: '', quantity: '' });

export default function TransferOrderForm({ onClose, onSaved }) {
    const qc = useQueryClient();
    const [form, setForm] = useState({
        from_branch_id: '', to_branch_id: '',
        transfer_date: new Date().toISOString().slice(0, 10),
        notes: '',
    });
    const [items, setItems] = useState([emptyItem()]);

    const { data: branches } = useQuery({ queryKey: ['branches-all'], queryFn: () => api.get('/branches').then(r => r.data.data ?? []) });
    const { data: products } = useQuery({ queryKey: ['products-all'], queryFn: () => api.get('/products?per_page=500').then(r => r.data.data ?? []) });

    const mutation = useMutation({
        mutationFn: (data) => api.post('/transfer-orders', data).then(r => r.data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['transfer-orders'] }); onSaved?.(); onClose(); },
    });

    const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));
    const setItem  = (i, k, v) => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [k]: v } : it));
    const addItem  = () => setItems(prev => [...prev, emptyItem()]);
    const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));

    const submit = () => {
        const validItems = items.filter(it => it.product_id && it.quantity);
        mutation.mutate({
            ...form,
            from_branch_id: +form.from_branch_id,
            to_branch_id: +form.to_branch_id,
            items: validItems.map(it => ({ product_id: +it.product_id, quantity: +it.quantity })),
        });
    };

    const inputStyle = { padding: '8px 10px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem', color: 'var(--text-1)', background: 'var(--surface)', width: '100%', outline: 'none' };

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box" style={{ maxWidth: 640, margin: '0 16px' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h2 style={{ fontWeight: 600, fontSize: '1rem' }}>New Transfer Order</h2>
                    <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '4px 10px' }}>✕</button>
                </div>

                <div style={{ padding: 24, overflowY: 'auto', maxHeight: 'calc(90vh - 140px)' }}>
                    {mutation.isError && (
                        <div className="alert-error">{mutation.error?.response?.data?.message ?? 'Failed to create transfer.'}</div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                        <div>
                            <label className="form-label">From Branch *</label>
                            <select className="field" value={form.from_branch_id} onChange={e => setField('from_branch_id', e.target.value)}>
                                <option value="">Select branch…</option>
                                {(branches ?? []).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">To Branch *</label>
                            <select className="field" value={form.to_branch_id} onChange={e => setField('to_branch_id', e.target.value)}>
                                <option value="">Select branch…</option>
                                {(branches ?? []).filter(b => String(b.id) !== String(form.from_branch_id)).map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Transfer Date *</label>
                            <input type="date" className="field" value={form.transfer_date} onChange={e => setField('transfer_date', e.target.value)} />
                        </div>
                        <div>
                            <label className="form-label">Notes</label>
                            <input type="text" className="field" placeholder="Optional…" value={form.notes} onChange={e => setField('notes', e.target.value)} />
                        </div>
                    </div>

                    <div style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                            <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>Items</p>
                            <button onClick={addItem} className="btn btn-ghost btn-sm">+ Add Item</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 32px', gap: 6, marginBottom: 6 }}>
                            {['Product', 'Qty', ''].map(h => (
                                <p key={h} style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</p>
                            ))}
                        </div>
                        {items.map((it, i) => (
                            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 32px', gap: 6, marginBottom: 6 }}>
                                <select style={inputStyle} value={it.product_id} onChange={e => setItem(i, 'product_id', e.target.value)}>
                                    <option value="">Select product…</option>
                                    {(products ?? []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                                <input type="number" min="0" style={inputStyle} placeholder="Qty" value={it.quantity} onChange={e => setItem(i, 'quantity', e.target.value)} />
                                <button onClick={() => removeItem(i)} style={{ background: 'var(--red-light)', border: 'none', borderRadius: 'var(--radius-sm)', color: 'var(--red)', cursor: 'pointer', fontWeight: 600 }}>×</button>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button onClick={onClose} className="btn btn-ghost">Cancel</button>
                    <button
                        onClick={submit}
                        disabled={mutation.isPending || !form.from_branch_id || !form.to_branch_id}
                        className="btn btn-primary"
                    >
                        {mutation.isPending ? 'Creating…' : 'Create Transfer'}
                    </button>
                </div>
            </div>
        </div>
    );
}
