import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import Layout from '../../components/Layout';
import api from '../../api/client';
import { useCurrency } from '../../hooks/useCurrency';
import { useToast } from '../../context/ToastContext';

const emptyCart = () => [];

function addToCart(cart, product) {
    const existing = cart.find(i => i.product_id === product.id);
    if (existing) {
        return cart.map(i =>
            i.product_id === product.id
                ? { ...i, quantity: i.quantity + 1 }
                : i
        );
    }
    return [...cart, {
        product_id:  product.id,
        name:        product.name,
        unit:        product.unit,
        unit_price:  product.selling_price,
        quantity:    1,
        discount:    0,
        stock:       product.stock,
    }];
}

function removeFromCart(cart, productId) {
    return cart.filter(i => i.product_id !== productId);
}

function updateCartItem(cart, productId, key, value) {
    return cart.map(i =>
        i.product_id === productId ? { ...i, [key]: value } : i
    );
}

const CATEGORY_ALL = '__all__';

export default function POSPage() {
    const { fmt } = useCurrency();
    const { addToast } = useToast();
    const [cart, setCart]           = useState(emptyCart());
    const [search, setSearch]       = useState('');
    const [category, setCategory]   = useState(CATEGORY_ALL);
    const [amountPaid, setAmountPaid] = useState('');
    const [taxRate, setTaxRate]     = useState(0);
    const [discount, setDiscount]   = useState(0);
    const [receipt, setReceipt]     = useState(null);
    const [barcodeVal, setBarcodeVal] = useState('');
    const [barcodeErr, setBarcodeErr] = useState('');
    const barcodeRef = useRef(null);

    const { data: products = [], isLoading } = useQuery({
        queryKey: ['pos-products'],
        queryFn: () => api.get('/pos/products').then(r => r.data),
        staleTime: 30_000,
    });

    const { data: branding } = useQuery({
        queryKey: ['branding'],
        queryFn: () => api.get('/settings/branding').then(r => r.data),
    });

    // Sync default tax rate from settings
    useState(() => {
        if (branding?.default_tax_rate) setTaxRate(branding.default_tax_rate);
    });

    const categories = useMemo(() => {
        const cats = [...new Set(products.map(p => p.category).filter(Boolean))].sort();
        return [CATEGORY_ALL, ...cats];
    }, [products]);

    const visible = useMemo(() => products.filter(p => {
        const matchCat = category === CATEGORY_ALL || p.category === category;
        const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku ?? '').toLowerCase().includes(search.toLowerCase());
        return matchCat && matchSearch;
    }), [products, category, search]);

    const subtotal = cart.reduce((s, i) => s + Math.max(0, i.quantity * i.unit_price - i.discount), 0);
    const taxAmt   = (subtotal - discount) * (taxRate / 100);
    const total    = Math.max(0, subtotal - discount + taxAmt);
    const change   = Math.max(0, (parseFloat(amountPaid) || 0) - total);

    const handleBarcodeScan = async (e) => {
        if (e.key !== 'Enter') return;
        const q = barcodeVal.trim();
        if (!q) return;
        setBarcodeErr('');
        try {
            const res = await api.get('/barcode/lookup', { params: { q } });
            const found = res.data;
            const product = products.find(p => p.id === found.id);
            if (!product) {
                setBarcodeErr('Product not in POS list or inactive');
            } else if (product.stock <= 0) {
                setBarcodeErr(`${product.name} is out of stock`);
            } else {
                setCart(addToCart(cart, product));
            }
        } catch {
            setBarcodeErr('No product found for that barcode/SKU');
        }
        setBarcodeVal('');
    };

    const saleMutation = useMutation({
        mutationFn: (payload) => api.post('/pos/sale', payload).then(r => r.data),
        onSuccess: (sale) => {
            setReceipt({ sale, change });
            setCart(emptyCart());
            setAmountPaid('');
            setDiscount(0);
            addToast('Sale complete — ' + sale.invoice_number);
        },
    });

    const handlePrintReceipt = (sale) => {
        const w = window.open('', '_blank', 'width=400,height=600');
        w.document.write(`<!DOCTYPE html><html><head><title>Receipt</title><style>
            body{font-family:monospace;font-size:13px;padding:16px;max-width:300px}
            h2{text-align:center;font-size:15px;margin:0 0 4px}
            .center{text-align:center}.hr{border:none;border-top:1px dashed #999;margin:8px 0}
            .row{display:flex;justify-content:space-between}
            .total{font-weight:bold;font-size:15px}
        </style></head><body>
        <h2>${branding?.company_name ?? 'Receipt'}</h2>
        <div class="center" style="color:#666;margin-bottom:8px">${new Date().toLocaleString()}</div>
        <div class="center">Invoice: ${sale.invoice_number}</div>
        <hr class="hr"/>
        ${(sale.items ?? []).map(it => `<div class="row"><span>${it.product?.name} x${it.quantity}</span><span>${it.total?.toFixed(2)}</span></div>`).join('')}
        <hr class="hr"/>
        <div class="row total"><span>Total</span><span>${parseFloat(sale.total).toFixed(2)}</span></div>
        <div class="row"><span>Paid</span><span>${parseFloat(sale.amount_paid).toFixed(2)}</span></div>
        ${(parseFloat(sale.amount_paid) - parseFloat(sale.total)) > 0.001 ? `<div class="row"><span>Change</span><span>${(parseFloat(sale.amount_paid) - parseFloat(sale.total)).toFixed(2)}</span></div>` : ''}
        <hr class="hr"/>
        <div class="center" style="margin-top:8px">Thank you!</div>
        </body></html>`);
        w.document.close();
        setTimeout(() => w.print(), 250);
    };

    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'F2') {
                e.preventDefault();
                if (receipt) return;
                if (cart.length) handleCharge();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [cart, receipt]);

    const handleCharge = () => {
        if (!cart.length) return;
        const paid = parseFloat(amountPaid) || 0;
        saleMutation.mutate({
            sale_date:   new Date().toISOString().slice(0, 10),
            tax_rate:    taxRate,
            discount:    discount,
            amount_paid: Math.min(paid, total),
            items: cart.map(i => ({
                product_id: i.product_id,
                quantity:   i.quantity,
                unit_price: i.unit_price,
                discount:   i.discount || 0,
            })),
        });
    };

    // ── Receipt overlay ──────────────────────────────────────────────────────
    if (receipt) {
        return (
            <Layout>
                <div style={{ maxWidth: 420, margin: '40px auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div className="card" style={{ padding: '28px 32px', textAlign: 'center' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>✓</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--green)', marginBottom: 4 }}>Sale Complete</div>
                        <div style={{ color: 'var(--text-3)', fontSize: '0.875rem', marginBottom: 20 }}>
                            Invoice: <code style={{ color: 'var(--indigo)' }}>{receipt.sale.invoice_number}</code>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                            {(receipt.sale.items ?? []).map(item => (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                    <span>{item.product?.name} × {item.quantity}</span>
                                    <span>{fmt(item.total)}</span>
                                </div>
                            ))}
                        </div>
                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 700 }}>
                                <span>Total</span><span>{fmt(receipt.sale.total)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-2)', fontSize: '0.875rem' }}>
                                <span>Paid</span><span style={{ color: 'var(--green)' }}>{fmt(receipt.sale.amount_paid)}</span>
                            </div>
                            {receipt.change > 0.001 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--indigo)', fontSize: '1rem' }}>
                                    <span>Change</span><span>{fmt(receipt.change)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button className="btn btn-ghost" style={{ flex: 1, padding: '12px 0', fontSize: '0.9375rem' }} onClick={() => handlePrintReceipt(receipt.sale)}>
                            🖨 Print Receipt
                        </button>
                        <button className="btn btn-primary" style={{ flex: 1, padding: '12px 0', fontSize: '0.9375rem' }} onClick={() => setReceipt(null)}>
                            New Sale
                        </button>
                    </div>
                </div>
            </Layout>
        );
    }

    // ── Main POS layout ──────────────────────────────────────────────────────
    return (
        <Layout>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, height: 'calc(100vh - 80px)' }}>

                {/* LEFT — Product grid */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
                    {/* Barcode scan row */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <input
                                ref={barcodeRef}
                                className="field"
                                placeholder="🔍 Scan barcode or type SKU + Enter"
                                value={barcodeVal}
                                onChange={e => { setBarcodeVal(e.target.value); setBarcodeErr(''); }}
                                onKeyDown={handleBarcodeScan}
                                style={{ paddingLeft: 12, fontSize: '0.875rem' }}
                                autoFocus
                            />
                        </div>
                    </div>
                    {barcodeErr && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--red)', padding: '4px 2px' }}>{barcodeErr}</div>
                    )}
                    {/* Search + category */}
                    <div style={{ display: 'flex', gap: 10 }}>
                        <input
                            className="field"
                            placeholder="Search product or SKU…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ flex: 1 }}
                        />
                        <select className="field" style={{ width: 160 }} value={category} onChange={e => setCategory(e.target.value)}>
                            {categories.map(c => (
                                <option key={c} value={c}>{c === CATEGORY_ALL ? 'All categories' : c}</option>
                            ))}
                        </select>
                    </div>

                    {isLoading ? (
                        <div style={{ display: 'flex', gap: 6, padding: 20 }}>
                            {[0,1,2].map(i => <span key={i} className="loading-dot" style={{ animationDelay: `${i*0.2}s` }} />)}
                        </div>
                    ) : (
                        <div style={{ overflowY: 'auto', flex: 1 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                                {visible.map(p => {
                                    const inCart  = cart.find(i => i.product_id === p.id);
                                    const outOfStock = p.stock <= 0;
                                    return (
                                        <button
                                            key={p.id}
                                            onClick={() => !outOfStock && setCart(addToCart(cart, p))}
                                            style={{
                                                background: inCart ? 'var(--indigo-light)' : 'var(--surface-1)',
                                                border: `1px solid ${inCart ? 'var(--indigo)' : 'var(--border)'}`,
                                                borderRadius: 10,
                                                padding: '12px 10px',
                                                cursor: outOfStock ? 'not-allowed' : 'pointer',
                                                opacity: outOfStock ? 0.45 : 1,
                                                textAlign: 'left',
                                                transition: 'border-color .12s, background .12s',
                                            }}
                                        >
                                            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-1)', marginBottom: 4, lineHeight: 1.3 }}>{p.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 6 }}>{p.sku ?? p.category}</div>
                                            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--indigo)' }}>{fmt(p.selling_price)}</div>
                                            <div style={{ fontSize: '0.6875rem', color: outOfStock ? 'var(--red)' : 'var(--text-3)', marginTop: 2 }}>
                                                {outOfStock ? 'Out of stock' : `${p.stock} ${p.unit} left`}
                                            </div>
                                            {inCart && (
                                                <div style={{ marginTop: 6, fontSize: '0.75rem', fontWeight: 700, color: 'var(--indigo)' }}>
                                                    In cart: {inCart.quantity}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                                {visible.length === 0 && (
                                    <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-3)', padding: '40px 0' }}>No products match</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT — Cart + checkout */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0, background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                    {/* Cart header */}
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Cart</span>
                        {cart.length > 0 && (
                            <button onClick={() => setCart(emptyCart())} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--red)' }}>Clear</button>
                        )}
                    </div>

                    {/* Cart items */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                        {cart.length === 0 ? (
                            <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '40px 0', fontSize: '0.875rem' }}>
                                Tap a product to add it
                            </div>
                        ) : cart.map(item => {
                            const lineTotal = Math.max(0, item.quantity * item.unit_price - item.discount);
                            return (
                                <div key={item.product_id} style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{fmt(item.unit_price)} / {item.unit}</div>
                                        </div>
                                        <button onClick={() => setCart(removeFromCart(cart, item.product_id))}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: '1.1rem', padding: '0 2px' }}>×</button>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                        <button onClick={() => setCart(updateCartItem(cart, item.product_id, 'quantity', Math.max(1, item.quantity - 1)))}
                                            style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', cursor: 'pointer', fontWeight: 700 }}>−</button>
                                        <input type="number" min="1" step="0.001"
                                            value={item.quantity}
                                            onChange={e => setCart(updateCartItem(cart, item.product_id, 'quantity', parseFloat(e.target.value) || 1))}
                                            style={{ width: 52, textAlign: 'center', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 6px', fontSize: '0.875rem', background: 'var(--surface-2)' }}
                                        />
                                        <button onClick={() => setCart(updateCartItem(cart, item.product_id, 'quantity', item.quantity + 1))}
                                            style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', cursor: 'pointer', fontWeight: 700 }}>+</button>
                                        <span style={{ marginLeft: 'auto', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--indigo)' }}>{fmt(lineTotal)}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Totals + payment */}
                    <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 3, display: 'block' }}>Discount</label>
                                <input type="number" min="0" step="0.01" className="field"
                                    value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 3, display: 'block' }}>Tax %</label>
                                <input type="number" min="0" max="100" step="0.01" className="field"
                                    value={taxRate} onChange={e => setTaxRate(parseFloat(e.target.value) || 0)} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.875rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-2)' }}>
                                <span>Subtotal</span><span>{fmt(subtotal)}</span>
                            </div>
                            {discount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--red)' }}>
                                    <span>Discount</span><span>−{fmt(discount)}</span>
                                </div>
                            )}
                            {taxRate > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-2)' }}>
                                    <span>Tax ({taxRate}%)</span><span>{fmt(taxAmt)}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.125rem', color: 'var(--text-1)', borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
                                <span>Total</span><span style={{ color: 'var(--indigo)' }}>{fmt(total)}</span>
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 3, display: 'block' }}>Amount Received</label>
                            <input type="number" min="0" step="0.01" className="field"
                                placeholder={fmt(total)}
                                value={amountPaid}
                                onChange={e => setAmountPaid(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleCharge(); }}
                                style={{ fontSize: '1.125rem', fontWeight: 600 }}
                            />
                        </div>

                        {parseFloat(amountPaid) > 0 && change > 0.001 && (
                            <div style={{ textAlign: 'center', fontSize: '1rem', fontWeight: 700, color: 'var(--green)' }}>
                                Change: {fmt(change)}
                            </div>
                        )}

                        {saleMutation.error && (
                            <div className="alert-error" style={{ fontSize: '0.8125rem' }}>
                                {saleMutation.error.response?.data?.message ?? 'Error processing sale'}
                            </div>
                        )}

                        <button
                            className="btn btn-primary"
                            style={{ padding: '14px 0', fontSize: '1rem', fontWeight: 700, borderRadius: 8, marginTop: 4 }}
                            onClick={handleCharge}
                            disabled={!cart.length || saleMutation.isPending}
                        >
                            {saleMutation.isPending ? 'Processing…' : `Charge ${fmt(total)}`}
                        </button>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
