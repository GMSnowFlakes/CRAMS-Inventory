import { useRef, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client';
import Layout from '../../components/Layout';
import ProductForm from './ProductForm';
import { useCurrency } from '../../hooks/useCurrency';
import { usePermission } from '../../hooks/usePermission';
import BarcodeModal from './BarcodeModal';
import { useToast } from '../../context/ToastContext';

const TEMPLATE_CSV = `Name,SKU,Category,Unit,Cost Price,Selling Price,Reorder Level
Example Product,SKU-001,General,pcs,10.00,15.00,5
Another Item,,Hardware,box,25.00,40.00,2
`;

function ImportModal({ onClose, onSuccess }) {
    const fileRef = useRef(null);
    const [result, setResult] = useState(null);
    const [dragOver, setDragOver] = useState(false);

    const importMutation = useMutation({
        mutationFn: (file) => {
            const fd = new FormData();
            fd.append('file', file);
            return client.post('/products/bulk-import', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            }).then(r => r.data);
        },
        onSuccess: (data) => setResult(data),
    });

    const handleFile = (file) => {
        if (!file) return;
        importMutation.mutate(file);
    };

    const downloadTemplate = () => {
        const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = 'products_template.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
    };

    return (
        <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box" style={{ maxWidth: 540, margin: '0 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0' }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>Import Products from CSV</div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}>
                        <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                        </svg>
                    </button>
                </div>

                <div style={{ padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {!result ? (
                        <>
                            <div style={{ fontSize: '0.8125rem', color: 'var(--text-3)' }}>
                                Upload a CSV file with columns: <strong>Name</strong> (required), SKU, Category, Unit, Cost Price, Selling Price, Reorder Level
                            </div>

                            <button
                                onClick={downloadTemplate}
                                className="btn btn-ghost btn-sm"
                                style={{ alignSelf: 'flex-start', fontSize: '0.8125rem' }}
                            >
                                ↓ Download Template CSV
                            </button>

                            <div
                                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={handleDrop}
                                onClick={() => fileRef.current?.click()}
                                style={{
                                    border: `2px dashed ${dragOver ? 'var(--indigo)' : 'var(--border)'}`,
                                    borderRadius: 8,
                                    padding: '32px 24px',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    background: dragOver ? 'var(--indigo-light)' : 'var(--surface-2)',
                                    transition: 'all 0.15s',
                                }}
                            >
                                <div style={{ fontSize: '2rem', marginBottom: 8 }}>📂</div>
                                <div style={{ fontWeight: 600, marginBottom: 4 }}>Drop CSV here or click to browse</div>
                                <div style={{ fontSize: '0.8125rem', color: 'var(--text-3)' }}>Max 2 MB · .csv files only</div>
                            </div>

                            <input
                                ref={fileRef}
                                type="file"
                                accept=".csv,text/csv"
                                style={{ display: 'none' }}
                                onChange={e => handleFile(e.target.files?.[0])}
                            />

                            {importMutation.isPending && (
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: 'var(--text-3)', fontSize: '0.875rem' }}>
                                    {[0,1,2].map(i => <span key={i} className="loading-dot" style={{ animationDelay: `${i * 0.2}s` }} />)}
                                    Importing…
                                </div>
                            )}

                            {importMutation.isError && (
                                <div style={{ background: 'var(--red-light)', color: 'var(--red)', padding: '10px 14px', borderRadius: 6, fontSize: '0.875rem' }}>
                                    {importMutation.error?.response?.data?.message ?? 'Import failed. Check your file format.'}
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <div className="card" style={{ padding: '12px 16px', background: 'var(--green-light)' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--green)', marginBottom: 4 }}>Imported</div>
                                    <div style={{ fontWeight: 700, fontSize: '1.5rem', color: 'var(--green)' }}>{result.imported}</div>
                                </div>
                                <div className="card" style={{ padding: '12px 16px', background: result.skipped > 0 ? 'var(--amber-light)' : 'var(--surface-2)' }}>
                                    <div style={{ fontSize: '0.75rem', color: result.skipped > 0 ? 'var(--amber)' : 'var(--text-3)', marginBottom: 4 }}>Skipped</div>
                                    <div style={{ fontWeight: 700, fontSize: '1.5rem', color: result.skipped > 0 ? 'var(--amber)' : 'var(--text-3)' }}>{result.skipped}</div>
                                </div>
                            </div>

                            {result.errors?.length > 0 && (
                                <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 14px', maxHeight: 140, overflowY: 'auto' }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: 6, color: 'var(--text-2)' }}>Errors</div>
                                    {result.errors.map((e, i) => (
                                        <div key={i} style={{ fontSize: '0.75rem', color: 'var(--red)', marginBottom: 2 }}>{e}</div>
                                    ))}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                {result.imported > 0 && (
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => { onSuccess(); onClose(); }}
                                    >
                                        Done
                                    </button>
                                )}
                                <button className="btn btn-ghost" onClick={() => setResult(null)}>Import Another</button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ProductsPage() {
    const qc = useQueryClient();
    const { can } = usePermission();
    const { fmt } = useCurrency();
    const { addToast } = useToast();
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [barcodeProduct, setBarcodeProduct] = useState(null);
    const [importOpen, setImportOpen] = useState(false);

    useEffect(() => { setPage(1); }, [search]);

    const { data, isLoading } = useQuery({
        queryKey: ['products', search, page],
        queryFn: () => client.get('/products', { params: { search, page } }).then(r => r.data),
    });

    const destroy = useMutation({
        mutationFn: (id) => client.delete(`/products/${id}`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); addToast('Product deleted', 'error'); },
    });

    const openCreate = () => { setEditing(null); setFormOpen(true); };
    const openEdit   = (p) => { setEditing(p); setFormOpen(true); };
    const closeForm  = () => { setFormOpen(false); setEditing(null); };

    return (
        <Layout>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Products</h1>
                    <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', marginTop: 2 }}>
                        {data?.total ?? data?.data?.length ?? 0} items
                    </p>
                </div>
                {can('manageProducts') && (
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            onClick={() => setImportOpen(true)}
                            className="btn btn-ghost"
                            style={{ fontSize: '0.875rem' }}
                        >
                            ↑ Import CSV
                        </button>
                        <button onClick={openCreate} className="btn btn-primary">
                            <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/></svg>
                            Add Product
                        </button>
                    </div>
                )}
            </div>

            <div style={{ marginBottom: 16 }}>
                <div style={{ position: 'relative', maxWidth: 320 }}>
                    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"
                        style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }}>
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
                    </svg>
                    <input
                        type="text"
                        placeholder="Search by name or SKU…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="field"
                        style={{ paddingLeft: 34 }}
                    />
                </div>
            </div>

            {isLoading ? (
                <div style={{ display: 'flex', gap: 6, padding: 24 }}>
                    {[0,1,2].map(i => <span key={i} className="loading-dot" style={{ animationDelay: `${i * 0.2}s` }} />)}
                </div>
            ) : (
                <div className="card" style={{ overflow: 'hidden' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>SKU</th>
                                <th>Barcode</th>
                                <th>Category</th>
                                <th>Cost</th>
                                <th>Selling</th>
                                <th>Stock</th>
                                <th>Status</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {data?.data?.map(p => {
                                const qty = p.stock_level?.quantity ?? 0;
                                const lowStock = qty <= (p.reorder_level ?? 0);
                                return (
                                    <tr key={p.id}>
                                        <td style={{ fontWeight: 500 }}>{p.name}</td>
                                        <td>
                                            <code style={{ background: 'var(--surface-2)', padding: '2px 6px', borderRadius: 4, fontSize: '0.75rem', color: 'var(--text-2)' }}>
                                                {p.sku}
                                            </code>
                                        </td>
                                        <td>
                                            {p.barcode ? (
                                                <button
                                                    onClick={() => setBarcodeProduct(p)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                                >
                                                    <code style={{ background: 'var(--indigo-light)', padding: '2px 6px', borderRadius: 4, fontSize: '0.75rem', color: 'var(--indigo)' }}>
                                                        {p.barcode}
                                                    </code>
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => setBarcodeProduct(p)}
                                                    className="btn btn-ghost btn-sm"
                                                    style={{ fontSize: '0.75rem' }}
                                                >Generate</button>
                                            )}
                                        </td>
                                        <td style={{ color: 'var(--text-2)' }}>{p.category ?? '—'}</td>
                                        <td style={{ color: 'var(--text-2)' }}>{fmt(p.cost_price)}</td>
                                        <td style={{ fontWeight: 500 }}>{fmt(p.selling_price)}</td>
                                        <td>
                                            <span style={{
                                                fontWeight: 600,
                                                color: lowStock ? 'var(--red)' : 'var(--green)',
                                            }}>
                                                {qty}
                                            </span>
                                            {lowStock && qty > 0 && (
                                                <span className="badge badge-amber" style={{ marginLeft: 6 }}>Low</span>
                                            )}
                                            {qty === 0 && (
                                                <span className="badge badge-red" style={{ marginLeft: 6 }}>Out</span>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`badge ${p.is_active ? 'badge-green' : 'badge-gray'}`}>
                                                {p.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                                {can('manageProducts') && (
                                                    <button
                                                        onClick={() => openEdit(p)}
                                                        className="btn btn-ghost btn-sm"
                                                    >Edit</button>
                                                )}
                                                {can('manageProducts') && (
                                                    <button
                                                        onClick={() => { if (confirm(`Delete "${p.name}"?`)) destroy.mutate(p.id); }}
                                                        className="btn btn-sm"
                                                        style={{ background: 'var(--red-light)', color: 'var(--red)', border: 'none' }}
                                                    >Delete</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {!data?.data?.length && (
                                <tr>
                                    <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '40px 16px' }}>
                                        No products found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {data?.last_page > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, fontSize: '0.875rem', color: 'var(--text-3)' }}>
                    <span>Page {data.current_page} of {data.last_page} · {data.total} items</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                        <button className="btn btn-ghost btn-sm" disabled={page >= data.last_page} onClick={() => setPage(p => p + 1)}>Next →</button>
                    </div>
                </div>
            )}

            {formOpen && <ProductForm product={editing} onClose={closeForm} onSaved={() => addToast(editing ? 'Product updated' : 'Product added')} />}
            {barcodeProduct && (
                <BarcodeModal product={barcodeProduct} onClose={() => setBarcodeProduct(null)} />
            )}
            {importOpen && (
                <ImportModal
                    onClose={() => setImportOpen(false)}
                    onSuccess={() => qc.invalidateQueries({ queryKey: ['products'] })}
                />
            )}
        </Layout>
    );
}
