import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import Layout from '../../components/Layout';
import { useCurrency } from '../../hooks/useCurrency';
import { useToast } from '../../context/ToastContext';
import { useKitConfig } from '../../hooks/useKitConfig';

const PAYMENT_METHODS = [
    { value: 'cash',          label: 'Cash' },
    { value: 'card',          label: 'Card' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'gcash',         label: 'GCash' },
    { value: 'other',         label: 'Other' },
];

const PM_LABEL = Object.fromEntries(PAYMENT_METHODS.map(m => [m.value, m.label]));

const EMPTY_FORM = {
    category: '',
    description: '',
    amount: '',
    expense_date: new Date().toISOString().slice(0, 10),
    payment_method: 'cash',
    reference: '',
    notes: '',
};

function ExpenseForm({ initial, onSave, onCancel, categories }) {
    const [form, setForm] = useState(initial ?? EMPTY_FORM);
    const [err, setErr]   = useState('');

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.category.trim()) { setErr('Category is required'); return; }
        if (!form.amount || parseFloat(form.amount) <= 0) { setErr('Enter a valid amount'); return; }
        onSave(form);
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {err && <div className="alert-error">{err}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                    <label className="field-label">Category *</label>
                    <input
                        list="cat-list"
                        className="field"
                        value={form.category}
                        onChange={e => set('category', e.target.value)}
                        placeholder="e.g. Utilities, Rent…"
                    />
                    <datalist id="cat-list">
                        {categories.map(c => <option key={c} value={c} />)}
                    </datalist>
                </div>
                <div>
                    <label className="field-label">Amount *</label>
                    <input type="number" min="0.01" step="0.01" className="field" value={form.amount} onChange={e => set('amount', e.target.value)} />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                    <label className="field-label">Date *</label>
                    <input type="date" className="field" value={form.expense_date} onChange={e => set('expense_date', e.target.value)} />
                </div>
                <div>
                    <label className="field-label">Payment Method</label>
                    <select className="field" value={form.payment_method} onChange={e => set('payment_method', e.target.value)}>
                        {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                </div>
            </div>

            <div>
                <label className="field-label">Description</label>
                <input className="field" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Brief description" />
            </div>

            <div>
                <label className="field-label">Reference / Receipt #</label>
                <input className="field" value={form.reference} onChange={e => set('reference', e.target.value)} placeholder="Optional reference" />
            </div>

            <div>
                <label className="field-label">Notes</label>
                <textarea className="field" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Expense</button>
            </div>
        </form>
    );
}

const EXPENSE_TEMPLATE = `Category,Amount,Date,Description,Payment Method,Reference,Notes
Utilities,250.00,2025-06-01,Electricity bill,cash,,
Rent,5000.00,2025-06-01,Monthly rent,bank_transfer,REF-001,
`;

