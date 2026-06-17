import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client';

export default function SupplierForm({ supplier, onClose, onSaved }) {
    const qc = useQueryClient();
    const [form, setForm] = useState({
        name: supplier?.name ?? '',
        email: supplier?.email ?? '',
        phone: supplier?.phone ?? '',
        address: supplier?.address ?? '',
        contact_person: supplier?.contact_person ?? '',
        is_active: supplier?.is_active ?? true,
    });
    const [error, setError] = useState('');

    const save = useMutation({
        mutationFn: (payload) => supplier
            ? client.put(`/suppliers/${supplier.id}`, payload)
            : client.post('/suppliers', payload),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); onSaved?.(); onClose(); },
        onError: (err) => setError(err.response?.data?.message ?? 'Something went wrong.'),
    });

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    return (
        <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box" style={{ maxWidth: 460, margin: '0 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0' }}>
                    <h2 style={{ fontSize: '1.0625rem', fontWeight: 600, color: 'var(--text-1)' }}>{supplier ? 'Edit Supplier' : 'New Supplier'}</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}>
                        <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
                    </button>
                </div>
                <div style={{ padding: '20px 24px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {error && <div className="alert-error">{error}</div>}
                    {[
                        { key: 'name', label: 'Name *' },
                        { key: 'contact_person', label: 'Contact Person' },
                        { key: 'email', label: 'Email', type: 'email' },
                        { key: 'phone', label: 'Phone' },
                        { key: 'address', label: 'Address' },
                    ].map(({ key, label, type = 'text' }) => (
                        <div key={key}>
                            <label className="form-label">{label}</label>
                            <input type={type} className="field" value={form[key]} onChange={e => set(key, e.target.value)} />
                        </div>
                    ))}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input type="checkbox" id="sup_active" checked={form.is_active} onChange={e => set('is_active', e.target.checked)}
                            style={{ width: 16, height: 16, accentColor: 'var(--indigo)', cursor: 'pointer' }} />
                        <label htmlFor="sup_active" className="form-label" style={{ marginBottom: 0, cursor: 'pointer' }}>Active</label>
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
