import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client';

export default function UserForm({ user, onClose, onSaved }) {
    const qc = useQueryClient();
    const [form, setForm] = useState({ name: user?.name ?? '', email: user?.email ?? '', role: user?.role ?? 'staff', password: '' });
    const [error, setError] = useState('');

    const save = useMutation({
        mutationFn: (payload) => user ? client.put(`/users/${user.id}`, payload) : client.post('/users', payload),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); onSaved?.(); onClose(); },
        onError: (err) => setError(err.response?.data?.message ?? 'Something went wrong.'),
    });

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box" style={{ maxWidth: 420, margin: '0 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0' }}>
                    <h2 style={{ fontSize: '1.0625rem', fontWeight: 600, color: 'var(--text-1)' }}>{user ? 'Edit User' : 'New User'}</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}>
                        <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
                    </button>
                </div>
                <div style={{ padding: '20px 24px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {error && <div className="alert-error">{error}</div>}
                    <div><label className="form-label">Name *</label><input className="field" value={form.name} onChange={e => set('name', e.target.value)} /></div>
                    <div><label className="form-label">Email *</label><input type="email" className="field" value={form.email} onChange={e => set('email', e.target.value)} /></div>
                    <div>
                        <label className="form-label">Role</label>
                        <select className="field" value={form.role} onChange={e => set('role', e.target.value)}>
                            <option value="admin">Admin</option>
                            <option value="manager">Manager</option>
                            <option value="staff">Staff</option>
                        </select>
                    </div>
                    <div>
                        <label className="form-label">{user ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                        <input type="password" className="field" value={form.password} onChange={e => set('password', e.target.value)} />
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '20px 24px' }}>
                    <button onClick={onClose} className="btn btn-ghost">Cancel</button>
                    <button onClick={() => save.mutate(form)} disabled={save.isPending} className="btn btn-primary">
                        {save.isPending ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
}
