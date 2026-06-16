import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/Layout';
import { usePermission } from '../../hooks/usePermission';
import client from '../../api/client';

const tabs = ['pending', 'history'];

function typeLabel(type) {
    if (!type) return 'Unknown';
    if (type.includes('PurchaseOrder')) return 'Purchase Order';
    if (type.includes('TransferOrder')) return 'Transfer Order';
    return type.split('\\').pop();
}

function statusBadge(status) {
    const colors = {
        pending:  { background: 'var(--amber)', color: '#000' },
        approved: { background: 'var(--green)',  color: '#fff' },
        rejected: { background: 'var(--red)',    color: '#fff' },
    };
    return (
        <span style={{
            ...colors[status],
            padding: '2px 10px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 600,
            textTransform: 'capitalize',
        }}>
            {status}
        </span>
    );
}

export default function ApprovalsPage() {
    const { can, role } = usePermission();
    const qc = useQueryClient();
    const [tab, setTab] = useState('pending');
    const [rejectId, setRejectId] = useState(null);
    const [rejectNotes, setRejectNotes] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['approvals', tab],
        queryFn: () => client.get(`/approvals?tab=${tab}`).then(r => r.data),
    });

    const approve = useMutation({
        mutationFn: (id) => client.post(`/approvals/${id}/approve`).then(r => r.data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['approvals'] }); },
    });

    const reject = useMutation({
        mutationFn: ({ id, notes }) => client.post(`/approvals/${id}/reject`, { notes }).then(r => r.data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['approvals'] });
            setRejectId(null);
            setRejectNotes('');
        },
    });

    const canApprove = role === 'admin' || role === 'manager';

    const rows = Array.isArray(data) ? data : (data?.data ?? []);

    return (
        <Layout>
            <div style={{ padding: 32, maxWidth: 1100, margin: '0 auto' }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-1)', marginBottom: 24 }}>
                    Approvals
                </h1>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
                    {tabs.map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            style={{
                                padding: '8px 20px',
                                border: 'none',
                                background: 'none',
                                cursor: 'pointer',
                                fontWeight: tab === t ? 700 : 400,
                                color: tab === t ? 'var(--indigo)' : 'var(--text-2)',
                                borderBottom: tab === t ? '2px solid var(--indigo)' : '2px solid transparent',
                                marginBottom: -1,
                                textTransform: 'capitalize',
                            }}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                {isLoading && <p style={{ color: 'var(--text-2)' }}>Loading…</p>}

                {!isLoading && rows.length === 0 && (
                    <p style={{ color: 'var(--text-3)', textAlign: 'center', padding: 40 }}>
                        {tab === 'pending' ? 'No pending approvals.' : 'No approval history yet.'}
                    </p>
                )}

                {rows.length > 0 && (
                    <div style={{ background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                                    {['Type', 'Reference', 'Requested By', 'Date', 'Status', canApprove && tab === 'pending' ? 'Actions' : ''].filter(Boolean).map(h => (
                                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map(row => (
                                    <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>{typeLabel(row.approvable_type)}</td>
                                        <td style={{ padding: '12px 16px', color: 'var(--text-1)', fontWeight: 600 }}>
                                            {row.resource?.label ?? `#${row.approvable_id}`}
                                        </td>
                                        <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>{row.requested_by?.name ?? '—'}</td>
                                        <td style={{ padding: '12px 16px', color: 'var(--text-3)', fontSize: 13 }}>
                                            {new Date(row.created_at).toLocaleDateString()}
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>{statusBadge(row.status)}</td>
                                        {canApprove && tab === 'pending' && (
                                            <td style={{ padding: '12px 16px' }}>
                                                {rejectId === row.id ? (
                                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                        <input
                                                            placeholder="Rejection notes…"
                                                            value={rejectNotes}
                                                            onChange={e => setRejectNotes(e.target.value)}
                                                            style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, width: 180, background: 'var(--surface)', color: 'var(--text-1)' }}
                                                        />
                                                        <button
                                                            onClick={() => reject.mutate({ id: row.id, notes: rejectNotes })}
                                                            style={{ padding: '4px 12px', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
                                                        >
                                                            Confirm
                                                        </button>
                                                        <button
                                                            onClick={() => setRejectId(null)}
                                                            style={{ padding: '4px 10px', background: 'none', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', fontSize: 13, color: 'var(--text-2)' }}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <button
                                                            onClick={() => approve.mutate(row.id)}
                                                            disabled={approve.isPending}
                                                            style={{ padding: '4px 14px', background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => setRejectId(row.id)}
                                                            style={{ padding: '4px 14px', background: 'none', border: '1px solid var(--red)', color: 'var(--red)', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </Layout>
    );
}