function ImportModal({ onClose, onDone }) {
    const [file, setFile]       = useState(null);
    const [result, setResult]   = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState('');
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef();

    const downloadTemplate = () => {
        const blob = new Blob([EXPENSE_TEMPLATE], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'expense_import_template.csv';
        a.click();
    };

    const handleFile = (f) => {
        if (!f) return;
        if (!f.name.endsWith('.csv') && !f.name.endsWith('.txt')) { setError('Please upload a CSV file'); return; }
        setFile(f);
        setError('');
        setResult(null);
    };

    const doImport = async () => {
        if (!file) return;
        setLoading(true);
        setError('');
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await api.post('/expenses/bulk-import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            setResult(res.data);
            onDone();
        } catch (e) {
            setError(e?.response?.data?.message ?? 'Import failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box" style={{ maxWidth: 500, margin: '0 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0' }}>
                    <h2 style={{ fontSize: '1.0625rem', fontWeight: 600, color: 'var(--text-1)' }}>Import Expenses (CSV)</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}>
                        <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
                    </button>
                </div>
                <div style={{ padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={downloadTemplate}>
                        ↓ Download Template CSV
                    </button>

                    <div
                        onClick={() => inputRef.current?.click()}
                        onDragOver={e => { e.preventDefault(); setDragging(true); }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
                        style={{
                            border: `2px dashed ${dragging ? 'var(--indigo)' : 'var(--border)'}`,
                            borderRadius: 8, padding: '28px 20px', textAlign: 'center', cursor: 'pointer',
                            background: dragging ? 'var(--indigo-light)' : 'var(--surface-2)',
                            transition: 'all .15s',
                        }}
                    >
                        <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>📂</div>
                        {file
                            ? <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{file.name}</span>
                            : <span style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>Drop CSV here or click to browse</span>
                        }
                        <input ref={inputRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
                    </div>

                    {error && <div className="alert-error">{error}</div>}

                    {result && (
                        <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ display: 'flex', gap: 16 }}>
                                <span style={{ color: 'var(--green)', fontWeight: 600 }}>✓ {result.imported} imported</span>
                                {result.skipped > 0 && <span style={{ color: 'var(--text-3)' }}>{result.skipped} skipped</span>}
                            </div>
                            {result.errors?.map((e, i) => (
                                <div key={i} style={{ fontSize: '0.8125rem', color: 'var(--red)' }}>{e}</div>
                            ))}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost" onClick={onClose}>Close</button>
                        <button className="btn btn-primary" onClick={doImport} disabled={!file || loading}>
                            {loading ? 'Importing…' : 'Import'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ExpensesPage() {
    const { fmt } = useCurrency();
    const { addToast } = useToast();
    const { expenseCategories: kitCats } = useKitConfig();
    const qc      = useQueryClient();
    const [modal, setModal]       = useState(null);
    const [delId, setDelId]       = useState(null);
    const [importOpen, setImport] = useState(false);
    const [catFilter, setCat]   = useState('');
    const [from, setFrom]       = useState('');
    const [to, setTo]           = useState('');
    const [page, setPage]       = useState(1);

    useEffect(() => { setPage(1); }, [catFilter, from, to]);

    const { data, isLoading } = useQuery({
        queryKey: ['expenses', catFilter, from, to, page],
        queryFn: () => api.get('/expenses', {
            params: {
                category: catFilter || undefined,
                from:     from || undefined,
                to:       to   || undefined,
                page,
            },
        }).then(r => r.data),
    });

    const { data: recordedCats = [] } = useQuery({
        queryKey: ['expense-categories'],
        queryFn: () => api.get('/expenses/categories').then(r => r.data),
    });
    // Merge recorded categories with kit suggestions, deduplicated
    const cats = [...new Set([...kitCats, ...recordedCats])];

    const invalidate = () => {
        qc.invalidateQueries({ queryKey: ['expenses'] });
        qc.invalidateQueries({ queryKey: ['expense-categories'] });
    };

    const createMut = useMutation({
        mutationFn: (d) => api.post('/expenses', d),
        onSuccess: () => { invalidate(); setModal(null); addToast('Expense added'); },
    });

    const updateMut = useMutation({
        mutationFn: ({ id, ...d }) => api.put(`/expenses/${id}`, d),
        onSuccess: () => { invalidate(); setModal(null); addToast('Expense updated'); },
    });

    const deleteMut = useMutation({
        mutationFn: (id) => api.delete(`/expenses/${id}`),
        onSuccess: () => { invalidate(); setDelId(null); addToast('Expense deleted', 'error'); },
    });

    const expenses = data?.data ?? [];
    const pageTotal = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);

    return (
        <Layout>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Expenses</h1>
                    <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', marginTop: 2 }}>{data?.total ?? 0} records</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost" onClick={() => setImport(true)}>↑ Import CSV</button>
                    <button className="btn btn-primary" onClick={() => setModal('new')}>+ Add Expense</button>
                </div>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                <select
                    className="field"
                    style={{ width: 180 }}
                    value={catFilter}
                    onChange={e => setCat(e.target.value)}
                >
                    <option value="">All categories</option>
                    {cats.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input type="date" className="field" style={{ width: 150 }} value={from} onChange={e => setFrom(e.target.value)} placeholder="From" />
                <input type="date" className="field" style={{ width: 150 }} value={to} onChange={e => setTo(e.target.value)} placeholder="To" />
                {(catFilter || from || to) && (
                    <button className="btn btn-ghost btn-sm" onClick={() => { setCat(''); setFrom(''); setTo(''); }}>Clear filters</button>
                )}
            </div>

            {/* Summary bar */}
            {expenses.length > 0 && (
                <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                    <div className="stat-card green" style={{ minWidth: 160 }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>Page Total</span>
                        <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: 6 }}>{fmt(pageTotal)}</div>
                    </div>
                    <div className="stat-card indigo" style={{ minWidth: 120 }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>Records</span>
                        <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: 6 }}>{data?.total ?? expenses.length}</div>
                    </div>
                </div>
            )}

            {isLoading ? (
                <div style={{ display: 'flex', gap: 6, padding: 24 }}>
                    {[0,1,2].map(i => <span key={i} className="loading-dot" style={{ animationDelay: `${i*0.2}s` }} />)}
                </div>
            ) : expenses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)' }}>
                    No expenses recorded yet.
                    <br />
                    <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setModal('new')}>Add first expense</button>
                </div>
            ) : (
                <div className="card" style={{ overflow: 'hidden' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Date</th><th>Category</th><th>Description</th>
                                <th>Method</th><th>Reference</th>
                                <th style={{ textAlign: 'right' }}>Amount</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {expenses.map(exp => (
                                <tr key={exp.id}>
                                    <td style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>{exp.expense_date}</td>
                                    <td style={{ fontWeight: 600 }}>{exp.category}</td>
                                    <td style={{ color: 'var(--text-2)' }}>{exp.description || '—'}</td>
                                    <td>
                                        <span className="badge badge-gray">{PM_LABEL[exp.payment_method] ?? exp.payment_method}</span>
                                    </td>
                                    <td style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>{exp.reference || '—'}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--red)' }}>{fmt(exp.amount)}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                            <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                                                onClick={() => setModal(exp)}>Edit</button>
                                            <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '0.8rem', color: 'var(--red)' }}
                                                onClick={() => setDelId(exp.id)}>Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {data?.last_page > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, fontSize: '0.875rem', color: 'var(--text-3)' }}>
                    <span>Page {data.current_page} of {data.last_page} · {data.total} records</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                        <button className="btn btn-ghost btn-sm" disabled={page >= data.last_page} onClick={() => setPage(p => p + 1)}>Next →</button>
                    </div>
                </div>
            )}

            {modal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
                    <div className="modal-box" style={{ maxWidth: 560, margin: '0 16px' }}>
                        <div style={{ padding: '20px 24px 0', fontWeight: 700, fontSize: '1rem', marginBottom: 20 }}>
                            {modal === 'new' ? 'Add Expense' : 'Edit Expense'}
                        </div>
                        <div style={{ padding: '0 24px 24px' }}>
                            <ExpenseForm
                                categories={cats}
                                initial={modal === 'new' ? undefined : {
                                    category:       modal.category,
                                    description:    modal.description ?? '',
                                    amount:         modal.amount,
                                    expense_date:   modal.expense_date,
                                    payment_method: modal.payment_method,
                                    reference:      modal.reference ?? '',
                                    notes:          modal.notes ?? '',
                                }}
                                onSave={(d) => modal === 'new'
                                    ? createMut.mutate(d)
                                    : updateMut.mutate({ id: modal.id, ...d })
                                }
                                onCancel={() => setModal(null)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {importOpen && (
                <ImportModal onClose={() => setImport(false)} onDone={() => { invalidate(); }} />
            )}

            {delId && (
                <div className="modal-overlay">
                    <div className="modal-box" style={{ maxWidth: 400, margin: '0 16px', padding: 28 }}>
                        <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Delete expense?</h3>
                        <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginBottom: 20 }}>This cannot be undone.</p>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button className="btn btn-ghost" onClick={() => setDelId(null)}>Cancel</button>
                            <button className="btn btn-primary" style={{ background: 'var(--red)' }}
                                onClick={() => deleteMut.mutate(delId)} disabled={deleteMut.isPending}>
                                {deleteMut.isPending ? 'Deleting…' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
