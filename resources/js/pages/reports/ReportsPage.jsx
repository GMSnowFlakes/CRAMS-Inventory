import { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import client from '../../api/client';
import Layout from '../../components/Layout';
import { useCurrency } from '../../hooks/useCurrency';

const today      = new Date().toISOString().slice(0, 10);
const monthStart = today.slice(0, 8) + '01';

// ── helpers ──────────────────────────────────────────────────────────────────

// ── Tab bar ──────────────────────────────────────────────────────────────────

const TABS = [
    { id: 'overview',      label: 'Inventory' },
    { id: 'sales',         label: 'Sales' },
    { id: 'profit-loss',   label: 'Profit & Loss' },
    { id: 'top-customers', label: 'Top Customers' },
    { id: 'dead-stock',    label: 'Dead Stock' },
    { id: 'cash-flow',     label: 'Cash Flow' },
    { id: 'timeline',      label: 'Timeline' },
    { id: 'expenses',      label: 'Expenses' },
    { id: 'exports',       label: 'Exports' },
];

function TabBar({ active, onChange }) {
    return (
        <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border)', marginBottom: 28 }}>
            {TABS.map(t => (
                <button key={t.id} onClick={() => onChange(t.id)}
                    style={{ padding: '8px 16px', fontSize: '0.875rem', fontWeight: active === t.id ? 600 : 400, color: active === t.id ? 'var(--indigo)' : 'var(--text-2)', background: 'none', border: 'none', borderBottom: `2px solid ${active === t.id ? 'var(--indigo)' : 'transparent'}`, marginBottom: -1, cursor: 'pointer', transition: 'color .12s' }}>
                    {t.label}
                </button>
            ))}
        </div>
    );
}

// ── Overview ─────────────────────────────────────────────────────────────────

const MOVEMENT_COLORS = {
    stock_in:   { badge: 'badge-green',  accent: 'var(--green)' },
    stock_out:  { badge: 'badge-amber',  accent: 'var(--amber)' },
    adjustment: { badge: 'badge-indigo', accent: 'var(--indigo)' },
};

function OverviewTab({ from, to, setFrom, setTo }) {
    const { fmt } = useCurrency();
    const summary  = useQuery({ queryKey: ['inventory-summary'], queryFn: () => client.get('/reports/inventory-summary').then(r => r.data) });
    const movement = useQuery({ queryKey: ['movement-summary', from, to], queryFn: () => client.get('/reports/movement-summary', { params: { from, to } }).then(r => r.data), enabled: !!(from && to) });
    const top      = useQuery({ queryKey: ['top-products', from, to], queryFn: () => client.get('/reports/top-products', { params: { from, to } }).then(r => r.data), enabled: !!(from && to) });

    return (
        <>
            <section style={{ marginBottom: 32 }}>
                <h2 style={sectionTitle}>Inventory Summary</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                    {[
                        { label: 'Total Products', value: summary.data?.total_products, accent: 'indigo' },
                        { label: 'Total Units',    value: summary.data?.total_units?.toLocaleString(), accent: 'sky' },
                        { label: 'Stock Value',    value: fmt(summary.data?.total_value), accent: 'green' },
                        { label: 'Low / Out',      value: `${summary.data?.low_stock ?? 0} / ${summary.data?.out_of_stock ?? 0}`, accent: 'amber' },
                    ].map(({ label, value, accent }) => (
                        <div key={label} className={`stat-card ${accent}`}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginBottom: 8 }}>{label}</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-1)' }}>{value ?? '—'}</div>
                        </div>
                    ))}
                </div>
            </section>

            <section style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                    <h2 style={{ ...sectionTitle, margin: 0 }}>Movement Summary</h2>
                    <DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    {['stock_in', 'stock_out', 'adjustment'].map(type => {
                        const { badge, accent } = MOVEMENT_COLORS[type];
                        return (
                            <div key={type} className="card" style={{ padding: '16px 20px' }}>
                                <div style={{ marginBottom: 8 }}>
                                    <span className={`badge ${badge}`} style={{ textTransform: 'capitalize' }}>{type.replace('_', ' ')}</span>
                                </div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: accent }}>
                                    {movement.data?.[type]?.qty ?? 0}
                                    <span style={{ fontSize: '0.875rem', fontWeight: 400, color: 'var(--text-3)', marginLeft: 4 }}>units</span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 4 }}>
                                    {movement.data?.[type]?.count ?? 0} transactions
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            <section>
                <h2 style={sectionTitle}>Top Products (by outgoing)</h2>
                <div className="card" style={{ overflow: 'hidden' }}>
                    <table className="data-table">
                        <thead>
                            <tr><th>#</th><th>Product</th><th>SKU</th><th>Units Out</th></tr>
                        </thead>
                        <tbody>
                            {top.data?.map((row, i) => (
                                <tr key={row.product?.id}>
                                    <td style={{ color: 'var(--text-3)', fontWeight: 600, width: 40 }}>{i + 1}</td>
                                    <td style={{ fontWeight: 500 }}>{row.product?.name}</td>
                                    <td><code style={codePill}>{row.product?.sku}</code></td>
                                    <td style={{ fontWeight: 700, color: 'var(--amber)' }}>{row.total_out}</td>
                                </tr>
                            ))}
                            {!top.data?.length && <tr><td colSpan={4} style={emptyCell}>No data</td></tr>}
                        </tbody>
                    </table>
                </div>
            </section>
        </>
    );
}

