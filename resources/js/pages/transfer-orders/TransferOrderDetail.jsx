import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';

const STATUS_BADGE = {
    draft:      'badge-gray',
    dispatched: 'badge-sky',
    received:   'badge-green',
    cancelled:  'badge-red',
};

export default function TransferOrderDetail({ id, onClose }) {
    const qc = useQueryClient();
    const { addToast } = useToast();

    const { data: to, isLoading } = useQuery({
        queryKey: ['transfer-order', id],
        queryFn: () => api.get(`/transfer-orders/${id}`).then(r => r.data),
    });

    const dispatchMutation = useMutation({
        mutationFn: () => api.post(`/transfer-orders/${id}/dispatch`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['transfer-order', id] }); qc.invalidateQueries({ queryKey: ['transfer-orders'] }); addToast('Transfer dispatched', 'info'); },
    });

    const receiveMutation = useMutation({
        mutationFn: () => api.post(`/transfer-orders/${id}/receive`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['transfer-order', id] }); qc.invalidateQueries({ queryKey: ['transfer-orders'] }); addToast('Transfer received'); },
    });

    return (
        <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box" style={{ maxWidth: 640, margin: '0 16px' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h2 style={{ fontWeight: 600, fontSize: '1rem' }}>
                            {isLoading ? '…' : to?.transfer_number}
                        </h2>
                        {to && (
                            <span className={`badge ${STATUS_BADGE[to.status] ?? 'badge-gray'}`} style={{ textTransform: 'capitalize', marginTop: 4 }}>
                                {to.status}
                            </span>
                        )}
                    </div>
                    <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '4px 10px' }}>✕</button>
                </div>

                {isLoading ? (
                    <div style={{ display: 'flex', gap: 6, padding: 32, justifyContent: 'center' }}>
                        {[0,1,2].map(i => <span key={i} className="loading-dot" style={{ animationDelay: `${i * 0.2}s` }} />)}
                    </div>
                ) : (
                    <div style={{ padding: 24, overflowY: 'auto', maxHeight: 'calc(90vh - 140px)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                            <div>
                                <p className="form-label">From Branch</p>
                                <p style={{ fontWeight: 500 }}>{to?.from_branch?.name ?? '—'}</p>
                            </div>
                            <div>
                                <p className="form-label">To Branch</p>
                                <p style={{ fontWeight: 500 }}>{to?.to_branch?.name ?? '—'}</p>
                            </div>
                            <div>
                                <p className="form-label">Transfer Date</p>
                                <p style={{ color: 'var(--text-2)' }}>{to?.transfer_date}</p>
                            </div>
                            <div>
                                <p className="form-label">Received Date</p>
                                <p style={{ color: 'var(--text-2)' }}>{to?.received_date ?? '—'}</p>
                            </div>
                            {to?.notes && (
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <p className="form-label">Notes</p>
                                    <p style={{ color: 'var(--text-2)' }}>{to.notes}</p>
                                </div>
                            )}
                        </div>

                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th style={{ textAlign: 'right' }}>Requested</th>
                                    <th style={{ textAlign: 'right' }}>Sent</th>
                                    <th style={{ textAlign: 'right' }}>Received</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(to?.items ?? []).map(item => (
                                    <tr key={item.id}>
                                        <td style={{ fontWeight: 500 }}>{item.product?.name ?? `#${item.product_id}`}</td>
                                        <td style={{ textAlign: 'right', color: 'var(--text-2)' }}>{item.quantity_requested}</td>
                                        <td style={{ textAlign: 'right', color: 'var(--text-2)' }}>{item.quantity_sent}</td>
                                        <td style={{ textAlign: 'right', color: 'var(--text-2)' }}>{item.quantity_received}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button onClick={onClose} className="btn btn-ghost">Close</button>
                    {to?.status === 'draft' && (
                        <button
                            onClick={() => dispatchMutation.mutate()}
                            disabled={dispatchMutation.isPending}
                            className="btn btn-primary"
                            style={{ background: 'var(--violet)', boxShadow: 'none' }}
                        >
                            {dispatchMutation.isPending ? 'Dispatching…' : 'Dispatch Transfer'}
                        </button>
                    )}
                    {to?.status === 'dispatched' && (
                        <button
                            onClick={() => receiveMutation.mutate()}
                            disabled={receiveMutation.isPending}
                            className="btn btn-primary"
                            style={{ background: 'var(--green)', boxShadow: 'none' }}
                        >
                            {receiveMutation.isPending ? 'Confirming…' : 'Confirm Receipt'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
