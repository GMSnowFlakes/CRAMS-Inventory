import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';

export default function StockCountDetail({ id, onClose }) {
    const qc = useQueryClient();
    const { addToast } = useToast();
    const [counts, setCounts] = useState({});

    const { data: sc, isLoading } = useQuery({
        queryKey: ['stock-count', id],
        queryFn: () => api.get(`/stock-counts/${id}`).then(r => r.data),
        onSuccess: (data) => {
            const initial = {};
            data.items?.forEach(item => {
                if (item.counted_qty !== null) initial[item.product_id] = item.counted_qty;
            });
            setCounts(initial);
        },
    });

    const saveMutation = useMutation({
        mutationFn: (items) => api.put(`/stock-counts/${id}/items`, { items }).then(r => r.data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['stock-count', id] }); addToast('Progress saved'); },
    });

    const commitMutation = useMutation({
        mutationFn: () => api.post(`/stock-counts/${id}/commit`).then(r => r.data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['stock-counts'] });
            qc.invalidateQueries({ queryKey: ['stock-count', id] });
            addToast('Stock count committed');
            onClose();
        },
    });

    if (isLoading) return (
        <div className="modal-overlay">
            <div className="modal-box" style={{ maxWidth: 400, padding: 40, textAlign: 'center' }}>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                    {[0,1,2].map(i => <span key={i} className="loading-dot" style={{ animationDelay: `${i * 0.2}s` }} />)}
                </div>
            </div>
        </div>
    );

    const isOpen = sc?.status === 'open';

    const saveAll = () => {
        const items = Object.entries(counts).map(([product_id, counted_qty]) => ({
            product_id: +product_id,
            counted_qty: +counted_qty,
        }));
        saveMutation.mutate(items);
    };

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box" style={{ maxWidth: 740, margin: '0 16px' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <code style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem', color: 'var(--indigo)' }}>{sc?.reference}</code>
                        <span className={`badge ${sc?.status === 'committed' ? 'badge-green' : 'badge-amber'}`} style={{ textTransform: 'capitalize' }}>{sc?.status}</span>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}>
                        <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
                    </button>
                </div>

                {/* Items table */}
                <div style={{ padding: '16px 24px 0', overflowX: 'auto' }}>
                    <table className="data-table" style={{ marginTop: 0 }}>
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>SKU</th>
                                <th style={{ textAlign: 'right' }}>System Qty</th>
                                <th style={{ textAlign: 'right' }}>Counted</th>
                                <th style={{ textAlign: 'right' }}>Variance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sc?.items?.map(item => {
                                const counted  = counts[item.product_id] !== undefined ? parseFloat(counts[item.product_id]) : null;
                                const variance = counted !== null ? counted - parseFloat(item.system_qty) : null;
                                const varColor = variance === null ? 'var(--text-3)' : variance > 0 ? 'var(--green)' : variance < 0 ? 'var(--red)' : 'var(--text-3)';
                                return (
                                    <tr key={item.id} style={variance !== null && variance !== 0 ? { background: 'var(--red-light)' } : {}}>
                                        <td style={{ fontWeight: 500 }}>{item.product?.name}</td>
                                        <td><code style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-3)' }}>{item.product?.sku}</code></td>
                                        <td style={{ textAlign: 'right' }}>{item.system_qty}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            {isOpen ? (
                                                <input
                                                    type="number" min="0" step="0.001"
                                                    className="field" style={{ width: 80, padding: '4px 8px', textAlign: 'right' }}
                                                    value={counts[item.product_id] ?? ''}
                                                    onChange={e => setCounts(c => ({ ...c, [item.product_id]: e.target.value }))}
                                                />
                                            ) : (item.counted_qty ?? '—')}
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 600, color: varColor }}>
                                            {variance !== null ? (variance > 0 ? '+' : '') + variance.toFixed(3) : '—'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {(saveMutation.error || commitMutation.error) && (
                    <div style={{ padding: '12px 24px 0' }}>
                        <div className="alert-error">{(saveMutation.error ?? commitMutation.error)?.response?.data?.message ?? 'Error'}</div>
                    </div>
                )}

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '20px 24px' }}>
                    <button onClick={onClose} className="btn btn-ghost">Close</button>
                    {isOpen && (
                        <>
                            <button onClick={saveAll} disabled={saveMutation.isPending} className="btn btn-primary" style={{ background: 'var(--indigo)' }}>
                                {saveMutation.isPending ? 'Saving…' : 'Save Progress'}
                            </button>
                            <button
                                onClick={() => { if (confirm('Commit this count? This will adjust stock to match counted quantities.')) commitMutation.mutate(); }}
                                disabled={commitMutation.isPending}
                                className="btn btn-primary"
                                style={{ background: 'var(--green)' }}
                            >
                                {commitMutation.isPending ? 'Committing…' : 'Commit Count'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