// ── Dead Stock ────────────────────────────────────────────────────────────────

const DS_PRESETS = [
    { label: '30 days', value: 30 },
    { label: '60 days', value: 60 },
    { label: '90 days', value: 90 },
    { label: '180 days', value: 180 },
];

function DeadStockTab() {
    const { fmt } = useCurrency();
    const [days, setDays] = useState(60);
    const { data, isLoading } = useQuery({
        queryKey: ['dead-stock', days],
        queryFn: () => client.get('/reports/dead-stock', { params: { days } }).then(r => r.data),
    });

    const totalValue = useMemo(() => data?.reduce((s, r) => s + Number(r.total_value ?? 0), 0) ?? 0, [data]);

    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>No movement in:</span>
                {DS_PRESETS.map(p => (
                    <button key={p.value} onClick={() => setDays(p.value)}
                        style={{ padding: '5px 14px', borderRadius: 99, fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', background: days === p.value ? 'var(--indigo)' : 'var(--surface-2)', color: days === p.value ? '#fff' : 'var(--text-2)', border: 'none', transition: 'background .12s' }}>
                        {p.label}
                    </button>
                ))}
                {data?.length > 0 && (
                    <span style={{ marginLeft: 'auto', fontSize: '0.875rem', color: 'var(--text-2)' }}>
                        {data.length} item{data.length !== 1 ? 's' : ''} &nbsp;·&nbsp;
                        <strong style={{ color: 'var(--red)' }}>{fmt(totalValue)}</strong> tied up
                    </span>
                )}
            </div>

            {isLoading ? <Spinner /> : (
                data?.length === 0 ? (
                    <div style={{ ...emptyBox, color: 'var(--green)' }}>No dead stock found for this period.</div>
                ) : (
                    <div className="card" style={{ overflow: 'hidden' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Product</th><th>SKU</th><th>Category</th>
                                    <th style={{ textAlign: 'right' }}>Qty</th>
                                    <th style={{ textAlign: 'right' }}>Unit Cost</th>
                                    <th style={{ textAlign: 'right' }}>Total Value</th>
                                    <th style={{ textAlign: 'right' }}>Days Stale</th>
                                    <th>Last Movement</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map(r => (
                                    <tr key={r.id}>
                                        <td style={{ fontWeight: 500 }}>{r.name}</td>
                                        <td><code style={codePill}>{r.sku}</code></td>
                                        <td style={{ color: 'var(--text-2)' }}>{r.category ?? '—'}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{r.quantity}</td>
                                        <td style={{ textAlign: 'right', color: 'var(--text-2)' }}>{fmt(r.cost_price)}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--amber)' }}>{fmt(r.total_value)}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <span className="badge badge-red">{r.days_stale}d</span>
                                        </td>
                                        <td style={{ color: 'var(--text-3)', fontSize: '0.8125rem' }}>{r.last_movement_at ?? 'Never'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            )}
        </>
    );
}

// ── Cash Flow Impact ──────────────────────────────────────────────────────────

function CashFlowTab() {
    const { fmt } = useCurrency();
    const { data, isLoading } = useQuery({
        queryKey: ['cash-flow-impact'],
        queryFn: () => client.get('/reports/cash-flow-impact').then(r => r.data),
    });

    const metrics = data ? [
        { label: 'Total Inventory Value',    value: fmt(data.total_inventory_value), accent: 'indigo', desc: 'Full cost value of all stock' },
        { label: 'Liquid Stock Value',       value: fmt(data.liquid_value),          accent: 'green',  desc: 'Active products, recently moved' },
        { label: 'Dead Stock Value',         value: fmt(data.dead_stock_value),      accent: 'amber',  desc: `${data.dead_stock_count ?? 0} products with no recent movement` },
        { label: 'Reorder Cost (All)',       value: fmt(data.reorder_cost_total),    accent: 'sky',    desc: 'Estimated cost to restock all below-level products' },
        { label: 'Reorder Cost (Urgent)',    value: fmt(data.reorder_cost_urgent),   accent: 'sky',    desc: 'Critical & high urgency only' },
        { label: 'Out-of-Stock Revenue Risk', value: fmt(data.out_of_stock_revenue_at_risk), accent: 'red', desc: 'Potential lost revenue from zero-stock products' },
    ] : [];

    if (isLoading) return <Spinner />;

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {metrics.map(({ label, value, accent, desc }) => (
                <div key={label} className={`stat-card ${accent}`} style={{ padding: '20px 24px' }}>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-2)', marginBottom: 6 }}>{label}</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-0.02em' }}>{value}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 6 }}>{desc}</div>
                </div>
            ))}
        </div>
    );
}

