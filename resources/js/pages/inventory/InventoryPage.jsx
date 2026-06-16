import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import client from '../../api/client';
import Layout from '../../components/Layout';
import MovementForm from './MovementForm';

const TABS = ['Stock Levels', 'Movements'];

const TYPE_BADGE = {
    stock_in:   'badge-green',
    stock_out:  'badge-amber',
    adjustment: 'badge-indigo',
    transfer:   'badge-sky',
};

export default function InventoryPage() {
    const [tab, setTab] = useState('Stock Levels');
    const [search, setSearch] = useState('');
    const [lowStock, setLowStock] = useState(false);
    const [movementType, setMovementType] = useState('');
    const [branchId, setBranchId] = useState('');
    const [mvFrom, setMvFrom] = useState('');
    const [mvTo, setMvTo] = useState('');
    const [mvPage, setMvPage] = useState(1);
    const [formType, setFormType] = useState(null);

    useEffect(() => { setMvPage(1); }, [movementType, branchId, mvFrom, mvTo]);

    const levels = useQuery({
        queryKey: ['stock-levels', search, lowStock],
        queryFn: () => client.get('/inventory/stock-levels', { params: { search, low_stock: lowStock || undefined } }).then(r => r.data),
        enabled: tab === 'Stock Levels',
    });

    const { data: branches } = useQuery({
        queryKey: ['branches-all'],
        queryFn: () => client.get('/branches').then(r => r.data.data ?? []),
    });

    const movements = useQuery({
        queryKey: ['movements', movementType, branchId, mvFrom, mvTo, mvPage],
        queryFn: () => client.get('/inventory/movements', { params: {
            type: movementType || undefined,
            branch_id: branchId || undefined,
            from: mvFrom || undefined,
            to: mvTo || undefined,
            page: mvPage,
        }}).then(r => r.data),
        enabled: tab === 'Movements',
    });

    const exportMovements = () => {
        const params = new URLSearchParams();
        if (movementType) params.set('type', movementType);
        if (branchId) params.set('branch_id', branchId);
        if (mvFrom) params.set('from', mvFrom);
        if (mvTo) params.set('to', mvTo);
        const token = localStorage.getItem('crams_token');
        fetch(`/api/reports/export/movements?${params}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.blob())
            .then(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `movements_${new Date().toISOString().slice(0,10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
            });
    };

    return (
        <Layout>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Inventory</h1>
                    <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', marginTop: 2 }}>Stock levels &amp; movement history</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setFormType('stock_in')} className="btn btn-primary" style={{ background: 'var(--green)' }}>
                        + Stock In
                    </button>
                    <button onClick={() => setFormType('stock_out')} className="btn btn-ghost">Stock Out</button>
                    <button onClick={() => setFormType('adjustment')} className="btn btn-ghost">Adjust</button>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--border)', marginBottom: 20 }}>
                {TABS.map(t => (
                    <button key={t} onClick={() => setTab(t)} style={{
                        padding: '8px 16px',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        color: tab === t ? 'var(--indigo)' : 'var(--text-3)',
                        borderBottom: `2px solid ${tab === t ? 'var(--indigo)' : 'transparent'}`,
                        marginBottom: -2,
                        transition: 'color .12s',
                    }}>
                        {t}
                    </button>
                ))}
            </div>

            {tab === 'Stock Levels' && (
                <>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
                        <div style={{ position: 'relative' }}>
                            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"
                                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }}>
                                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
                            </svg>
                            <input type="text" placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} className="field" style={{ paddingLeft: 34, width: 280 }} />
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', color: 'var(--text-2)', cursor: 'pointer' }}>
                            <input type="checkbox" checked={lowStock} onChange={e => setLowStock(e.target.checked)} style={{ accentColor: 'var(--indigo)' }} />
                            Low stock only
                        </label>
                    </div>
                    {levels.isLoading ? (
                        <div style={{ display: 'flex', gap: 6, padding: 24 }}>{[0,1,2].map(i => <span key={i} className="loading-dot" style={{ animationDelay: `${i * 0.2}s` }} />)}</div>
                    ) : (
                        <div className="card" style={{ overflow: 'hidden' }}>
                            <table className="data-table">
                                <thead>
                                    <tr>{['Product', 'SKU', 'Category', 'On Hand', 'Reorder Level', 'Status'].map(h => <th key={h}>{h}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {levels.data?.data?.map(p => {
                                        const qty = p.stock_level?.quantity ?? 0;
                                        const low = qty <= p.reorder_level;
                                        return (
                                            <tr key={p.id}>
                                                <td style={{ fontWeight: 500 }}>{p.name}</td>
                                                <td><code style={{ background: 'var(--surface-2)', padding: '2px 6px', borderRadius: 4, fontSize: '0.75rem', color: 'var(--text-2)' }}>{p.sku}</code></td>
                                                <td style={{ color: 'var(--text-2)' }}>{p.category ?? '—'}</td>
                                                <td style={{ fontWeight: 600, color: qty === 0 ? 'var(--red)' : low ? 'var(--amber)' : 'var(--green)' }}>
                                                    {qty} <span style={{ fontWeight: 400, color: 'var(--text-3)', fontSize: '0.75rem' }}>{p.unit}</span>
                                                </td>
                                                <td style={{ color: 'var(--text-2)' }}>{p.reorder_level}</td>
                                                <td>
                                                    {qty === 0
                                                        ? <span className="badge badge-red">Out of Stock</span>
                                                        : low
                                                            ? <span className="badge badge-amber">Low Stock</span>
                                                            : <span className="badge badge-green">OK</span>
                                                    }
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {!levels.data?.data?.length && (
                                        <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '40px 16px' }}>No results</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {tab === 'Movements' && (
                <>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                        <select value={movementType} onChange={e => setMovementType(e.target.value)} className="field" style={{ width: 180 }}>
                            <option value="">All types</option>
                            <option value="stock_in">Stock In</option>
                            <option value="stock_out">Stock Out</option>
                            <option value="adjustment">Adjustment</option>
                            <option value="transfer">Transfer</option>
                        </select>
                        <select value={branchId} onChange={e => setBranchId(e.target.value)} className="field" style={{ width: 160 }}>
                            <option value="">All branches</option>
                            {(branches ?? []).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                        <input type="date" className="field" style={{ width: 150 }} value={mvFrom} onChange={e => setMvFrom(e.target.value)} placeholder="From" />
                        <input type="date" className="field" style={{ width: 150 }} value={mvTo} onChange={e => setMvTo(e.target.value)} placeholder="To" />
                        <button onClick={exportMovements} className="btn btn-ghost btn-sm" style={{ whiteSpace: 'nowrap' }}>
                            ↓ Export CSV
                        </button>
                    </div>
                    {movements.isLoading ? (
                        <div style={{ display: 'flex', gap: 6, padding: 24 }}>{[0,1,2].map(i => <span key={i} className="loading-dot" style={{ animationDelay: `${i * 0.2}s` }} />)}</div>
                    ) : (
                        <div className="card" style={{ overflow: 'hidden' }}>
                            <table className="data-table">
                                <thead>
                                    <tr>{['Date', 'Product', 'Type', 'Qty', 'Before → After', 'Reference', 'By'].map(h => <th key={h}>{h}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {movements.data?.data?.map(m => (
                                        <tr key={m.id}>
                                            <td style={{ color: 'var(--text-3)', fontSize: '0.8125rem' }}>{new Date(m.created_at).toLocaleDateString()}</td>
                                            <td style={{ fontWeight: 500 }}>{m.product?.name}</td>
                                            <td><span className={`badge ${TYPE_BADGE[m.type] ?? 'badge-gray'}`}>{m.type.replace('_', ' ')}</span></td>
                                            <td style={{ fontWeight: 600, color: m.quantity >= 0 ? 'var(--green)' : 'var(--red)' }}>
                                                {m.quantity >= 0 ? `+${m.quantity}` : m.quantity}
                                            </td>
                                            <td style={{ color: 'var(--text-2)', fontSize: '0.8125rem' }}>
                                                {m.quantity_before} → {m.quantity_after}
                                            </td>
                                            <td style={{ color: 'var(--text-2)' }}>{m.reference ?? '—'}</td>
                                            <td style={{ color: 'var(--text-2)' }}>{m.user?.name}</td>
                                        </tr>
                                    ))}
                                    {!movements.data?.data?.length && (
                                        <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '40px 16px' }}>No movements</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {movements.data?.last_page > 1 && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, fontSize: '0.875rem', color: 'var(--text-3)' }}>
                            <span>Page {movements.data.current_page} of {movements.data.last_page} · {movements.data.total} records</span>
                            <div style={{ display: 'flex', gap: 6 }}>
                                <button className="btn btn-ghost btn-sm" disabled={mvPage <= 1} onClick={() => setMvPage(p => p - 1)}>← Prev</button>
                                <button className="btn btn-ghost btn-sm" disabled={mvPage >= movements.data.last_page} onClick={() => setMvPage(p => p + 1)}>Next →</button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {formType && <MovementForm type={formType} onClose={() => setFormType(null)} />}
        </Layout>
    );
}
