import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';

export default function CustomerForm({ customer, onClose, onSaved }) {
    const qc = useQueryClient();
    const [form, setForm] = useState({
        name:           customer?.name           ?? '',
        email:          customer?.email          ?? '',
        phone:          customer?.phone          ?? '',
        address:        customer?.address        ?? '',
        contact_person: customer?.contact_person ?? '',
        notes:          customer?.notes          ?? '',
        is_active:      customer?.is_active      ?? true,
    });

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const save = useMutation({
        mutationFn: (payload) => customer
            ? api.put(`/customers/${customer.id}`, payload)
            : api.post('/customers', payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['customers'] });
            qc.invalidateQueries({ queryKey: ['customers-all'] });
            onSaved?.();
            onClose();
        },
    });

    return (
        <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box" style={{ maxWidth: 520, margin: '0 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0' }}>
                    <h2 style={{ fontSize: '1.0625rem', fontWeight: 600, color: 'var(--text-1)' }}>
                        {customer ? 'Edit Customer' : 'New Customer'}
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}>
                        <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                        </svg>
                    </button>
                </div>

                <div style={{ padding: '20px 24px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {save.error && (
                        <div className="alert-error">{save.error.response?.data?.message ?? 'Error saving customer'}</div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label">Name *</label>
                            <input className="field" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Customer or company name" />
                        </div>
                        <div>
                            <label className="form-label">Email</label>
                            <input className="field" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" />
                        </div>
                        <div>
                            <label className="form-label">Phone</label>
                            <input className="field" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+63 9xx xxx xxxx" />
                        </div>
                        <div>
                            <label className="form-label">Contact Person</label>
                            <input className="field" value={form.contact_person} onChange={e => set('contact_person', e.target.value)} />
                        </div>
                        <div>
                            <label className="form-label">Status</label>
                            <select className="field" value={form.is_active ? '1' : '0'} onChange={e => set('is_active', e.target.value === '1')}>
                                <option value="1">Active</option>
                                <option value="0">Inactive</option>
                            </select>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label">Address</label>
                            <textarea className="field" rows={2} style={{ resize: 'vertical' }} value={form.address} onChange={e => set('address', e.target.value)} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label">Notes</label>
                            <textarea className="field" rows={2} style={{ resize: 'vertical' }} value={form.notes} onChange={e => set('notes', e.target.value)} />
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '20px 24px' }}>
                    <button onClick={onClose} className="btn btn-ghost">Cancel</button>
                    <button onClick={() => save.mutate(form)} disabled={save.isPending} className="btn btn-primary">
                        {save.isPending ? 'Saving…' : customer ? 'Save Changes' : 'Create Customer'}
                    </button>
                </div>
            </div>
        </div>
    );
}
