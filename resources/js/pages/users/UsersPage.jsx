import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client';
import Layout from '../../components/Layout';
import UserForm from './UserForm';
import { useAuth } from '../../context/AuthContext';
import { usePermission } from '../../hooks/usePermission';
import { useToast } from '../../context/ToastContext';

const ROLE_BADGE = { admin: 'badge-violet', manager: 'badge-indigo', staff: 'badge-sky' };

function ResetPasswordModal({ user, onClose }) {
    const [pw, setPw]   = useState('');
    const [pw2, setPw2] = useState('');
    const [err, setErr] = useState('');
    const [ok, setOk]   = useState(false);
    const qc = useQueryClient();

    const mut = useMutation({
        mutationFn: () => client.put(`/users/${user.id}`, { password: pw }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['users'] });
            setOk(true);
            setTimeout(onClose, 1500);
        },
        onError: (e) => setErr(e?.response?.data?.message ?? 'Reset failed'),
    });

    const submit = (e) => {
        e.preventDefault();
        setErr('');
        if (pw.length < 8)  { setErr('Password must be at least 8 characters'); return; }
        if (pw !== pw2)     { setErr('Passwords do not match'); return; }
        mut.mutate();
    };

    return (
        <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box" style={{ maxWidth: 400, margin: '0 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0' }}>
                    <h2 style={{ fontSize: '1.0625rem', fontWeight: 600, color: 'var(--text-1)' }}>Reset Password</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}>
                        <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
                    </button>
                </div>
                <form onSubmit={submit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', marginBottom: 4 }}>
                        Set a new password for <strong>{user.name}</strong>.
                    </p>
                    {err && <div className="alert-error">{err}</div>}
                    {ok  && <div style={{ background: 'var(--green-light)', color: 'var(--green)', padding: '8px 12px', borderRadius: 6, fontSize: '0.875rem' }}>Password reset successfully.</div>}
                    <div>
                        <label className="field-label">New Password</label>
                        <input type="password" className="field" value={pw} onChange={e => setPw(e.target.value)} placeholder="Minimum 8 characters" autoComplete="new-password" />
                    </div>
                    <div>
                        <label className="field-label">Confirm Password</label>
                        <input type="password" className="field" value={pw2} onChange={e => setPw2(e.target.value)} autoComplete="new-password" />
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={mut.isPending}>
                            {mut.isPending ? 'Resetting…' : 'Reset Password'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function UsersPage() {
    const qc = useQueryClient();
    const { user: me } = useAuth();
    const { can } = usePermission();
    const { addToast } = useToast();
    const [search, setSearch]       = useState('');
    const [page, setPage]           = useState(1);
    const [formOpen, setFormOpen]   = useState(false);
    const [editing, setEditing]     = useState(null);
    const [resetting, setResetting] = useState(null);

    useEffect(() => { setPage(1); }, [search]);

    const { data, isLoading } = useQuery({
        queryKey: ['users', search, page],
        queryFn: () => client.get('/users', { params: { search: search || undefined, page } }).then(r => r.data),
    });

    const destroy = useMutation({
        mutationFn: (id) => client.delete(`/users/${id}`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); addToast('User deleted', 'error'); },
    });

    return (
        <Layout>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Users</h1>
                    <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', marginTop: 2 }}>{data?.total ?? data?.data?.length ?? 0} users</p>
                </div>
                {can('manageUsers') && (
                    <button onClick={() => { setEditing(null); setFormOpen(true); }} className="btn btn-primary">
                        <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/></svg>
                        Add User
                    </button>
                )}
            </div>

            <div style={{ position: 'relative', maxWidth: 320, marginBottom: 16 }}>
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"
                    style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }}>
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
                </svg>
                <input type="text" placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)} className="field" style={{ paddingLeft: 34 }} />
            </div>

            {isLoading ? (
                <div style={{ display: 'flex', gap: 6, padding: 24 }}>{[0,1,2].map(i => <span key={i} className="loading-dot" style={{ animationDelay: `${i * 0.2}s` }} />)}</div>
            ) : (
                <div className="card" style={{ overflow: 'hidden' }}>
                    <table className="data-table">
                        <thead>
                            <tr>{['Name', 'Email', 'Role', ''].map(h => <th key={h}>{h}</th>)}</tr>
                        </thead>
                        <tbody>
                            {data?.data?.map(u => (
                                <tr key={u.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{
                                                width: 30, height: 30, borderRadius: '50%',
                                                background: 'var(--indigo-light)', color: 'var(--indigo)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
                                            }}>
                                                {u.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                            </div>
                                            <span style={{ fontWeight: 500 }}>{u.name}</span>
                                            {u.id === me?.id && <span className="badge badge-gray" style={{ fontSize: '0.6875rem' }}>you</span>}
                                        </div>
                                    </td>
                                    <td style={{ color: 'var(--text-2)' }}>{u.email}</td>
                                    <td><span className={`badge ${ROLE_BADGE[u.role] ?? 'badge-gray'}`} style={{ textTransform: 'capitalize' }}>{u.role}</span></td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                            {can('manageUsers') && (
                                                <button onClick={() => { setEditing(u); setFormOpen(true); }} className="btn btn-ghost btn-sm">Edit</button>
                                            )}
                                            {can('manageUsers') && u.id !== me?.id && (
                                                <button onClick={() => setResetting(u)} className="btn btn-ghost btn-sm">Reset Pw</button>
                                            )}
                                            {can('manageUsers') && u.id !== me?.id && (
                                                <button onClick={() => { if (confirm(`Delete user "${u.name}"?`)) destroy.mutate(u.id); }} className="btn btn-sm" style={{ background: 'var(--red-light)', color: 'var(--red)', border: 'none' }}>Delete</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!data?.data?.length && (
                                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '40px 16px' }}>No users found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {data?.last_page > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, fontSize: '0.875rem', color: 'var(--text-3)' }}>
                    <span>Page {data.current_page} of {data.last_page} · {data.total} users</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                        <button className="btn btn-ghost btn-sm" disabled={page >= data.last_page} onClick={() => setPage(p => p + 1)}>Next →</button>
                    </div>
                </div>
            )}

            {formOpen && <UserForm user={editing} onClose={() => { setFormOpen(false); setEditing(null); }} onSaved={() => addToast(editing ? 'User updated' : 'User added')} />}
            {resetting && <ResetPasswordModal user={resetting} onClose={() => setResetting(null)} />}
        </Layout>
    );
}
