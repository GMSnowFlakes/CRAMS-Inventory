import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import client from '../api/client';
import Layout from '../components/Layout';
import { useCurrency } from '../hooks/useCurrency';

// ── Color map ─────────────────────────────────────────────────────────────────

const COLOR = {
    red:    { css: 'var(--red)',    light: 'var(--red-light)' },
    amber:  { css: 'var(--amber)', light: 'var(--amber-light)' },
    green:  { css: 'var(--green)', light: 'var(--green-light)' },
    sky:    { css: 'var(--sky)',   light: 'var(--sky-light)' },
    violet: { css: 'var(--violet)',light: 'var(--violet-light)' },
    indigo: { css: 'var(--indigo)',light: 'var(--indigo-light)' },
};

// ── Health Ring ───────────────────────────────────────────────────────────────

function HealthRing({ data }) {
    const [expanded, setExpanded] = useState(false);
    if (!data) return null;

    const { score, grade, breakdown, total_penalty } = data;
    const r    = 54;
    const circ = 2 * Math.PI * r;
    const c    = COLOR[grade.color] ?? COLOR.sky;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ position: 'relative', width: 140, height: 140 }}>
                <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="70" cy="70" r={r} fill="none" stroke="var(--border)" strokeWidth="10" />
                    <circle
                        cx="70" cy="70" r={r} fill="none"
                        stroke={c.css}
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={`${circ * score / 100} ${circ}`}
                        style={{ transition: 'stroke-dasharray .8s cubic-bezier(0.16,1,0.3,1)' }}
                    />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '2rem', fontWeight: 700, color: c.css, lineHeight: 1 }}>{score}</span>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-3)', marginTop: 2 }}>/ 100</span>
                </div>
            </div>

            <span style={{ padding: '3px 10px', borderRadius: 99, background: c.light, color: c.css, fontSize: '0.75rem', fontWeight: 600 }}>
                {grade.label}
            </span>

            <button
                onClick={() => setExpanded(v => !v)}
                style={{ fontSize: '0.75rem', color: 'var(--indigo)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' }}
            >
                {expanded ? '▲ Hide breakdown' : '▼ Score breakdown'}
            </button>

            {expanded && (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-3)', padding: '0 4px' }}>
                        <span>Base score: 100</span>
                        <span>Total penalty: -{total_penalty}pts</span>
                    </div>
                    {breakdown.map(f => {
                        const fc = COLOR[f.color] ?? COLOR.amber;
                        return (
                            <div key={f.label} style={{ padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 8, borderLeft: `3px solid ${fc.css}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-1)' }}>{f.label}</span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: fc.css }}>
                                        {f.penalty > 0 ? `-${f.penalty}pts` : '0pts'}
                                    </span>
                                </div>
                                <div style={{ height: 4, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${(f.penalty / f.max_penalty) * 100}%`, background: fc.css, borderRadius: 99, transition: 'width .5s' }} />
                                </div>
                                <div style={{ fontSize: '0.6875rem', color: 'var(--text-3)', marginTop: 4 }}>{f.description}</div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ── Insights Engine ───────────────────────────────────────────────────────────

const INSIGHT_STYLE = {
    critical: { border: 'var(--red)',    bg: 'var(--red-light)',    icon: '⚠' },
    warning:  { border: 'var(--amber)',  bg: 'var(--amber-light)',  icon: '↓' },
    info:     { border: 'var(--sky)',    bg: 'var(--sky-light)',    icon: 'i' },
    success:  { border: 'var(--green)',  bg: 'var(--green-light)',  icon: '✓' },
};

function InsightsEngine({ items }) {
    if (!items?.length) return null;

    return (
        <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-1)', marginBottom: 12 }}>Insights Engine</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map((ins, i) => {
                    const s = INSIGHT_STYLE[ins.type] ?? INSIGHT_STYLE.info;
                    return (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', background: s.bg, borderRadius: 'var(--radius-sm)', borderLeft: `3px solid ${s.border}` }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: s.border, width: 18, textAlign: 'center', flexShrink: 0, marginTop: 1 }}>{s.icon}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-1)' }}>{ins.title}</span>
                                    <span style={{ fontSize: '0.6875rem', fontWeight: 500, padding: '1px 7px', borderRadius: 99, background: s.border + '20', color: s.border }}>{ins.category}</span>
                                </div>
                                <p style={{ fontSize: '0.8125rem', color: 'var(--text-2)', marginTop: 3 }}>{ins.detail}</p>
                            </div>
                            {ins.metric && (
                                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: s.border, whiteSpace: 'nowrap', flexShrink: 0 }}>{ins.metric}</span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── Reorder Table ─────────────────────────────────────────────────────────────

const URGENCY = {
    critical: { label: 'Out of Stock', cls: 'badge-red' },
    high:     { label: '< 7 days',     cls: 'badge-red' },
    medium:   { label: '< 14 days',    cls: 'badge-amber' },
    low:      { label: 'Below level',  cls: 'badge-gray' },
};

function ReorderTable({ items }) {
    const { fmt } = useCurrency();
    if (!items?.length) {
        return <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', padding: '20px 0' }}>No reorder suggestions — all products are well stocked.</p>;
    }

    return (
        <div className="card" style={{ overflow: 'hidden' }}>
            <table className="data-table">
                <thead>
                    <tr>
                        <th>Product</th><th>SKU</th>
                        <th style={{ textAlign: 'right' }}>In Stock</th>
                        <th style={{ textAlign: 'right' }}>Avg / Day</th>
                        <th style={{ textAlign: 'right' }}>Days Left</th>
                        <th>Urgency</th>
                        <th style={{ textAlign: 'right' }}>Suggested Order</th>
                        <th style={{ textAlign: 'right' }}>Est. Cost</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map(r => {
                        const urg = URGENCY[r.urgency] ?? URGENCY.low;
                        return (
                            <tr key={r.id}>
                                <td style={{ fontWeight: 500 }}>{r.name}</td>
                                <td><code style={{ background: 'var(--surface-2)', padding: '2px 6px', borderRadius: 4, fontSize: '0.75rem', color: 'var(--text-2)' }}>{r.sku}</code></td>
                                <td style={{ textAlign: 'right', fontWeight: 600, color: r.current_qty === 0 ? 'var(--red)' : r.urgency === 'high' ? 'var(--amber)' : 'var(--text-1)' }}>{r.current_qty}</td>
                                <td style={{ textAlign: 'right', color: 'var(--text-2)' }}>{r.avg_daily_out > 0 ? r.avg_daily_out : '—'}</td>
                                <td style={{ textAlign: 'right', color: 'var(--text-2)' }}>{r.days_remaining == null ? '—' : r.days_remaining === 0 ? 'Now' : `${r.days_remaining}d`}</td>
                                <td><span className={`badge ${urg.cls}`}>{urg.label}</span></td>
                                <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--indigo)' }}>{r.suggested_qty}</td>
                                <td style={{ textAlign: 'right', color: 'var(--text-2)' }}>{fmt(r.cost_estimate)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

// ── Stat Cards ────────────────────────────────────────────────────────────────

const STAT_CARDS = [
    {
        key: 'total_products', label: 'Total Products', accent: 'indigo',
        format: v => v?.toLocaleString() ?? '—',
        icon: <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20"><path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm3 2h6v4H7V5zm-2 8h10v2H5v-2zm0-4h2v2H5V9zm4 0h2v2H9V9zm4 0h2v2h-2V9z"/></svg>,
    },
    {
        key: 'total_units', label: 'Total Units', accent: 'sky',
        format: v => v?.toLocaleString() ?? '—',
        icon: <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20"><path d="M3 3a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 13.846 4.632 16 6.414 16H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 5H6.28l-.31-1.243A1 1 0 005 3H3z"/></svg>,
    },
    {
        key: 'total_value', label: 'Stock Value', accent: 'green',
        format: null,
        icon: <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/></svg>,
    },
    {
        key: 'low_stock', label: 'Low Stock', accent: 'amber',
        format: v => v ?? '—',
        subKey: 'out_of_stock', subLabel: v => `${v ?? 0} out of stock`,
        icon: <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>,
    },
];

const ACCENT_MAP = {
    indigo: { bg: 'var(--indigo-light)', color: 'var(--indigo)' },
    sky:    { bg: 'var(--sky-light)',    color: 'var(--sky)' },
    green:  { bg: 'var(--green-light)',  color: 'var(--green)' },
    amber:  { bg: 'var(--amber-light)',  color: 'var(--amber)' },
};

// ── Sales widgets ─────────────────────────────────────────────────────────────

const STATUS_COLOR = {
    paid:      'var(--green)',
    partial:   'var(--amber)',
    confirmed: 'var(--sky)',
    draft:     'var(--text-3)',
    cancelled: 'var(--red)',
};

function Trend({ current, previous }) {
    if (!previous || previous === 0) return null;
    const pct = ((current - previous) / previous) * 100;
    if (Math.abs(pct) < 0.5) return null;
    const up = pct > 0;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 6, fontSize: '0.75rem', fontWeight: 600, color: up ? 'var(--green)' : 'var(--red)' }}>
            <span>{up ? '↑' : '↓'}</span>
            <span>{Math.abs(pct).toFixed(1)}% vs last month</span>
        </div>
    );
}

function SalesMtdCards({ data, prev, fmt }) {
    if (!data) return null;
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
            {[
                { label: 'Revenue (MTD)',  val: fmt(data.revenue),       accent: 'green',  cur: data.revenue,       prv: prev?.revenue },
                { label: 'Collected',      val: fmt(data.collected),     accent: 'sky',    cur: data.collected,     prv: prev?.collected },
                { label: 'Outstanding',    val: fmt(data.outstanding),   accent: 'amber',  cur: data.outstanding,   prv: prev?.outstanding },
                { label: 'Invoices',       val: data.invoice_count ?? 0, accent: 'indigo', cur: data.invoice_count, prv: prev?.invoice_count },
            ].map(({ label, val, accent, cur, prv }) => (
                <div key={label} className={`stat-card ${accent}`}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-2)', fontWeight: 500 }}>{label}</span>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-1)', marginTop: 8 }}>{val}</div>
                    <Trend current={cur} previous={prv} />
                </div>
            ))}
        </div>
    );
}

function ExpensesMtdCards({ data, prev, fmt }) {
    if (!data) return null;
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
            {[
                { label: 'Total Expenses (MTD)', val: fmt(data.total),         accent: 'red',    cur: data.total,         prv: prev?.total },
                { label: 'No. of Expenses',       val: data.count ?? 0,         accent: 'violet', cur: data.count,         prv: prev?.count },
                { label: 'Avg per Expense',        val: fmt(data.average ?? 0), accent: 'amber',  cur: data.average,       prv: prev?.average },
            ].map(({ label, val, accent, cur, prv }) => (
                <div key={label} className={`stat-card ${accent}`}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-2)', fontWeight: 500 }}>{label}</span>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-1)', marginTop: 8 }}>{val}</div>
                    <Trend current={cur} previous={prv} />
                </div>
            ))}
        </div>
    );
}

