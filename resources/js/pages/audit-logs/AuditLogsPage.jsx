import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '../../components/Layout';
import api from '../../api/client';
import { usePermission } from '../../hooks/usePermission';

const EVENT_BADGE = { created: 'badge-green', updated: 'badge-indigo', deleted: 'badge-red' };

const shortModel = (type) => type ? type.split('\\').pop() : '—';

export default function AuditLogsPage() {
    const { can } = usePermission();
    const [filters, setFilters] = useState({ event: '', date_from: '', date_to: '', model: '' });
    const [page, setPage] = useState(1);

    if (!can('viewAuditLogs')) {
        return (
            <Layout>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12 }}>
                    <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-1)' }}>Access Restricted</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-3)' }}>You do not have permission to view audit logs.</p>
                </div>
            </Layout>
        );
    }

    const { data, isLoading } = useQuery({
        queryKey: ['audit-logs', filters, page],
        queryFn: () => {
            const params = new URLSearchParams({ page, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) });
            return api.get(`/audit-logs?${params}`).then(r => r.data);
        },
    });

    const setFilter = (k, v) => { setFilters(f => ({ ...f, [k]: v })); setPage(1); };
    const logs = data?.data ?? [];

    return (
        <Layout>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Audit Logs</h1>
                    <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', marginTop: 2 }}>Full record of all changes</p>
                </div>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
                <select className="field" style={{ width: 160 }} value={filters.event} onChange={e => setFilter('event', e.target.value)}>
                    <option value="">All events</option>
                    <option value="created">Created</option>
                    <option value="updated">Updated</option>
                    <option value="deleted">Deleted</option>
                </select>
                <input type="text" placeholder="Filter by model…" className="field" style={{ width: 160 }} value={filters.model} onChange={e => setFilter('model', e.target.value)} />
                <input type="date" className="field" style={{ width: 160 }} value={filters.date_from} onChange={e => setFilter('date_from', e.target.value)} />
                <input type="date" className="field" style={{ width: 160 }} value={filters.date_to} onChange={e => setFilter('date_to', e.target.value)} />
                <button className="btn btn-ghost btn-sm" onClick={() => { setFilters({ event: '', date_from: '', date_to: '', model: '' }); setPage(1); }}>
                    Clear
                </button>
            </div>

            {isLoading ? (
                <div style={{ display: 'flex', gap: 6, padding: 24 }}>{[0,1,2].map(i => <span key={i} className="loading-dot" style={{ animationDelay: `${i * 0.2}s` }} />)}</div>
            ) : (
                <>
                    <div className="card" style={{ overflow: 'hidden' }}>
                        <table className="data-table">
                            <thead>
                                <tr>{['Time', 'User', 'Event', 'Model', 'ID', 'Changes'].map(h => <th key={h}>{h}</th>)}</tr>
                            </thead>
                            <tbody>
                                {logs.map(log => (
                                    <tr key={log.id}>
                                        <td style={{ color: 'var(--text-3)', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                                            {log.created_at?.replace('T', ' ').slice(0, 16)}
                                        </td>
                                        <td style={{ fontWeight: 500 }}>{log.user?.name ?? <span style={{ color: 'var(--text-3)' }}>System</span>}</td>
                                        <td><span className={`badge ${EVENT_BADGE[log.event] ?? 'badge-gray'}`} style={{ textTransform: 'capitalize' }}>{log.event}</span></td>
                                        <td>
                                            <code style={{ background: 'var(--surface-2)', padding: '2px 6px', borderRadius: 4, fontSize: '0.75rem', color: 'var(--text-2)' }}>
                                                {shortModel(log.auditable_type)}
                                            </code>
                                        </td>
                                        <td style={{ color: 'var(--text-3)' }}>#{log.auditable_id}</td>
                                        <td style={{ fontSize: '0.8125rem', color: 'var(--text-2)', maxWidth: 280 }}>
                                            {log.event === 'updated' && log.new_values
                                                ? <span style={{ background: 'var(--surface-2)', padding: '2px 8px', borderRadius: 4 }}>{Object.keys(log.new_values).join(', ')}</span>
                                                : log.event === 'created' ? 'New record'
                                                : 'Deleted'}
                                        </td>
                                    </tr>
                                ))}
                                {logs.length === 0 && (
                                    <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '40px 16px' }}>No audit logs found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {data?.last_page > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16 }}>
                            <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>Page {data.current_page} of {data.last_page}</span>
                            <button className="btn btn-ghost btn-sm" disabled={page >= data.last_page} onClick={() => setPage(p => p + 1)}>Next →</button>
                        </div>
                    )}
                </>
            )}
        </Layout>
    );
}