// ── Inventory Timeline (SVG chart) ────────────────────────────────────────────

const TIMELINE_SERIES = [
    { key: 'stock_in',   color: 'var(--green)',  label: 'Stock In' },
    { key: 'stock_out',  color: 'var(--amber)',  label: 'Stock Out' },
    { key: 'adjustment', color: 'var(--indigo)', label: 'Adjustment' },
];

function TimelineChart({ data }) {
    if (!data?.length) return <div style={emptyBox}>No movement data for this period.</div>;

    const W = 820, H = 240, PAD_L = 50, PAD_R = 20, PAD_T = 16, PAD_B = 48;
    const plotW = W - PAD_L - PAD_R;
    const plotH = H - PAD_T - PAD_B;

    const maxVal = Math.max(1, ...data.flatMap(d => TIMELINE_SERIES.map(s => d[s.key] ?? 0)));
    const step   = data.length > 1 ? plotW / (data.length - 1) : plotW;

    function x(i)   { return PAD_L + (data.length > 1 ? i * step : plotW / 2); }
    function y(val) { return PAD_T + plotH - (val / maxVal) * plotH; }

    const ticks = 4;
    const yTicks = Array.from({ length: ticks + 1 }, (_, i) => Math.round((maxVal / ticks) * i));

    // X-axis: show max 8 labels
    const labelEvery = Math.ceil(data.length / 8);

    return (
        <div style={{ width: '100%', overflowX: 'auto' }}>
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 420, fontFamily: 'inherit' }}>
                {/* Grid lines */}
                {yTicks.map(v => (
                    <line key={v} x1={PAD_L} y1={y(v)} x2={W - PAD_R} y2={y(v)} stroke="var(--border)" strokeWidth="1" />
                ))}
                {yTicks.map(v => (
                    <text key={v} x={PAD_L - 6} y={y(v) + 4} textAnchor="end" fill="var(--text-3)" fontSize="10">{v}</text>
                ))}

                {/* Series lines */}
                {TIMELINE_SERIES.map(({ key, color }) => {
                    const pts = data.map((d, i) => `${x(i)},${y(d[key] ?? 0)}`).join(' ');
                    return (
                        <polyline key={key} points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                    );
                })}

                {/* Data dots */}
                {TIMELINE_SERIES.map(({ key, color }) =>
                    data.map((d, i) => (d[key] ?? 0) > 0 && (
                        <circle key={`${key}-${i}`} cx={x(i)} cy={y(d[key] ?? 0)} r="3" fill={color} />
                    ))
                )}

                {/* X labels */}
                {data.map((d, i) => i % labelEvery === 0 && (
                    <text key={i} x={x(i)} y={H - PAD_B + 16} textAnchor="middle" fill="var(--text-3)" fontSize="10">
                        {d.date?.slice(5)}
                    </text>
                ))}
            </svg>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 8 }}>
                {TIMELINE_SERIES.map(({ key, color, label }) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-2)' }}>
                        <span style={{ width: 12, height: 2, background: color, borderRadius: 99, display: 'inline-block' }} />
                        {label}
                    </div>
                ))}
            </div>
        </div>
    );
}

function TimelineTab({ from, to, setFrom, setTo }) {
    const { data, isLoading } = useQuery({
        queryKey: ['timeline', from, to],
        queryFn: () => client.get('/reports/timeline', { params: { from, to } }).then(r => r.data),
        enabled: !!(from && to),
    });

    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} />
            </div>
            <div className="card" style={{ padding: 20 }}>
                {isLoading ? <Spinner /> : <TimelineChart data={data} />}
            </div>
        </>
    );
}