function RecentSalesTable({ data }) {
    const { fmt } = useCurrency();
    if (!data?.data?.length) return null;
    return (
        <div className="card" style={{ overflow: 'hidden', marginBottom: 32 }}>
            <div style={{ padding: '14px 20px 10px', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-1)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Recent Sales</span>
                <a href="/sales" style={{ fontSize: '0.8rem', color: 'var(--indigo)', textDecoration: 'none' }}>View all →</a>
            </div>
            <table className="data-table">
                <thead>
                    <tr>
                        <th>Invoice</th><th>Customer</th><th>Date</th>
                        <th style={{ textAlign: 'right' }}>Total</th><th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {data.data.slice(0, 8).map(s => (
                        <tr key={s.id}>
                            <td><code style={{ fontSize: '0.75rem', color: 'var(--indigo)' }}>{s.invoice_number}</code></td>
                            <td style={{ color: 'var(--text-2)' }}>{s.customer?.name ?? 'Walk-in'}</td>
                            <td style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>{s.sale_date}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(s.total)}</td>
                            <td>
                                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: STATUS_COLOR[s.status] ?? 'var(--text-2)', textTransform: 'capitalize' }}>
                                    {s.status}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function monthKey(y, m) {
    return `${y}-${String(m + 1).padStart(2, '0')}`;
}

export default function Dashboard() {
    const { fmt } = useCurrency();

    const today = new Date();
    const [selectedMonth, setSelectedMonth] = useState(monthKey(today.getFullYear(), today.getMonth()));

    const [selYear, selMon] = selectedMonth.split('-').map(Number);
    const from = `${selectedMonth}-01`;
    const to   = new Date(selYear, selMon, 0).toISOString().slice(0, 10);

    // Previous month for trend comparison
    const prevDate  = new Date(selYear, selMon - 1, 1);
    const prevFrom  = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-01`;
    const prevTo    = new Date(selYear, selMon - 1, 0).toISOString().slice(0, 10);

    const summary = useQuery({
        queryKey: ['inventory-summary'],
        queryFn: () => client.get('/reports/inventory-summary').then(r => r.data),
    });

    const health = useQuery({
        queryKey: ['health-breakdown'],
        queryFn: () => client.get('/reports/health-breakdown').then(r => r.data),
    });

    const insights = useQuery({
        queryKey: ['insights'],
        queryFn: () => client.get('/reports/insights').then(r => r.data),
    });

    const reorder = useQuery({
        queryKey: ['reorder-suggestions'],
        queryFn: () => client.get('/reports/reorder-suggestions').then(r => r.data),
    });

    const salesMtd = useQuery({
        queryKey: ['sales-mtd', from, to],
        queryFn: () => client.get('/reports/sales-summary', { params: { from, to } }).then(r => r.data),
    });

    const salesPrev = useQuery({
        queryKey: ['sales-prev', prevFrom, prevTo],
        queryFn: () => client.get('/reports/sales-summary', { params: { from: prevFrom, to: prevTo } }).then(r => r.data),
    });

    const expMtd = useQuery({
        queryKey: ['exp-mtd', from, to],
        queryFn: () => client.get('/reports/expense-summary', { params: { from, to } }).then(r => r.data),
    });

    const expPrev = useQuery({
        queryKey: ['exp-prev', prevFrom, prevTo],
        queryFn: () => client.get('/reports/expense-summary', { params: { from: prevFrom, to: prevTo } }).then(r => r.data),
    });

    const recentSales = useQuery({
        queryKey: ['sales-recent'],
        queryFn: () => client.get('/sales', { params: { per_page: 8 } }).then(r => r.data),
    });

    const overdue = useQuery({
        queryKey: ['overdue-sales'],
        queryFn: () => client.get('/reports/overdue-sales').then(r => r.data),
    });

    const lowStock = useQuery({
        queryKey: ['low-stock'],
        queryFn: () => client.get('/reports/low-stock').then(r => r.data),
    });

    const activeRecalls = useQuery({
        queryKey: ['recalls-active-count'],
        queryFn: () => client.get('/recalls/active-count').then(r => r.data),
        staleTime: 10_000,
        refetchInterval: 10_000,
    });

    const complianceAlerts = useQuery({
        queryKey: ['compliance-alerts-count'],
        queryFn: () => client.get('/compliance/alerts').then(r => r.data),
        staleTime: 10_000,
        refetchInterval: 10_000,
    });

    const pendingApprovals = useQuery({
        queryKey: ['approvals-count'],
        queryFn: () => client.get('/approvals').then(r => r.data),
        staleTime: 10_000,
        refetchInterval: 10_000,
    });

    const loading = summary.isLoading;

    return (
        <Layout>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', marginTop: 2 }}>Inventory overview</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ fontSize: '0.8125rem', color: 'var(--text-3)', fontWeight: 500 }}>Period</label>
                    <input
                        type="month"
                        className="field"
                        style={{ width: 155 }}
                        value={selectedMonth}
                        max={monthKey(today.getFullYear(), today.getMonth())}
                        onChange={e => setSelectedMonth(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', gap: 6, padding: 24 }}>
                    {[0, 1, 2].map(i => <span key={i} className="loading-dot" style={{ animationDelay: `${i * 0.2}s` }} />)}
                </div>
            ) : (
                <>
                    {/* ── Sales MTD widgets ── */}
                    {!salesMtd.isLoading && salesMtd.data && (
                        <div style={{ marginBottom: 4 }}>
                            <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-1)', marginBottom: 12 }}>
                                Sales — {new Date(selYear, selMon - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </h2>
                            <SalesMtdCards data={salesMtd.data} prev={salesPrev.data} fmt={fmt} />
                        </div>
                    )}

                    {/* ── Expenses MTD widgets ── */}
                    {!expMtd.isLoading && expMtd.data && (
                        <div style={{ marginBottom: 4 }}>
                            <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-1)', marginBottom: 12 }}>
                                Expenses — {new Date(selYear, selMon - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </h2>
                            <ExpensesMtdCards data={expMtd.data} prev={expPrev.data} fmt={fmt} />
                        </div>
                    )}

                    {/* ── Overdue alert ── */}
                    {overdue.data?.count > 0 && (
                        <a href="/sales?status=overdue" style={{ textDecoration: 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', background: 'var(--red-light)', borderRadius: 10, border: '1.5px solid var(--red)', marginBottom: 20, cursor: 'pointer' }}>
                                <span style={{ fontSize: '1.1rem' }}>⚠</span>
                                <div style={{ flex: 1 }}>
                                    <span style={{ fontWeight: 700, color: 'var(--red)' }}>{overdue.data.count} overdue invoice{overdue.data.count !== 1 ? 's' : ''}</span>
                                    <span style={{ color: 'var(--red)', fontSize: '0.875rem' }}> · {fmt(overdue.data.total_outstanding)} outstanding balance</span>
                                </div>
                                <span style={{ fontSize: '0.8125rem', color: 'var(--red)', fontWeight: 600 }}>View →</span>
                            </div>
                        </a>
                    )}

                    {/* ── Low-stock alert ── */}
                    {lowStock.data?.count > 0 && (
                        <a href="/inventory" style={{ textDecoration: 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', background: 'var(--amber-light, #fffbeb)', borderRadius: 10, border: '1.5px solid var(--amber, #f59e0b)', marginBottom: 20, cursor: 'pointer' }}>
                                <span style={{ fontSize: '1.1rem' }}>📉</span>
                                <div style={{ flex: 1 }}>
                                    <span style={{ fontWeight: 700, color: 'var(--amber, #b45309)' }}>{lowStock.data.count} product{lowStock.data.count !== 1 ? 's' : ''} at or below reorder level</span>
                                    <span style={{ color: 'var(--text-3)', fontSize: '0.8125rem' }}> · {lowStock.data.items?.[0]?.name}{lowStock.data.count > 1 ? ` and ${lowStock.data.count - 1} more` : ''}</span>
                                </div>
                                <span style={{ fontSize: '0.8125rem', color: 'var(--amber, #b45309)', fontWeight: 600 }}>View Inventory →</span>
                            </div>
                        </a>
                    )}

                    {/* ── Stage 3/4 Alert Badges ── */}
                    {(() => {
                        const recallCount   = activeRecalls.data?.count ?? 0;
                        const expiringCount = Array.isArray(complianceAlerts.data) ? complianceAlerts.data.length : 0;
                        const pendingCount  = Array.isArray(pendingApprovals.data?.data)
                            ? pendingApprovals.data.data.filter(a => a.status === 'pending').length
                            : 0;
                        const pills = [
                            recallCount   > 0 && { to: '/recalls',    color: 'var(--red)',    bg: 'var(--red-light)',    icon: '⚠', label: `${recallCount} Active Recall${recallCount !== 1 ? 's' : ''}` },
                            expiringCount > 0 && { to: '/compliance', color: 'var(--amber)',  bg: 'var(--amber-light)',  icon: '📋', label: `${expiringCount} Expiring Soon` },
                            pendingCount  > 0 && { to: '/approvals',  color: 'var(--indigo)', bg: 'var(--indigo-light)', icon: '✅', label: `${pendingCount} Pending Approval${pendingCount !== 1 ? 's' : ''}` },
                        ].filter(Boolean);
                        if (!pills.length) return null;
                        return (
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
                                {pills.map(({ to, color, bg, icon, label }) => (
                                    <Link key={to} to={to} style={{ textDecoration: 'none' }}>
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: 8,
                                            padding: '8px 14px', borderRadius: 99,
                                            background: bg, border: `1.5px solid ${color}`,
                                            cursor: 'pointer', transition: 'opacity .12s',
                                        }}
                                            onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                                            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                                        >
                                            <span style={{ fontSize: '0.875rem' }}>{icon}</span>
                                            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color }}>{label}</span>
                                            <span style={{ fontSize: '0.75rem', color, opacity: 0.8, marginLeft: 2 }}>View →</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        );
                    })()}

                    {/* ── Recent Sales ── */}
                    {!recentSales.isLoading && <RecentSalesTable data={recentSales.data} />}

                    {/* ── Stat cards + Health Score ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) auto', gap: 16, marginBottom: 32, alignItems: 'start' }}>
                        {STAT_CARDS.map(({ key, label, accent, format, subKey, subLabel, icon }) => {
                            const ac = ACCENT_MAP[accent];
                            return (
                                <div key={key} className={`stat-card ${accent}`}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-2)', fontWeight: 500 }}>{label}</span>
                                        <div style={{ width: 36, height: 36, borderRadius: 10, background: ac.bg, color: ac.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {icon}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                                        {format ? format(summary.data?.[key]) : fmt(summary.data?.[key])}
                                    </div>
                                    {subKey && (
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 6 }}>
                                            {subLabel(summary.data?.[subKey])}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Health Score + Breakdown */}
                        <div className="stat-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 200 }}>
                            <p style={{ fontSize: '0.8125rem', color: 'var(--text-2)', fontWeight: 500, marginBottom: 8 }}>Inventory Health</p>
                            <HealthRing data={health.data} />
                        </div>
                    </div>

                    {/* ── Insights Engine ── */}
                    <InsightsEngine items={insights.data} />

                    {/* ── Quick actions ── */}
                    <div style={{ marginBottom: 32 }}>
                        <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-1)', marginBottom: 12 }}>Quick actions</h2>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            {[
                                { href: '/inventory',       label: 'Add Stock',          accent: 'var(--indigo)' },
                                { href: '/purchase-orders', label: 'New Purchase Order', accent: 'var(--sky)' },
                                { href: '/transfer-orders', label: 'New Transfer',       accent: 'var(--violet)' },
                                { href: '/stock-counts',    label: 'New Stock Count',    accent: 'var(--green)' },
                                { href: '/reports',         label: 'View Reports',       accent: 'var(--amber)' },
                            ].map(({ href, label, accent }) => (
                                <a key={href} href={href} style={{ padding: '8px 16px', borderRadius: 8, fontSize: '0.875rem', fontWeight: 500, color: accent, background: 'var(--surface)', border: `1.5px solid ${accent}30`, textDecoration: 'none', transition: 'background .12s' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = `${accent}10`; e.currentTarget.style.borderColor = accent; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = `${accent}30`; }}>
                                    {label}
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* ── Reorder Suggestions ── */}
                    <div id="reorder">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <div>
                                <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-1)' }}>Smart Reorder Suggestions</h2>
                                <p style={{ fontSize: '0.8125rem', color: 'var(--text-3)', marginTop: 2 }}>Products below reorder level or running out within 14 days, ranked by urgency.</p>
                            </div>
                            {reorder.data?.length > 0 && (
                                <span className="badge badge-red">{reorder.data.length} item{reorder.data.length > 1 ? 's' : ''}</span>
                            )}
                        </div>
                        {reorder.isLoading ? (
                            <div style={{ display: 'flex', gap: 6, padding: 12 }}>
                                {[0, 1, 2].map(i => <span key={i} className="loading-dot" style={{ animationDelay: `${i * 0.2}s` }} />)}
                            </div>
                        ) : (
                            <ReorderTable items={reorder.data} />
                        )}
                    </div>
                </>
            )}
        </Layout>
    );
}
