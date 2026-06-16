import { useQuery } from '@tanstack/react-query';
import client from '../../api/client';
import Layout from '../../components/Layout';

const gradeStyle = {
    A: { bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
    B: { bg: 'color-mix(in srgb, var(--indigo) 10%, white)', color: 'var(--indigo)', border: 'color-mix(in srgb, var(--indigo) 30%, white)' },
    C: { bg: '#fffbeb', color: '#d97706', border: '#fcd34d' },
    D: { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
};

function GradeBadge({ grade }) {
    const s = gradeStyle[grade] ?? gradeStyle.D;
    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: '50%',
            fontWeight: 700,
            fontSize: '0.9rem',
            background: s.bg,
            color: s.color,
            border: `1px solid ${s.border}`,
        }}>
            {grade}
        </span>
    );
}

export default function DnaScorePage() {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['dna-scores'],
        queryFn: () => client.get('/dna-scores').then(r => r.data),
    });

    const dist = data?.grade_distribution ?? { A: 0, B: 0, C: 0, D: 0 };
    const products = data?.products ?? [];

    const distCards = [
        { grade: 'A', label: 'Excellent', color: '#16a34a', bg: '#f0fdf4' },
        { grade: 'B', label: 'Good',      color: 'var(--indigo)', bg: 'color-mix(in srgb, var(--indigo) 10%, white)' },
        { grade: 'C', label: 'Average',   color: '#d97706', bg: '#fffbeb' },
        { grade: 'D', label: 'Poor',      color: '#dc2626', bg: '#fef2f2' },
    ];

    return (
        <Layout>
            <div style={{ padding: '24px 28px', maxWidth: 1100 }}>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>
                    DNA Score
                </h1>
                <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginBottom: 24 }}>
                    Per-product performance score based on velocity, turnover, margin, availability and reorder compliance
                </p>

                {/* Grade distribution */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
                    {distCards.map(c => (
                        <div key={c.grade} style={{
                            background: c.bg,
                            border: '1px solid var(--border)',
                            borderRadius: 10,
                            padding: '16px 18px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 14,
                        }}>
                            <div style={{
                                width: 44,
                                height: 44,
                                borderRadius: '50%',
                                background: c.color,
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '1.2rem',
                                flexShrink: 0,
                            }}>{c.grade}</div>
                            <div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: c.color }}>{dist[c.grade]}</div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>{c.label}</div>
                            </div>
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
                    {isLoading && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-2)' }}>Loading scores…</div>}
                    {isError && <div style={{ padding: 40, textAlign: 'center', color: '#dc2626' }}>Failed to load data.</div>}
                    {!isLoading && !isError && (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                            <thead>
                                <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                                    {['Product', 'SKU', 'Score', 'Grade', 'Velocity', 'Turnover', 'Margin %', 'Availability %'].map(h => (
                                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-2)', fontSize: '0.8rem' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {products.length === 0 && (
                                    <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: 'var(--text-2)' }}>No products found.</td></tr>
                                )}
                                {products.map((p, i) => (
                                    <tr key={p.id} style={{ borderBottom: i < products.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                        <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-1)' }}>{p.name}</td>
                                        <td style={{ padding: '10px 14px', color: 'var(--text-2)', fontSize: '0.8rem' }}>{p.sku}</td>
                                        <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-1)' }}>{p.score}</td>
                                        <td style={{ padding: '10px 14px' }}><GradeBadge grade={p.grade} /></td>
                                        <td style={{ padding: '10px 14px', color: 'var(--text-2)' }}>{p.velocity_score}</td>
                                        <td style={{ padding: '10px 14px', color: 'var(--text-2)' }}>{p.turnover_score}</td>
                                        <td style={{ padding: '10px 14px', color: 'var(--text-2)' }}>{p.margin_pct}%</td>
                                        <td style={{ padding: '10px 14px', color: 'var(--text-2)' }}>{p.availability_pct}%</td>
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
