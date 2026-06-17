import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import client from '../../api/client';
import { useKitConfig } from '../../hooks/useKitConfig';

export default function ProductForm({ product, onClose, onSaved }) {
    const qc = useQueryClient();
    const { productCategories, units, suggestedReorder } = useKitConfig();

    const [form, setForm] = useState({
        name: product?.name ?? '',
        sku: product?.sku ?? '',
        category: product?.category ?? '',
        unit: product?.unit ?? 'pcs',
        cost_price: product?.cost_price ?? '',
        selling_price: product?.selling_price ?? '',
        reorder_level: product?.reorder_level ?? suggestedReorder,
        supplier_id: product?.supplier_id ?? '',
        is_active: product?.is_active ?? true,
    });
    const [error, setError] = useState('');

    const { data: suppliers } = useQuery({
        queryKey: ['suppliers-list'],
        queryFn: () => client.get('/suppliers', { params: { is_active: true } }).then(r => r.data.data),
    });

    const save = useMutation({
        mutationFn: (payload) => product
            ? client.put(`/products/${product.id}`, payload)
            : client.post('/products', payload),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); onSaved?.(); onClose(); },
        onError: (err) => setError(err.response?.data?.message ?? 'Something went wrong.'),
    });

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    return (
        <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box" style={{ maxWidth: 520, margin: '0 16px' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0' }}>
                    <h2 style={{ fontSize: '1.0625rem', fontWeight: 600, color: 'var(--text-1)' }}>
                        {product ? 'Edit Product' : 'New Product'}
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}>
                        <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '20px 24px 0' }}>
                    {error && <div className="alert-error">{error}</div>}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label">Name *</label>
                            <input className="field" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Product name" />
                        </div>
                        <div>
                            <label className="form-label">SKU</label>
                            <input className="field" value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="Auto-generated" />
                        </div>
                        <div>
                            <label className="form-label">Category</label>
                            <input
                                list="product-cat-list"
                                className="field"
                                value={form.category}
                                onChange={e => set('category', e.target.value)}
                                placeholder="Select or type…"
                            />
                            <datalist id="product-cat-list">
                                {productCategories.map(c => <option key={c} value={c} />)}
                            </datalist>
                        </div>
                        <div>
                            <label className="form-label">Unit</label>
                            <input
                                list="product-unit-list"
                                className="field"
                                value={form.unit}
                                onChange={e => set('unit', e.target.value)}
                                placeholder="pcs"
                            />
                            <datalist id="product-unit-list">
                                {units.map(u => <option key={u} value={u} />)}
                            </datalist>
                        </div>
                        <div>
                            <label className="form-label">Reorder Level</label>
                            <input type="number" min="0" className="field" value={form.reorder_level} onChange={e => set('reorder_level', e.target.value)} />
                        </div>
                        <div>
                            <label className="form-label">Cost Price</label>
                            <input type="number" min="0" step="0.01" className="field" value={form.cost_price} onChange={e => set('cost_price', e.target.value)} />
                        </div>
                        <div>
                            <label className="form-label">Selling Price</label>
                            <input type="number" min="0" step="0.01" className="field" value={form.selling_price} onChange={e => set('selling_price', e.target.value)} />
                        </div>
                        <div>
                            <label className="form-label">Supplier</label>
                            <select className="field" value={form.supplier_id} onChange={e => set('supplier_id', e.target.value)}>
                                <option value="">None</option>
                                {suppliers?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 18 }}>
                            <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => set('is_active', e.target.checked)}
                                style={{ width: 16, height: 16, accentColor: 'var(--indigo)', cursor: 'pointer' }} />
                            <label htmlFor="is_active" className="form-label" style={{ marginBottom: 0, cursor: 'pointer' }}>Active</label>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '20px 24px' }}>
                    <button onClick={onClose} className="btn btn-ghost">Cancel</button>
                    <button onClick={() => save.mutate(form)} disabled={save.isPending} className="btn btn-primary">
                        {save.isPending ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
}
