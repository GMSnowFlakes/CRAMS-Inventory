import { useQuery } from '@tanstack/react-query';
import client from '../../api/client';
import Layout from '../../components/Layout';

function scoreColor(score) {
    if (score >= 80) return '#16a34a';
    if (score >= 60) return 'var(--indigo)';
    if (score >= 40) return '#d97706';
    return '#dc2626';
}

function ScoreDial({ score, grade }) {
    const radius = 70;
    const stroke = 10;
    const normalizedRadius = radius - stroke / 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const pct = Math.min(100, Math.max(0, score));
    const offset = circumference - (pct / 100) * circumference;
    const color = scoreColor(score);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <svg height={radius * 2} width={radius * 2}>
                <circle
                    stroke="var(--border)"
                    fill="transparent"
                    strokeWidth={stroke}
                    r={normalizedRadius}
                    cx={radius}
                    cy={radius}
                />
                <circle
                    stroke={color}
                    fill="transparent"
                    strokeWidth={stroke}
                    strokeDasharray={`${circumference} ${circumference}`}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    r={normalizedRadius}
                    cx={radius}
                    cy={radius}
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.6s ease' }}
                />
                <text x="50%" y="44%" dominantBaseline="middle" textAnchor="middle" fontSize="22" fontWeight="800" fill={color}>
                    {score}
                </text>
                <text x="50%" y="64%" dominantBaseline="middle" textAnchor="middle" fontSize="14" fontWeight="700" fill={color}>
                    {grade}
                </text>
            </svg>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}>Inventory Health Score</div>
        </div>
    );
}

function ComponentCard({ item }) {
    const color = scoreColor(item.score);
    const pct = Math.min(100, item.score);

    return (
        <div style={{
            background: 'var(--surface-1)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '16px 18px',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: '0.9rem' }}>{item.label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-2)', marginTop: 2 }}>{item.description}</div>
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color, marginLeft: 12, flexShrink: 0 }}>{item.score}</div>
            </div>
            <div style={{ height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: color,
                    borderRadius: 99,
                    transition: 'width 0.5s ease',
                }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-2)' }}>Weight: {item.weight}%</span>
                <span style={{ fontSize: '0.72rem', color }}>Score: {item.score}/100</span>
            </div>
        </div>
    );
}

export default function HealthScorePage() {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['health-score'],
        queryFn: () => client.get('/health-score').then(r => r.data),
    });

    const score = data?.score ?? 0;
    const grade = data?.grade ?? '—';
    const breakdown = data?.breakdown ?? [];

    return (
        <Layout>
            <div style={{ padding: '24px 28px', maxWidth: 900 }}>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>
                    Inventory Health Score
                </h1>
                <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginBottom: 32 }}>
                    Company-wide inventory health across 5 dimensions
                </p>

                {isLoading && <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-2)' }}>Calculating health score…</div>}
                {isError && <div style={{ padding: 60, textAlign: 'center', color: '#dc2626' }}>Failed to load health score.</div>}

                {!isLoading && !isError && (
                    <>
                        {/* Dial */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            marginBottom: 36,
                            background: 'var(--surface-1)',
                            border: '1px solid var(--border)',
                            borderRadius: 12,
                            padding: '32px 0',
                        }}>
                            <ScoreDial score={score} grade={grade} />
                        </div>

                        {/* Breakdown Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                            {breakdown.map(item => (
                                <ComponentCard key={item.key} item={item} />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </Layout>
    );
}
