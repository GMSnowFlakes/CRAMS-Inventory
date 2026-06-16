import { useQuery } from '@tanstack/react-query';
import client from '../../api/client';
import Layout from '../../components/Layout';

const riskColor = {
    critical: { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
    warning:  { bg: '#fffbeb', color: '#d97706', border: '#fcd34d' },
    stable:   { bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
};

function RiskBadge({ level }) {
    const c = riskColor[level] ?? riskColor.stable;
    return (
        <span style={{
            display: 'inline-block',
            padding: '2px 10px',
            borderRadius: '999px',
            fontSize: '0.72rem',
            fontWeight: 600,
            textTransform: 'capitalize',
            background: c.bg,
            color: c.color,
            border: `1px solid ${c.border}`,
        }}>
            {level}
        </span>
    );
}

export default function ForecastingPage() {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['forecasting'],
        queryFn: () => client.get('/forecasting').then(r => r.data),
    });

    const summary = data?.summary ?? { critical: 0, warning: 0, stable: 0 };
    const products = data?.products ?? [];

    const summaryCards = [
        { label: 'Critical (<7 days)', key: 'critical', color: '#dc2626', bg: '#fef2f2' },
        { label: 'Warning (7–14 days)', key: 'warning', color: '#d97706', bg: '#fffbeb' },
        { label: 'Stable (>14 days)', key: 'stable', color: '#16a34a', bg: '#f0fdf4' },
    ];

    return (
        <Layout>
            <div style={{ padding: '24px 28px', maxWidth: 1100 }}>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>
                    Stock Forecasting
                </h1>
                <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginBottom: 24 }}>
                    Restock predictions based on 30-day sales velocity
                </p>

                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
                    {summaryCards.map(c => (
                        <div key={c.key} style={{
                            background: c.bg,
                            border: `1px solid var(--border)`,
                            borderRadius: 10,
                            padding: '18px 20px',
                        }}>
                            <div style={{ fontSize: '2rem', fontWeight: 700, color: c.color }}>
                                {summary[c.key]}
                            </div>
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-2)', marginTop: 2 }}>{c.label}</div>
                        </div>
                    ))}
                </div>

                {/* Table */}
                <div style={{
                    background: 'var(--surface-1)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    overflow: 'hidden',
                }}>
                    {isLoading && (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-2)' }}>Loading forecasts…</div>
                    )}
                    {isError && (
                        <div style={{ padding: 40, textAlign: 'center', color: '#dc2626' }}>Failed to load data.</div>
                    )}
                    {!isLoading && !isError && (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                            <thead>
                                <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                                    {['Product', 'Current Stock', 'Avg Daily Usage', 'Days Remaining', 'Restock Date', 'Suggested Order', 'Risk'].map(h => (
                                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-2)', fontSize: '0.8rem' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {products.length === 0 && (
                                    <tr>
                                        <td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'var(--text-2)' }}>No products found.</td>
                                    </tr>
                                )}
                                {products.map((p, i) => (
                                    <tr key={p.id} style={{ borderBottom: i < products.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                        <td style={{ padding: '10px 14px' }}>
                                            <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>{p.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>{p.sku}</div>
                                        </td>
                                        <td style={{ padding: '10px 14px', color: 'var(--text-1)' }}>{p.current_stock}</td>
                                        <td style={{ padding: '10px 14px', color: 'var(--text-2)' }}>{p.avg_daily_usage} / day</td>
                                        <td style={{ padding: '10px 14px', color: 'var(--text-1)' }}>
                                            {p.days_remaining !== null ? `${p.days_remaining} days` : '—'}
                                        </td>
                                        <td style={{ padding: '10px 14px', color: 'var(--text-1)' }}>
                                            {p.restock_date ?? '—'}
                                        </td>
                                        <td style={{ padding: '10px 14px', color: 'var(--text-1)' }}>
                                            {p.suggested_order_qty !== null ? p.suggested_order_qty : '—'}
                                        </td>
                                        <td style={{ padding: '10px 14px' }}>
                                            <RiskBadge level={p.risk_level} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </Layout>
    );
}