// ── Expenses Report Tab ───────────────────────────────────────────────────────

function ExpensesReportTab({ from, to, setFrom, setTo }) {
    const { fmt } = useCurrency();

    const { data, isLoading } = useQuery({
        queryKey: ['expense-summary', from, to],
        queryFn: () => client.get('/reports/expense-summary', { params: { from, to } }).then(r => r.data),
        enabled: !!(from && to),
    });

    const PM_LABEL = { cash: 'Cash', card: 'Card', bank_transfer: 'Bank Transfer', gcash: 'GCash', other: 'Other' };

    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <span style={sectionTitle}>Expense Summary</span>
                <DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} />
            </div>

            {isLoading ? <Spinner /> : !data ? null : (
                <>
                    {/* Summary cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 28 }}>
                        <div className="card" style={{ padding: '16px 18px' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 4 }}>Total Expenses</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--red)' }}>{fmt(data.total)}</div>
                        </div>
                        <div className="card" style={{ padding: '16px 18px' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 4 }}>Records</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--indigo)' }}>{data.count}</div>
                        </div>
                    </div>

                    {/* By category */}
                    {data.by_category?.length > 0 && (
                        <div className="card" style={{ overflow: 'hidden', marginBottom: 20 }}>
                            <div style={{ ...sectionTitle, padding: '14px 16px 0' }}>By Category</div>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Category</th>
                                        <th style={{ textAlign: 'right' }}>Records</th>
                                        <th style={{ textAlign: 'right' }}>Amount</th>
                                        <th style={{ textAlign: 'right' }}>% of Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.by_category.map(r => (
                                        <tr key={r.category}>
                                            <td style={{ fontWeight: 600 }}>{r.category}</td>
                                            <td style={{ textAlign: 'right', color: 'var(--text-2)' }}>{r.count}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--red)' }}>{fmt(r.total)}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                                                    <div style={{ width: 60, height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                                                        <div style={{ width: `${r.pct}%`, height: '100%', background: 'var(--red)', borderRadius: 99 }} />
                                                    </div>
                                                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-2)', minWidth: 36, textAlign: 'right' }}>{r.pct}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* By payment method */}
                    {Object.keys(data.by_method ?? {}).length > 0 && (
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            {Object.entries(data.by_method).map(([method, total]) => (
                                <div key={method} className="card" style={{ padding: '12px 16px', minWidth: 140 }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{PM_LABEL[method] ?? method}</div>
                                    <div style={{ fontWeight: 700, color: 'var(--text-1)', marginTop: 4 }}>{fmt(total)}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {data.count === 0 && <div style={emptyBox}>No expenses recorded in this period.</div>}
                </>
            )}
        </>
    );
}

// ── Exports ───────────────────────────────────────────────────────────────────

function ExportsTab({ from, to, setFrom, setTo }) {
    const [busy, setBusy] = useState(null);

    const summary    = useQuery({ queryKey: ['inventory-summary'], queryFn: () => client.get('/reports/inventory-summary').then(r => r.data) });
    const valuation  = useQuery({ queryKey: ['stock-valuation'],   queryFn: () => client.get('/reports/stock-valuation').then(r => r.data) });
    const deadStock  = useQuery({ queryKey: ['dead-stock', 60],    queryFn: () => client.get('/reports/dead-stock', { params: { days: 60 } }).then(r => r.data) });
    const cashFlow   = useQuery({ queryKey: ['cash-flow-impact'],  queryFn: () => client.get('/reports/cash-flow-impact').then(r => r.data) });
    const reorder    = useQuery({ queryKey: ['reorder-suggestions'], queryFn: () => client.get('/reports/reorder-suggestions').then(r => r.data) });

    async function exportExcel() {
        setBusy('excel');
        try {
            const wb = XLSX.utils.book_new();

            // Sheet 1 — Stock Valuation
            if (valuation.data?.length) {
                const ws1 = XLSX.utils.json_to_sheet(valuation.data.map(r => ({
                    SKU:            r.product?.sku ?? '',
                    Product:        r.product?.name ?? '',
                    Category:       r.product?.category ?? '',
                    Quantity:       r.quantity,
                    'Cost Price':   r.product?.cost_price ?? 0,
                    'Selling Price': r.product?.selling_price ?? 0,
                    'Stock Value':  r.total_value ?? 0,
                })));
                XLSX.utils.book_append_sheet(wb, ws1, 'Stock Valuation');
            }

            // Sheet 2 — Dead Stock
            if (deadStock.data?.length) {
                const ws2 = XLSX.utils.json_to_sheet(deadStock.data.map(r => ({
                    SKU:            r.sku,
                    Product:        r.name,
                    Category:       r.category ?? '',
                    Quantity:       r.quantity,
                    'Cost Price':   r.cost_price,
                    'Total Value':  r.total_value,
                    'Days Stale':   r.days_stale,
                    'Last Movement': r.last_movement_at ?? 'Never',
                })));
                XLSX.utils.book_append_sheet(wb, ws2, 'Dead Stock');
            }

            // Sheet 3 — Reorder Suggestions
            if (reorder.data?.length) {
                const ws3 = XLSX.utils.json_to_sheet(reorder.data.map(r => ({
                    SKU:              r.sku,
                    Product:          r.name,
                    'Current Stock':  r.current_qty,
                    'Reorder Level':  r.reorder_level,
                    Urgency:          r.urgency,
                    'Suggested Qty':  r.suggested_qty,
                    'Est. Cost':      r.cost_estimate,
                })));
                XLSX.utils.book_append_sheet(wb, ws3, 'Reorder Suggestions');
            }

            // Sheet 4 — Cash Flow
            if (cashFlow.data) {
                const cf = cashFlow.data;
                const ws4 = XLSX.utils.json_to_sheet([
                    { Metric: 'Total Inventory Value',     Value: cf.total_inventory_value },
                    { Metric: 'Liquid Stock Value',        Value: cf.liquid_value },
                    { Metric: 'Dead Stock Value',          Value: cf.dead_stock_value },
                    { Metric: 'Dead Stock Count',          Value: cf.dead_stock_count },
                    { Metric: 'Reorder Cost (All)',        Value: cf.reorder_cost_total },
                    { Metric: 'Reorder Cost (Urgent)',     Value: cf.reorder_cost_urgent },
                    { Metric: 'Out-of-Stock Revenue Risk', Value: cf.out_of_stock_revenue_at_risk },
                ]);
                XLSX.utils.book_append_sheet(wb, ws4, 'Cash Flow Impact');
            }

            XLSX.writeFile(wb, `crams-inventory-report-${today}.xlsx`);
        } finally {
            setBusy(null);
        }
    }

    function exportPDF() {
        setBusy('pdf');
        window.print();
        setBusy(null);
    }

    async function downloadCsv(key, endpoint, params = {}) {
        setBusy(key);
        try {
            const token = localStorage.getItem('auth_token') ?? sessionStorage.getItem('auth_token') ?? '';
            const qs = new URLSearchParams(params).toString();
            const url = `/api${endpoint}${qs ? '?' + qs : ''}`;
            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'text/csv' } });
            const blob = await res.blob();
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = res.headers.get('content-disposition')?.match(/filename="(.+)"/)?.[1] ?? `${key}.csv`;
            a.click();
            URL.revokeObjectURL(a.href);
        } finally {
            setBusy(null);
        }
    }

    const ready = !summary.isLoading && !valuation.isLoading;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} />
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-3)' }}>used for sales & expense CSV exports</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                <ExportCard
                    title="Inventory CSV"
                    desc="All products with stock quantity, cost/selling price, and stock value."
                    icon={<CsvIcon />}
                    color="var(--indigo)"
                    btnLabel={busy === 'inv-csv' ? 'Downloading…' : 'Download CSV'}
                    disabled={busy === 'inv-csv'}
                    onClick={() => downloadCsv('inv-csv', '/reports/export/inventory')}
                />
                <ExportCard
                    title="Sales CSV"
                    desc="All invoices in the selected date range with payment status and balance."
                    icon={<CsvIcon />}
                    color="var(--sky)"
                    btnLabel={busy === 'sales-csv' ? 'Downloading…' : 'Download CSV'}
                    disabled={busy === 'sales-csv'}
                    onClick={() => downloadCsv('sales-csv', '/reports/export/sales', { from, to })}
                />
                <ExportCard
                    title="Expenses CSV"
                    desc="All expenses in the selected date range, categorised with payment method."
                    icon={<CsvIcon />}
                    color="var(--red)"
                    btnLabel={busy === 'exp-csv' ? 'Downloading…' : 'Download CSV'}
                    disabled={busy === 'exp-csv'}
                    onClick={() => downloadCsv('exp-csv', '/reports/export/expenses', { from, to })}
                />
                <ExportCard
                    title="Excel Report"
                    desc="Multi-sheet workbook: stock valuation, dead stock, reorder suggestions, and cash flow impact."
                    icon={<ExcelIcon />}
                    color="var(--green)"
                    btnLabel={busy === 'excel' ? 'Generating…' : 'Download .xlsx'}
                    disabled={!ready || busy === 'excel'}
                    onClick={exportExcel}
                />
                <ExportCard
                    title="PDF Report"
                    desc="Print-optimised summary of current inventory state. Opens your browser's print dialog."
                    icon={<PdfIcon />}
                    color="var(--amber)"
                    btnLabel={busy === 'pdf' ? 'Opening…' : 'Download PDF'}
                    disabled={busy === 'pdf'}
                    onClick={exportPDF}
                />
            </div>
        </div>
    );
}

