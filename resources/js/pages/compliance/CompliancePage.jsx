import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/Layout';
import client from '../../api/client';

const DOC_TYPES = ['certificate', 'permit', 'license', 'other'];

function expiryColor(dateStr) {
    if (!dateStr) return null;
    const diff = Math.floor((new Date(dateStr) - Date.now()) / 86400000);
    if (diff < 0)  return 'var(--red)';
    if (diff <= 7) return 'var(--amber)';
    if (diff <= 30) return '#ca8a04';
    return 'var(--green)';
}

function expiryLabel(dateStr) {
    if (!dateStr) return '—';
    const diff = Math.floor((new Date(dateStr) - Date.now()) / 86400000);
    if (diff < 0)  return `Expired ${Math.abs(diff)}d ago`;
    if (diff === 0) return 'Expires today';
    return `${diff}d left`;
}

const emptyForm = { title: '', document_type: 'certificate', product_id: '', expiry_date: '', notes: '' };

export default function CompliancePage() {
    const qc = useQueryClient();
    const [tab, setTab] = useState('alerts');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm);

    const { data: alerts, isLoading: alertsLoading } = useQuery({
        queryKey: ['compliance-alerts'],
        queryFn: () => client.get('/compliance/alerts').then(r => r.data),
    });

    const { data: docs, isLoading: docsLoading } = useQuery({
        queryKey: ['compliance-documents'],
        queryFn: () => client.get('/compliance/documents').then(r => r.data),
        enabled: tab === 'documents',
    });

    const store = useMutation({
        mutationFn: (data) => editing
            ? client.put(`/compliance/documents/${editing.id}`, data).then(r => r.data)
            : client.post('/compliance/documents', data).then(r => r.data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['compliance-documents'] });
            qc.invalidateQueries({ queryKey: ['compliance-alerts'] });
            closeModal();
        },
    });

    const destroy = useMutation({
        mutationFn: (id) => client.delete(`/compliance/documents/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['compliance-documents'] }),
    });

    function openCreate() { setEditing(null); setForm(emptyForm); setShowModal(true); }
    function openEdit(doc) {
        setEditing(doc);
        setForm({
            title: doc.title,
            document_type: doc.document_type,
            product_id: doc.product_id ?? '',
            expiry_date: doc.expiry_date ?? '',
            notes: doc.notes ?? '',
        });
        setShowModal(true);
    }
    function closeModal() { setShowModal(false); setEditing(null); setForm(emptyForm); }

    const handleSubmit = (e) => {
        e.preventDefault();
        store.mutate({ ...form, product_id: form.product_id || null });
    };

    return (
        <Layout>
            <div style={{ padding: 32, maxWidth: 1100, margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-1)' }}>Compliance</h1>
                    {tab === 'documents' && (
                        <button onClick={openCreate} style={{ padding: '8px 20px', background: 'var(--indigo)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                            + Add Document
                        </button>
                    )}
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
                    {['alerts', 'documents'].map(t => (
                        <button key={t} onClick={() => setTab(t)} style={{
                            padding: '8px 20px', border: 'none', background: 'none', cursor: 'pointer',
                            fontWeight: tab === t ? 700 : 400,
                            color: tab === t ? 'var(--indigo)' : 'var(--text-2)',
                            borderBottom: tab === t ? '2px solid var(--indigo)' : '2px solid transparent',
                            marginBottom: -1, textTransform: 'capitalize',
                        }}>{t}</button>
                    ))}
                </div>

                {/* Alerts Tab */}
                {tab === 'alerts' && (
                    <div>
                        {alertsLoading && <p style={{ color: 'var(--text-2)' }}>Loading…</p>}
                        {!alertsLoading && (
                            <>
                                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)', marginBottom: 12 }}>
                                    Expiring Products
                                </h3>
                                {!alerts?.products?.length && <p style={{ color: 'var(--text-3)', marginBottom: 24 }}>No expiring products.</p>}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, marginBottom: 32 }}>
                                    {alerts?.products?.map(p => {
                                        const color = expiryColor(p.expiry_date);
                                        return (
                                            <div key={p.id} style={{ background: 'var(--surface)', border: `1px solid ${color ?? 'var(--border)'}`, borderRadius: 10, padding: 16 }}>
                                                <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>{p.name}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>{p.sku}</div>
                                                <div style={{ color, fontWeight: 600, fontSize: 14 }}>{expiryLabel(p.expiry_date)}</div>
                                                <div style={{ color: 'var(--text-3)', fontSize: 12 }}>{p.expiry_date}</div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)', marginBottom: 12 }}>
                                    Expiring Documents
                                </h3>
                                {!alerts?.documents?.length && <p style={{ color: 'var(--text-3)' }}>No expiring documents.</p>}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                                    {alerts?.documents?.map(d => {
                                        const color = expiryColor(d.expiry_date);
                                        return (
                                            <div key={d.id} style={{ background: 'var(--surface)', border: `1px solid ${color ?? 'var(--border)'}`, borderRadius: 10, padding: 16 }}>
                                                <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>{d.title}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4, textTransform: 'capitalize' }}>{d.document_type}</div>
                                                {d.product && <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 8 }}>Product: {d.product.name}</div>}
                                                <div style={{ color, fontWeight: 600, fontSize: 14 }}>{expiryLabel(d.expiry_date)}</div>
                                                <div style={{ color: 'var(--text-3)', fontSize: 12 }}>{d.expiry_date}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Documents Tab */}
                {tab === 'documents' && (
                    <div>
                        {docsLoading && <p style={{ color: 'var(--text-2)' }}>Loading…</p>}
                        {!docsLoading && docs?.data?.length === 0 && (
                            <p style={{ color: 'var(--text-3)', textAlign: 'center', padding: 40 }}>No documents yet. Add one.</p>
                        )}
                        {docs?.data?.length > 0 && (
                            <div style={{ background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                                            {['Title', 'Type', 'Product', 'Expiry', 'Status', 'Actions'].map(h => (
                                                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {docs.data.map(doc => {
                                            const color = expiryColor(doc.expiry_date);
                                            return (
                                                <tr key={doc.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                                    <td style={{ padding: '12px 16px', color: 'var(--text-1)', fontWeight: 600 }}>{doc.title}</td>
                                                    <td style={{ padding: '12px 16px', color: 'var(--text-2)', textTransform: 'capitalize' }}>{doc.document_type}</td>
                                                    <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>{doc.product?.name ?? '—'}</td>
                                                    <td style={{ padding: '12px 16px', color: 'var(--text-3)' }}>{doc.expiry_date ?? '—'}</td>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        {color ? <span style={{ color, fontWeight: 600, fontSize: 13 }}>{expiryLabel(doc.expiry_date)}</span> : <span style={{ color: 'var(--text-3)' }}>—</span>}
                                                    </td>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <div style={{ display: 'flex', gap: 8 }}>
                                                            <button onClick={() => openEdit(doc)} style={{ padding: '4px 12px', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', fontSize: 13, background: 'none', color: 'var(--text-2)' }}>Edit</button>
                                                            <button onClick={() => { if (confirm('Delete this document?')) destroy.mutate(doc.id); }} style={{ padding: '4px 12px', border: '1px solid var(--red)', borderRadius: 6, cursor: 'pointer', fontSize: 13, background: 'none', color: 'var(--red)' }}>Delete</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Modal */}
                {showModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                        <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 32, width: 480, maxWidth: '95vw' }}>
                            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)', marginBottom: 20 }}>
                                {editing ? 'Edit Document' : 'Add Document'}
                            </h2>
                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <div>
                                    <label style={{ fontSize: 13, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Title *</label>
                                    <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required style={inputStyle} />
                                </div>
                                <div>
                                    <label style={{ fontSize: 13, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Type *</label>
                                    <select value={form.document_type} onChange={e => setForm(f => ({ ...f, document_type: e.target.value }))} style={inputStyle}>
                                        {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: 13, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Product ID (optional)</label>
                                    <input type="number" value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))} style={inputStyle} placeholder="Leave blank if not product-specific" />
                                </div>
                                <div>
                                    <label style={{ fontSize: 13, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Expiry Date</label>
                                    <input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={{ fontSize: 13, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Notes</label>
                                    <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                                </div>
                                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                                    <button type="button" onClick={closeModal} style={{ padding: '8px 20px', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', background: 'none', color: 'var(--text-2)' }}>Cancel</button>
                                    <button type="submit" disabled={store.isPending} style={{ padding: '8px 20px', background: 'var(--indigo)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                                        {store.isPending ? 'Saving…' : 'Save'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}

const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: 14,
    background: 'var(--surface)',
    color: 'var(--text-1)',
    boxSizing: 'border-box',
};
