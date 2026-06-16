import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import client from '../../api/client';
import Layout from '../../components/Layout';
import { useCurrency } from '../../hooks/useCurrency';

export default function SimulatorPage() {
    const { fmt } = useCurrency();
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState('');
    const [orderQty, setOrderQty] = useState('');
    const [result, setResult] = useState(null);

    const { data: products = [], isLoading: productsLoading } = useQuery({
        queryKey: ['simulator-products'],
        queryFn: () => client.get('/simulator/products').then(r => r.data),
    });

    const filtered = useMemo(() => {
        if (!search) return products;
        const q = search.toLowerCase();
        return products.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
    }, [products, search]);

    const mutation = useMutation({
        mutationFn: ({ product_id, order_qty }) =>
            client.post('/simulator/run', { product_id, order_qty }).then(r => r.data),
        onSuccess: data => setResult(data),
    });

    const selectedProduct = products.find(p => p.id === parseInt(selectedId));

    function handleRun() {
        if (!selectedId || !orderQty) return;
        mutation.mutate({ product_id: parseInt(selectedId), order_qty: parseInt(orderQty) });
    }

    // Timeline bar calculations
    const timelinePct = result ? Math.min(100, (result.current_stock / result.new_stock) * 100) : 0;

    return (
        <Layout>
            <div style={{ padding: '24px 28px', maxWidth: 1050 }}>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>
                    Order Simulator
                </h1>
                <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginBottom: 28 }}>
                    Simulate a purchase order and see projected stock coverage and revenue potential
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20 }}>
                    {/* Left panel */}
                    <div style={{
                        background: 'var(--surface-1)',
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16,
                        alignSelf: 'start',
                    }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
                                Search Product
                            </label>
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search by name or SKU…"
                                style={{
                                    width: '100%',
                                    padding: '8px 10px',
                                    border: '1px solid var(--border)',
                                    borderRadius: 7,
                                    fontSize: '0.875rem',
                                    background: 'var(--surface-2)',
                                    color: 'var(--text-1)',
                                    boxSizing: 'border-box',
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
                                Select Product
                            </label>
                            <select
                                value={selectedId}
                                onChange={e => { setSelectedId(e.target.value); setResult(null); }}
                                style={{
                                    width: '100%',
                                    padding: '8px 10px',
                                    border: '1px solid var(--border)',
                                    borderRadius: 7,
                                    fontSize: '0.875rem',
                                    background: 'var(--surface-2)',
                                    color: 'var(--text-1)',
                                    boxSizing: 'border-box',
                                }}
                            >
                                <option value="">— choose a product —</option>
                                {productsLoading && <option disabled>Loading…</option>}
                                {filtered.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} ({p.sku}) — Stock: {p.current_stock}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedProduct && (
                            <div style={{
                                background: 'var(--surface-2)',
                                borderRadius: 8,
                                padding: '10px 12px',
                                fontSize: '0.8rem',
                                color: 'var(--text-2)',
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: 6,
                            }}>
                                <span>Current stock:</span><strong style={{ color: 'var(--text-1)' }}>{selectedProduct.current_stock}</strong>
                                <span>Cost price:</span><strong style={{ color: 'var(--text-1)' }}>{fmt(selectedProduct.cost_price)}</strong>
                                <span>Selling price:</span><strong style={{ color: 'var(--text-1)' }}>{fmt(selectedProduct.selling_price)}</strong>
                            </div>
                        )}

                        <div>
                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
                                Order Quantity
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={orderQty}
                                onChange={e => { setOrderQty(e.target.value); setResult(null); }}
                                placeholder="e.g. 100"
                                style={{
                                    width: '100%',
                                    padding: '8px 10px',
                                    border: '1px solid var(--border)',
                                    borderRadius: 7,
                                    fontSize: '0.875rem',
                                    background: 'var(--surface-2)',
                                    color: 'var(--text-1)',
                                    boxSizing: 'border-box',
                                }}
                            />
                        </div>

                        <button
                            onClick={handleRun}
                            disabled={!selectedId || !orderQty || mutation.isPending}
                            style={{
                                background: 'var(--indigo)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 8,
                                padding: '10px 0',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                cursor: selectedId && orderQty ? 'pointer' : 'not-allowed',
                                opacity: selectedId && orderQty ? 1 : 0.5,
                                transition: 'opacity 0.15s',
                            }}
                        >
                            {mutation.isPending ? 'Running…' : 'Run Simulation'}
                        </button>

                        {mutation.isError && (
                            <div style={{ color: '#dc2626', fontSize: '0.82rem' }}>Simulation failed. Please try again.</div>
                        )}
                    </div>

                    {/* Right panel */}
                    <div>
                        {!result && !mutation.isPending && (
                            <div style={{
                                background: 'var(--surface-1)',
                                border: '1px dashed var(--border)',
                                borderRadius: 10,
                                padding: 60,
                                textAlign: 'center',
                                color: 'var(--text-2)',
                            }}>
                                Select a product and enter an order quantity, then click "Run Simulation" to see the projection.
                            </div>
                        )}

                        {mutation.isPending && (
                            <div style={{
                                background: 'var(--surface-1)',
                                border: '1px solid var(--border)',
                                borderRadius: 10,
                                padding: 60,
                                textAlign: 'center',
                                color: 'var(--text-2)',
                            }}>
                                Calculating…
                            </div>
                        )}

                        {result && (
                            <div style={{
                                background: 'var(--surface-1)',
                                border: '1px solid var(--border)',
                                borderRadius: 10,
                                padding: '22px 24px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 20,
                            }}>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-1)' }}>{result.product.name}</div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>{result.product.sku}</div>
                                </div>

                                {/* Metrics grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                                    {[
                                        { label: 'Current Stock', value: result.current_stock, unit: 'units' },
                                        { label: `+ Order (${result.order_qty})`, value: result.new_stock, unit: 'new total', highlight: true },
                                        { label: 'Avg Daily Usage', value: result.avg_daily_usage, unit: 'units/day' },
                                        { label: 'Days Covered', value: result.days_covered !== null ? result.days_covered : '—', unit: result.days_covered ? 'days' : '' },
                                        { label: 'Total Cost', value: fmt(result.total_cost), unit: '', isCurrency: true },
                                        { label: 'Revenue Potential', value: fmt(result.revenue_potential), unit: '', isCurrency: true, positive: true },
                                    ].map((m, i) => (
                                        <div key={i} style={{
                                            background: 'var(--surface-2)',
                                            borderRadius: 8,
                                            padding: '12px 14px',
                                            border: m.highlight ? '2px solid var(--indigo)' : '1px solid var(--border)',
                                        }}>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-2)', marginBottom: 4 }}>{m.label}</div>
                                            <div style={{
                                                fontSize: '1.25rem',
                                                fontWeight: 700,
                                                color: m.positive ? '#16a34a' : m.highlight ? 'var(--indigo)' : 'var(--text-1)',
                                            }}>
                                                {m.value}
                                            </div>
                                            {m.unit && <div style={{ fontSize: '0.72rem', color: 'var(--text-2)' }}>{m.unit}</div>}
                                        </div>
                                    ))}
                                </div>

                                {/* Stockout date */}
                                {result.projected_stockout_date && (
                                    <div style={{
                                        background: '#fffbeb',
                                        border: '1px solid #fcd34d',
                                        borderRadius: 8,
                                        padding: '10px 14px',
                                        fontSize: '0.875rem',
                                        color: '#92400e',
                                    }}>
                                        <strong>Projected stockout date:</strong> {result.projected_stockout_date}
                                    </div>
                                )}

                                {/* Timeline bar */}
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginBottom: 8, fontWeight: 600 }}>
                                        Stock Timeline
                                    </div>
                                    <div style={{ position: 'relative', height: 28, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                                        {/* Current stock portion */}
                                        <div style={{
                                            position: 'absolute',
                                            left: 0,
                                            top: 0,
                                            height: '100%',
                                            width: `${timelinePct}%`,
                                            background: 'var(--indigo)',
                                            transition: 'width 0.5s ease',
                                        }} />
                                        {/* Order addition */}
                                        <div style={{
                                            position: 'absolute',
                                            left: `${timelinePct}%`,
                                            top: 0,
                                            height: '100%',
                                            width: `${100 - timelinePct}%`,
                                            background: '#86efac',
                                        }} />
                                        <div style={{
                                            position: 'absolute',
                                            inset: 0,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '0 10px',
                                            fontSize: '0.72rem',
                                            fontWeight: 600,
                                            color: '#fff',
                                            mixBlendMode: 'difference',
                                        }}>
                                            <span>Now: {result.current_stock}</span>
                                            <span>After order: {result.new_stock}</span>
                                            {result.projected_stockout_date && <span>Empty: {result.projected_stockout_date}</span>}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-2)' }}>
                                            <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--indigo)' }} /> Current stock
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-2)' }}>
                                            <div style={{ width: 10, height: 10, borderRadius: 2, background: '#86efac' }} /> Order addition
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}