function ExportCard({ title, desc, icon, color, btnLabel, disabled, onClick }) {
    return (
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
                {icon}
            </div>
            <div>
                <div style={{ fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>{title}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-3)', lineHeight: 1.5 }}>{desc}</div>
            </div>
            <button onClick={onClick} disabled={disabled}
                style={{ marginTop: 4, padding: '8px 16px', borderRadius: 8, border: `1.5px solid ${color}`, background: disabled ? 'var(--surface-2)' : `${color}10`, color: disabled ? 'var(--text-3)' : color, fontSize: '0.875rem', fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', transition: 'background .12s' }}>
                {btnLabel}
            </button>
        </div>
    );
}

function CsvIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="8" y1="13" x2="16" y2="13"/>
            <line x1="8" y1="17" x2="12" y2="17"/>
        </svg>
    );
}

function ExcelIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="8" y1="13" x2="16" y2="13"/>
            <line x1="8" y1="17" x2="16" y2="17"/>
            <line x1="10" y1="9" x2="14" y2="9"/>
        </svg>
    );
}

function PdfIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <path d="M9 13h6"/>
            <path d="M9 17h3"/>
        </svg>
    );
}

// ── Print CSS (injected once) ─────────────────────────────────────────────────

const PRINT_STYLE = `
@media print {
  body > * { display: none !important; }
  #print-report { display: block !important; }
}
#print-report { display: none; }
`;

