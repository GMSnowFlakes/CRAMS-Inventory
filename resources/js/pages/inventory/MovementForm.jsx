import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import client from '../../api/client';
import { useToast } from '../../context/ToastContext';

const ENDPOINTS = { stock_in: '/inventory/stock-in', stock_out: '/inventory/stock-out', adjustment: '/inventory/adjustments' };
const TITLES    = { stock_in: 'Stock In', stock_out: 'Stock Out', adjustment: 'Adjustment' };

const TOAST_MSG = { stock_in: 'Stock in recorded', stock_out: 'Stock out recorded', adjustment: 'Adjustment saved' };

export default function MovementForm({ type, onClose }) {
    const qc = useQueryClient();
    const { addToast } = useToast();
    const [form, setForm] = useState({ product_id: '', quantity: '', reference: '', notes: '', unit_cost: '' });
    const [error, setError] = useState('');

    const { data: products } = useQuery({
        queryKey: ['products-list'],
        queryFn: () => client.get('/products', { params: { is_active: true } }).then(r => r.data.data),
    });

    const save = useMutation({
        mutationFn: (payload) => client.post(ENDPOINTS[type], payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['stock-levels'] });
            qc.invalidateQueries({ queryKey: ['movements'] });
            qc.invalidateQueries({ queryKey: ['inventory-summary'] });
            addToast(TOAST_MSG[type]);
            onClose();
        },
        onError: (err) => setError(err.response?.data?.message ?? 'Something went wrong.'),
    });

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    return (
        <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box" style={{ maxWidth: 440, margin: '0 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0' }}>
                    <h2 style={{ fontSize: '1.0625rem', fontWeight: 600, color: 'var(--text-1)' }}>{TITLES[type]}</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}>
                        <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
                    </button>
                </div>
                <div style={{ padding: '20px 24px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {error && <div className="alert-error">{error}</div>}
                    <div>
                        <label className="form-label">Product *</label>
                        <select className="field" value={form.product_id} onChange={e => set('product_id', e.target.value)}>
                            <option value="">Select product</option>
                            {products?.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="form-label">{type === 'adjustment' ? 'New Quantity *' : 'Quantity *'}</label>
                        <input type="number" min="0" className="field" value={form.quantity} onChange={e => set('quantity', e.target.value)} />
                    </div>
                    {type === 'stock_in' && (
                        <div>
                            <label className="form-label">Unit Cost</label>
                            <input type="number" min="0" step="0.01" className="field" value={form.unit_cost} onChange={e => set('unit_cost', e.target.value)} />
                        </div>
                    )}
                    <div>
                        <label className="form-label">Reference</label>
                        <input className="field" value={form.reference} onChange={e => set('reference', e.target.value)} />
                    </div>
                    <div>
                        <label className="form-label">Notes</label>
                        <textarea className="field" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} style={{ resize: 'vertical' }} />
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '20px 24px' }}>
                    <button onClick={onClose} className="btn btn-ghost">Cancel</button>
                    <button onClick={() => save.mutate(form)} disabled={save.isPending} className="btn btn-primary">
                        {save.isPending ? 'Saving…' : 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );
}
