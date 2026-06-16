import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/Layout';
import api from '../../api/client';
import { usePermission } from '../../hooks/usePermission';
import { useToast } from '../../context/ToastContext';

function BranchForm({ branch, onClose, onSaved }) {
    const qc = useQueryClient();
    const isEdit = !!branch;
    const [form, setForm] = useState({
        name: branch?.name ?? '',
        code: branch?.code ?? '',
        address: branch?.address ?? '',
        phone: branch?.phone ?? '',
        is_main: branch?.is_main ?? false,
        is_active: branch?.is_active ?? true,
    });

    const mutation = useMutation({
        mutationFn: (data) => isEdit
            ? api.put(`/branches/${branch.id}`, data).then(r => r.data)
            : api.post('/branches', data).then(r => r.data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['branches'] }); onSaved?.(); onClose(); },
    });

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box" style={{ maxWidth: 440, margin: '0 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0' }}>
                    <h2 style={{ fontSize: '1.0625rem', fontWeight: 600, color: 'var(--text-1)' }}>{isEdit ? 'Edit Branch' : 'New Branch'}</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}>
                        <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
                    </button>
                </div>
                <div style={{ padding: '20px 24px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {mutation.error && <div className="alert-error">{mutation.error.response?.data?.message ?? 'Error'}</div>}
                    <div><label className="form-label">Name *</label><input className="field" value={form.name} onChange={e => set('name', e.target.value)} /></div>
                    <div><label className="form-label">Code</label><input className="field" value={form.code} onChange={e => set('code', e.target.value)} /></div>
                    <div><label className="form-label">Address</label><input className="field" value={form.address} onChange={e => set('address', e.target.value)} /></div>
                    <div><label className="form-label">Phone</label><input className="field" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
                    <div style={{ display: 'flex', gap: 20 }}>
                        {[['is_main', 'Main Branch'], ['is_active', 'Active']].map(([k, lbl]) => (
                            <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', color: 'var(--text-2)', cursor: 'pointer' }}>
                                <input type="checkbox" checked={form[k]} onChange={e => set(k, e.target.checked)} style={{ accentColor: 'var(--indigo)' }} />
                                {lbl}
                            </label>
                        ))}
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '20px 24px' }}>
                    <button onClick={onClose} className="btn btn-ghost">Cancel</button>
                    <button onClick={() => mutation.mutate(form)} disabled={mutation.isPending} className="btn btn-primary">
                        {mutation.isPending ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function BranchesPage() {
    const [modal, setModal] = useState(null);
    const qc = useQueryClient();
    const { data, isLoading } = useQuery({
        queryKey: ['branches'],
        queryFn: () => api.get('/branches').then(r => r.data),
    });

    const { addToast } = useToast();

    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(`/branches/${id}`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['branches'] }); addToast('Branch deleted', 'error'); },
    });

    const branches = data?.data ?? [];
    const { can } = usePermission();

    return (
        <Layout>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Branches</h1>
                    <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', marginTop: 2 }}>{branches.length} locations</p>
                </div>
                {can('manageBranches') && (
                    <button className="btn btn-primary" onClick={() => setModal({ type: 'form' })}>
                        <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/></svg>
                        New Branch
                    </button>
                )}
            </div>

            {isLoading ? (
                <div style={{ display: 'flex', gap: 6, padding: 24 }}>{[0,1,2].map(i => <span key={i} className="loading-dot" style={{ animationDelay: `${i * 0.2}s` }} />)}</div>
            ) : (
                <div className="card" style={{ overflow: 'hidden' }}>
                    <table className="data-table">
                        <thead>
                            <tr>{['Name', 'Code', 'Address', 'Phone', 'Main', 'Status', ''].map(h => <th key={h}>{h}</th>)}</tr>
                        </thead>
                        <tbody>
                            {branches.map(b => (
                                <tr key={b.id}>
                                    <td style={{ fontWeight: 500 }}>{b.name}</td>
                                    <td><code style={{ background: 'var(--surface-2)', padding: '2px 6px', borderRadius: 4, fontSize: '0.75rem', color: 'var(--text-2)' }}>{b.code ?? '—'}</code></td>
                                    <td style={{ color: 'var(--text-2)' }}>{b.address ?? '—'}</td>
                                    <td style={{ color: 'var(--text-2)' }}>{b.phone ?? '—'}</td>
                                    <td>{b.is_main && <span className="badge badge-indigo">Main</span>}</td>
                                    <td><span className={`badge ${b.is_active ? 'badge-green' : 'badge-gray'}`}>{b.is_active ? 'Active' : 'Inactive'}</span></td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                            {can('manageBranches') && (
                                                <button className="btn btn-ghost btn-sm" onClick={() => setModal({ type: 'form', branch: b })}>Edit</button>
                                            )}
                                            {can('manageBranches') && !b.is_main && (
                                                <button className="btn btn-sm" style={{ background: 'var(--red-light)', color: 'var(--red)', border: 'none' }}
                                                    onClick={() => { if (confirm('Delete branch?')) deleteMutation.mutate(b.id); }}>Delete</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {branches.length === 0 && (
                                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '40px 16px' }}>No branches yet</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {modal?.type === 'form' && <BranchForm branch={modal.branch} onClose={() => setModal(null)} onSaved={() => addToast(modal.branch ? 'Branch updated' : 'Branch created')} />}
        </Layout>
    );
}