// ── Shared utilities ──────────────────────────────────────────────────────────

const sectionTitle = { fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 };
const codePill     = { background: 'var(--surface-2)', padding: '2px 6px', borderRadius: 4, fontSize: '0.75rem', color: 'var(--text-2)' };
const emptyCell    = { textAlign: 'center', color: 'var(--text-3)', padding: '40px 16px' };
const emptyBox     = { padding: '32px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.875rem' };

function Spinner() {
    return (
        <div style={{ display: 'flex', gap: 6, padding: '20px 0' }}>
            {[0, 1, 2].map(i => <span key={i} className="loading-dot" style={{ animationDelay: `${i * 0.2}s` }} />)}
        </div>
    );
}

function DateRange({ from, to, setFrom, setTo }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="field" style={{ width: 'auto', padding: '5px 10px' }} />
            <span style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>→</span>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="field" style={{ width: 'auto', padding: '5px 10px' }} />
        </div>
    );
}

// ── Sales Summary Tab ─────────────────────────────────────────────────────────

function SalesTab({ from, to, setFrom, setTo }) {
    const { fmt } = useCurrency();

    const summary = useQuery({
        queryKey: ['sales-summary', from, to],
        queryFn: () => client.get('/reports/sales-summary', { params: { from, to } }).then(r => r.data),
        enabled: !!(from && to),
    });
    const byPeriod = useQuery({
        queryKey: ['sales-by-period', from, to],
        queryFn: () => client.get('/reports/sales-by-period', { params: { from, to } }).then(r => r.data),
        enabled: !!(from && to),
    });
    const topSelling = useQuery({
        queryKey: ['top-selling', from, to],
        queryFn: () => client.get('/reports/top-selling', { params: { from, to } }).then(r => r.data),
        enabled: !!(from && to),
    });

    const d = summary.data;

    const STAT_CARDS = d ? [
        { label: 'Total Revenue',    value: fmt(d.revenue),         accent: 'indigo', desc: 'Confirmed + paid invoices' },
        { label: 'Collected',        value: fmt(d.collected),       accent: 'green',  desc: 'Cash actually received' },
        { label: 'Outstanding',      value: fmt(d.outstanding),     accent: 'amber',  desc: 'Unpaid balance' },
        { label: 'Invoices',         value: d.invoice_count,        accent: 'sky',    desc: 'Confirmed invoices in period' },
        { label: 'Tax Collected',    value: fmt(d.tax_collected),   accent: 'violet', desc: '' },
        { label: 'Discounts Given',  value: fmt(d.discounts_given), accent: 'red',    desc: '' },
    ] : [];

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <span style={sectionTitle}>Sales Performance</span>
                <DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} />
            </div>

            {summary.isLoading ? <Spinner /> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 28 }}>
                    {STAT_CARDS.map(c => (
                        <div key={c.label} className="card" style={{ padding: '16px 18px' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 4 }}>{c.label}</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: `var(--${c.accent})` }}>{c.value}</div>
                            {c.desc && <div style={{ fontSize: '0.6875rem', color: 'var(--text-3)', marginTop: 2 }}>{c.desc}</div>}
                        </div>
                    ))}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Daily revenue table */}
                <div className="card" style={{ overflow: 'hidden' }}>
                    <div style={{ ...sectionTitle, padding: '14px 16px 0' }}>Daily Revenue</div>
                    {byPeriod.isLoading ? <Spinner /> : (
                        <table className="data-table">
                            <thead><tr><th>Date</th><th>Revenue</th><th>Collected</th><th>Invoices</th></tr></thead>
                            <tbody>
                                {(byPeriod.data ?? []).map(r => (
                                    <tr key={r.date}>
                                        <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{r.date}</td>
                                        <td style={{ fontWeight: 600 }}>{fmt(r.revenue)}</td>
                                        <td style={{ color: 'var(--green)' }}>{fmt(r.collected)}</td>
                                        <td style={{ color: 'var(--text-3)' }}>{r.invoices}</td>
                                    </tr>
                                ))}
                                {!(byPeriod.data?.length) && <tr><td colSpan={4} style={emptyCell}>No data</td></tr>}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Top selling products */}
                <div className="card" style={{ overflow: 'hidden' }}>
                    <div style={{ ...sectionTitle, padding: '14px 16px 0' }}>Top Selling Products</div>
                    {topSelling.isLoading ? <Spinner /> : (
                        <table className="data-table">
                            <thead><tr><th>Product</th><th>Qty Sold</th><th>Revenue</th></tr></thead>
                            <tbody>
                                {(topSelling.data ?? []).map((r, i) => (
                                    <tr key={i}>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{r.product?.name ?? '—'}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{r.product?.sku}</div>
                                        </td>
                                        <td>{r.qty_sold} <span style={{ color: 'var(--text-3)', fontSize: '0.75rem' }}>{r.product?.unit ?? ''}</span></td>
                                        <td style={{ fontWeight: 600 }}>{fmt(r.revenue)}</td>
                                    </tr>
                                ))}
                                {!(topSelling.data?.length) && <tr><td colSpan={3} style={emptyCell}>No data</td></tr>}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Profit & Loss Tab ─────────────────────────────────────────────────────────

function ProfitLossTab({ from, to, setFrom, setTo }) {
    const { fmt } = useCurrency();

    const { data, isLoading } = useQuery({
        queryKey: ['profit-loss', from, to],
        queryFn: () => client.get('/reports/profit-loss', { params: { from, to } }).then(r => r.data),
        enabled: !!(from && to),
    });

    const ROWS = data ? [
        { label: 'Revenue',          value: data.revenue,       color: 'var(--green)',  bold: false },
        { label: 'Cost of Goods Sold (COGS)', value: -data.cogs, color: 'var(--red)', bold: false },
        { label: 'Gross Profit',     value: data.gross_profit,  color: data.gross_profit >= 0 ? 'var(--green)' : 'var(--red)', bold: true },
        { label: 'Purchases Made',   value: -data.purchases,    color: 'var(--red)',    bold: false },
        { label: 'Net Position',     value: data.net_position,  color: data.net_position >= 0 ? 'var(--indigo)' : 'var(--red)', bold: true },
    ] : [];

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <span style={sectionTitle}>Profit & Loss</span>
                <DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} />
            </div>

            {isLoading ? <Spinner /> : data ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    {/* P&L statement */}
                    <div className="card" style={{ padding: '20px 24px' }}>
                        <div style={sectionTitle}>Statement</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {ROWS.map(r => (
                                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: r.bold ? 8 : 0, borderBottom: r.bold ? '1px solid var(--border)' : 'none', marginBottom: r.bold ? 4 : 0 }}>
                                    <span style={{ fontSize: '0.875rem', color: r.bold ? 'var(--text-1)' : 'var(--text-2)', fontWeight: r.bold ? 600 : 400 }}>{r.label}</span>
                                    <span style={{ fontWeight: r.bold ? 700 : 500, color: r.color }}>{r.value >= 0 ? '' : '−'}{fmt(Math.abs(r.value))}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Margin card */}
                    <div className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={sectionTitle}>Gross Margin</div>
                        <div style={{ fontSize: '3rem', fontWeight: 800, color: data.gross_margin >= 0 ? 'var(--green)' : 'var(--red)', lineHeight: 1 }}>
                            {data.gross_margin}%
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-3)' }}>
                            Gross profit as a percentage of revenue. Healthy range is typically 30–60% depending on industry.
                        </div>
                        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {[
                                { l: 'Revenue',      v: fmt(data.revenue),      c: 'var(--green)' },
                                { l: 'COGS',         v: fmt(data.cogs),         c: 'var(--red)' },
                                { l: 'Gross Profit', v: fmt(data.gross_profit), c: data.gross_profit >= 0 ? 'var(--indigo)' : 'var(--red)' },
                            ].map(r => (
                                <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                                    <span style={{ color: 'var(--text-2)' }}>{r.l}</span>
                                    <span style={{ fontWeight: 600, color: r.c }}>{r.v}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

// ── Top Customers Tab ─────────────────────────────────────────────────────────

function TopCustomersTab({ from, to, setFrom, setTo }) {
    const { fmt } = useCurrency();

    const { data, isLoading } = useQuery({
        queryKey: ['top-customers', from, to],
        queryFn: () => client.get('/reports/top-customers', { params: { from, to, limit: 20 } }).then(r => r.data),
        enabled: !!(from && to),
    });

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <span style={sectionTitle}>Top Customers by Revenue</span>
                <DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} />
            </div>

            {isLoading ? <Spinner /> : (
                <div className="card" style={{ overflow: 'hidden' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                {['#', 'Customer', 'Contact', 'Invoices', 'Revenue', 'Collected', 'Outstanding'].map(h => <th key={h}>{h}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {(data ?? []).map((r, i) => (
                                <tr key={i}>
                                    <td style={{ color: 'var(--text-3)', fontWeight: 600 }}>#{i + 1}</td>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{r.customer?.name ?? '—'}</div>
                                    </td>
                                    <td style={{ color: 'var(--text-3)', fontSize: '0.8125rem' }}>
                                        {r.customer?.email ?? r.customer?.phone ?? '—'}
                                    </td>
                                    <td>{r.invoice_count}</td>
                                    <td style={{ fontWeight: 700, color: 'var(--indigo)' }}>{fmt(r.revenue)}</td>
                                    <td style={{ color: 'var(--green)' }}>{fmt(r.collected)}</td>
                                    <td style={{ fontWeight: r.outstanding > 0 ? 600 : 400, color: r.outstanding > 0 ? 'var(--amber)' : 'var(--text-3)' }}>
                                        {fmt(r.outstanding)}
                                    </td>
                                </tr>
                            ))}
                            {!(data?.length) && <tr><td colSpan={7} style={emptyCell}>No customer sales in this period</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
    const [tab,  setTab]  = useState('overview');
    const [from, setFrom] = useState(monthStart);
    const [to,   setTo]   = useState(today);

    return (
        <Layout>
            <style>{PRINT_STYLE}</style>

            <div className="page-header" style={{ marginBottom: 20 }}>
                <h1 className="page-title">Reports</h1>
            </div>

            <TabBar active={tab} onChange={setTab} />

            {tab === 'overview'      && <OverviewTab from={from} to={to} setFrom={setFrom} setTo={setTo} />}
            {tab === 'sales'         && <SalesTab from={from} to={to} setFrom={setFrom} setTo={setTo} />}
            {tab === 'profit-loss'   && <ProfitLossTab from={from} to={to} setFrom={setFrom} setTo={setTo} />}
            {tab === 'top-customers' && <TopCustomersTab from={from} to={to} setFrom={setFrom} setTo={setTo} />}
            {tab === 'dead-stock'    && <DeadStockTab />}
            {tab === 'cash-flow'     && <CashFlowTab />}
            {tab === 'timeline'      && <TimelineTab from={from} to={to} setFrom={setFrom} setTo={setTo} />}
            {tab === 'expenses'      && <ExpensesReportTab from={from} to={to} setFrom={setFrom} setTo={setTo} />}
            {tab === 'exports'       && <ExportsTab from={from} to={to} setFrom={setFrom} setTo={setTo} />}
        </Layout>
    );
}
