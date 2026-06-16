import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import client from '../../api/client';

const STATUS_COLORS = {
    draft:     { background: 'var(--border)',  color: 'var(--text-2)' },
    pending:   { background: 'var(--amber)',   color: '#000' },
    approved:  { background: 'var(--indigo)',  color: '#fff' },
    received:  { background: 'var(--green)',   color: '#fff' },
    cancelled: { background: 'var(--red)',     color: '#fff' },
};

function StatusBadge({ status }) {
    const style = STATUS_COLORS[status] ?? { background: 'var(--border)', color: 'var(--text-2)' };
    return (
        <span style={{ ...style, padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>
            {status}
        </span>
    );
}

export default function SupplierPortalView() {
    const { token } = useParams();

    const { data, isLoading, isError } = useQuery({
        queryKey: ['supplier-portal-view', token],
        queryFn: () => client.get(`/supplier-portal/view/${token}`).then(r => r.data),
        retry: false,
    });

    return (
        <div style={{ minHeight: '100vh', background: 'var(--surface-2)', padding: '40px 24px', fontFamily: 'inherit' }}>
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 40 }}>
                    <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--indigo)', marginBottom: 4 }}>CRAMS</div>
                    <div style={{ fontSize: 14, color: 'var(--text-3)' }}>Supplier Portal — Read Only</div>
                </div>

                {isLoading && (
                    <div style={{ textAlign: 'center', color: 'var(--text-2)', padding: 40 }}>Loading portal…</div>
                )}

                {isError && (
                    <div style={{ textAlign: 'center', padding: 60 }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>Invalid or Expired Link</div>
                        <div style={{ color: 'var(--text-3)' }}>This portal link is no longer valid. Contact your account manager for a new link.</div>
                    </div>
                )}

                {data && (
                    <>
                        {/* Info card */}
                        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 32, display: 'flex', gap: 32 }}>
                            <div>
                                <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>SUPPLIER</div>
                                <div style={{ fontWeight: 700, fontSize: 20, color: 'var(--text-1)' }}>{data.supplier?.name}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>ACCESS</div>
                                <div style={{ fontWeight: 600, color: 'var(--text-2)' }}>{data.label}</div>
                            </div>
                            <div style={{ marginLeft: 'auto', alignSelf: 'center' }}>
                                <span style={{ background: 'var(--green)', color: '#fff', padding: '4px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>Read Only</span>
                            </div>
                        </div>

                        {/* Purchase Orders */}
                        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)', marginBottom: 16 }}>
                            Purchase Orders ({data.purchase_orders?.length ?? 0})
                        </h2>

                        {!data.purchase_orders?.length && (
                            <p style={{ color: 'var(--text-3)', textAlign: 'center', padding: 32 }}>No purchase orders on file.</p>
                        )}

                        {data.purchase_orders?.map(po => (
                            <div key={po.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 16, overflow: 'hidden' }}>
                                {/* PO header */}
                                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16 }}>
                                    <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-1)' }}>{po.po_number}</div>
                                    <StatusBadge status={po.status} />
                                    <div style={{ marginLeft: 'auto', color: 'var(--text-3)', fontSize: 13 }}>
                                        {new Date(po.created_at).toLocaleDateString()}
                                    </div>
                                </div>

                                {/* Items */}
                                {po.items?.length > 0 && (
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: 'var(--surface-2)' }}>
                                                {['Product', 'SKU', 'Qty', 'Unit Cost'].map(h => (
                                                    <th key={h} style={{ padding: '8px 16px', textAlign: 'left', fontSize: 12, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {po.items.map((item, i) => (
                                                <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                                                    <td style={{ padding: '10px 16px', color: 'var(--text-1)' }}>{item.product?.name ?? '—'}</td>
                                                    <td style={{ padding: '10px 16px', color: 'var(--text-3)', fontSize: 13 }}>{item.product?.sku ?? '—'}</td>
                                                    <td style={{ padding: '10px 16px', color: 'var(--text-2)' }}>{item.quantity}</td>
                                                    <td style={{ padding: '10px 16px', color: 'var(--text-2)' }}>
                                                        {typeof item.unit_cost === 'number' ? `$${Number(item.unit_cost).toFixed(2)}` : '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}

                                {/* PO totals */}
                                <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 24, fontSize: 14, color: 'var(--text-2)' }}>
                                    {po.subtotal != null && <span>Subtotal: <strong>${Number(po.subtotal).toFixed(2)}</strong></span>}
                                    {po.tax != null && <span>Tax: <strong>${Number(po.tax).toFixed(2)}</strong></span>}
                                    {po.total != null && <span style={{ color: 'var(--text-1)', fontWeight: 700 }}>Total: ${Number(po.total).toFixed(2)}</span>}
                                </div>
                            </div>
                        ))}
                    </>
                )}

                <div style={{ textAlign: 'center', marginTop: 48, color: 'var(--text-3)', fontSize: 12 }}>
                    Powered by CRAMS Inventory · Read-only access
                </div>
            </div>
        </div>
    );
}
