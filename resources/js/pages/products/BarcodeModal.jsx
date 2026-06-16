import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client';
import { useToast } from '../../context/ToastContext';

export default function BarcodeModal({ product, onClose }) {
    const qc = useQueryClient();
    const { addToast } = useToast();
    const [lookupCode, setLookupCode] = useState('');
    const [lookupResult, setLookupResult] = useState(null);
    const [lookupError, setLookupError] = useState('');

    const printLabels = (barcode, name, sku, qty = 1) => {
        const rows = Array.from({ length: qty }, () => `
            <div style="border:1px solid #ccc;display:inline-block;padding:8px 12px;margin:4px;text-align:center;width:180px;font-family:monospace;">
                <div style="font-size:11px;font-weight:700;margin-bottom:4px">${name}</div>
                <div style="font-size:10px;color:#555;margin-bottom:4px">${sku}</div>
                <div style="font-size:18px;font-weight:700;letter-spacing:2px">${barcode}</div>
            </div>`).join('');
        const w = window.open('', '_blank', 'width=640,height=500');
        w.document.write(`<!DOCTYPE html><html><head><title>Labels</title></head><body>
            <div style="padding:16px">${rows}</div>
            <script>window.onload=()=>window.print()<\/script>
        </body></html>`);
        w.document.close();
    };

    const assign = useMutation({
        mutationFn: () => client.post(`/barcode/assign/${product.id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['products'] });
            addToast('Barcode assigned');
            onClose();
        },
    });

    const lookup = async () => {
        setLookupResult(null);
        setLookupError('');
        try {
            const r = await client.get('/barcode/lookup', { params: { barcode: lookupCode } });
            setLookupResult(r.data.data ?? r.data);
        } catch {
            setLookupError('Barcode not found.');
        }
    };

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box" style={{ maxWidth: 480, padding: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <h2 style={{ fontWeight: 600, fontSize: '1rem' }}>Barcode — {product.name}</h2>
                    <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '4px 10px' }}>✕</button>
                </div>

                <div style={{ marginBottom: 24 }}>
                    {product.barcode ? (
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '0.8125rem', color: 'var(--text-2)', marginBottom: 8 }}>Assigned barcode</p>
                            <code style={{
                                display: 'block',
                                background: 'var(--indigo-light)',
                                color: 'var(--indigo)',
                                padding: '12px 16px',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '1.25rem',
                                fontWeight: 600,
                                letterSpacing: '0.1em',
                                textAlign: 'center',
                            }}>
                                {product.barcode}
                            </code>
                            <button
                                onClick={() => printLabels(product.barcode, product.name, product.sku)}
                                className="btn btn-ghost btn-sm"
                                style={{ marginTop: 10 }}
                            >
                                🖨 Print Label
                            </button>
                        </div>
                    ) : (
                        <div>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', marginBottom: 16 }}>
                                No barcode assigned yet. Generate an EAN-13 barcode for this product.
                            </p>
                            {assign.isError && (
                                <p className="alert-error">Failed to generate barcode.</p>
                            )}
                            <button
                                onClick={() => assign.mutate()}
                                disabled={assign.isPending}
                                className="btn btn-primary"
                                style={{ width: '100%' }}
                            >
                                {assign.isPending ? 'Generating…' : 'Generate Barcode'}
                            </button>
                        </div>
                    )}
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                    <p className="form-label" style={{ marginBottom: 8 }}>Lookup product by barcode</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <input
                            type="text"
                            className="field"
                            placeholder="Enter 13-digit barcode…"
                            value={lookupCode}
                            onChange={e => setLookupCode(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && lookupCode && lookup()}
                        />
                        <button
                            onClick={lookup}
                            disabled={!lookupCode}
                            className="btn btn-ghost"
                        >Search</button>
                    </div>
                    {lookupError && (
                        <p style={{ fontSize: '0.8125rem', color: 'var(--red)', marginTop: 8 }}>{lookupError}</p>
                    )}
                    {lookupResult && (
                        <div style={{
                            marginTop: 12,
                            padding: '12px 14px',
                            background: 'var(--green-light)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.875rem',
                        }}>
                            <p style={{ fontWeight: 600, color: '#065f46' }}>{lookupResult.name}</p>
                            <p style={{ color: '#065f46', marginTop: 2 }}>
                                SKU: {lookupResult.sku} &nbsp;·&nbsp; Stock: {lookupResult.stock_level?.quantity ?? 0}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
