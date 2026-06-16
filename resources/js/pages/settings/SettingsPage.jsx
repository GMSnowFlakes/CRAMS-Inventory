import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client';
import Layout from '../../components/Layout';
import { usePermission } from '../../hooks/usePermission';
import { useToast } from '../../context/ToastContext';

const CURRENCY_SYMBOLS = {
    USD: '$', EUR: '€', GBP: '£', JPY: '¥', CNY: '¥', KRW: '₩',
    PHP: '₱', INR: '₹', THB: '฿', VND: '₫', IDR: 'Rp', MYR: 'RM',
    SGD: 'S$', HKD: 'HK$', TWD: 'NT$', AUD: 'A$', CAD: 'C$', NZD: 'NZ$',
    CHF: 'Fr', SEK: 'kr', NOK: 'kr', DKK: 'kr', BRL: 'R$', MXN: 'MX$',
    ARS: '$', CLP: '$', COP: '$', PEN: 'S/', AED: 'د.إ', SAR: '﷼',
    EGP: '£', ZAR: 'R', NGN: '₦', KES: 'KSh', GHS: '₵', PKR: '₨',
    BDT: '৳', LKR: '₨', NPR: '₨', MMK: 'K', KHR: '₭', LAK: '₭',
    BND: 'B$', MOP: 'P', RUB: '₽', UAH: '₴', PLN: 'zł', CZK: 'Kč',
    HUF: 'Ft', RON: 'lei', BGN: 'лв', HRK: 'kn', TRY: '₺', ILS: '₪',
};

const TIER_BADGE = {
    starter:    'badge-gray',
    standard:   'badge-indigo',
    pro:        'badge-violet',
    enterprise: 'badge-sky',
};

export default function SettingsPage() {
    const qc          = useQueryClient();
    const { can }     = usePermission();
    const { addToast } = useToast();
    const fileRef     = useRef();
    const [dragOver, setDragOver] = useState(false);
    const [companyName, setCompanyName]       = useState('');
    const [nameEditing, setNameEditing]       = useState(false);
    const [currencySymbol, setCurrencySymbol] = useState('');
    const [currencyCode, setCurrencyCode]     = useState('');
    const [currencyEditing, setCurrencyEditing] = useState(false);
    const [taxRate, setTaxRate]               = useState('');
    const [taxEditing, setTaxEditing]         = useState(false);

    const branding = useQuery({
        queryKey: ['branding'],
        queryFn:  () => client.get('/settings/branding').then(r => r.data),
        onSuccess: d => {
            if (!nameEditing)     setCompanyName(d.company_name ?? '');
            if (!currencyEditing) { setCurrencySymbol(d.currency_symbol ?? '$'); setCurrencyCode(d.currency_code ?? 'USD'); }
            if (!taxEditing)      setTaxRate(d.default_tax_rate ?? '0');
        },
    });

    const license = useQuery({
        queryKey: ['license-status'],
        queryFn:  () => client.get('/license/status').then(r => r.data),
    });

    const uploadLogo = useMutation({
        mutationFn: (file) => {
            const fd = new FormData();
            fd.append('logo', file);
            return client.post('/settings/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['branding'] }); addToast('Logo uploaded'); },
    });

    const removeLogo = useMutation({
        mutationFn: () => client.delete('/settings/logo'),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['branding'] }); addToast('Logo removed', 'error'); },
    });

    const saveName = useMutation({
        mutationFn: () => client.post('/settings', { company_name: companyName }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['branding'] }); setNameEditing(false); addToast('Company name saved'); },
    });

    const saveCurrency = useMutation({
        mutationFn: () => client.post('/settings', { currency_symbol: currencySymbol, currency_code: currencyCode.toUpperCase() }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['branding'] }); setCurrencyEditing(false); addToast('Currency saved'); },
    });

    const saveTax = useMutation({
        mutationFn: () => client.post('/settings', { default_tax_rate: taxRate }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['branding'] }); setTaxEditing(false); addToast('Tax rate saved'); },
    });

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) uploadLogo.mutate(file);
    };

    const handleFile = (e) => {
        const file = e.target.files[0];
        if (file) uploadLogo.mutate(file);
    };

    const isAdmin = can('manageUsers');

    return (
        <Layout>
            <div className="page-header">
                <h1 className="page-title">Settings</h1>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 900 }}>

                {/* ── Branding ── */}
                <div className="card" style={{ padding: 24 }}>
                    <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>Branding</h2>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-3)', marginBottom: 20 }}>
                        Customize the logo and company name shown in the sidebar.
                    </p>

                    {/* Logo upload */}
                    <p className="form-label" style={{ marginBottom: 8 }}>Company logo</p>
                    {branding.data?.logo_url ? (
                        <div style={{ marginBottom: 16 }}>
                            <img
                                src={branding.data.logo_url}
                                alt="Company logo"
                                style={{ maxHeight: 56, maxWidth: 200, objectFit: 'contain', borderRadius: 6, border: '1px solid var(--border)', padding: 8, background: 'var(--surface-2)' }}
                            />
                            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                                {isAdmin && (
                                    <>
                                        <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current.click()}>Replace</button>
                                        <button className="btn btn-danger btn-sm" onClick={() => removeLogo.mutate()} disabled={removeLogo.isPending}>Remove</button>
                                    </>
                                )}
                            </div>
                        </div>
                    ) : (
                        isAdmin && (
                            <div
                                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={handleDrop}
                                onClick={() => fileRef.current.click()}
                                style={{
                                    border: `2px dashed ${dragOver ? 'var(--indigo)' : 'var(--border)'}`,
                                    borderRadius: 'var(--radius-sm)',
                                    padding: '28px 20px',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    background: dragOver ? 'var(--indigo-light)' : 'var(--surface-2)',
                                    transition: 'all .15s',
                                    marginBottom: 16,
                                }}
                            >
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>
                                    {uploadLogo.isPending ? 'Uploading…' : 'Drag & drop or click to upload'}
                                </p>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 4 }}>PNG, JPG, SVG · max 2 MB</p>
                            </div>
                        )
                    )}

                    <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml" style={{ display: 'none' }} onChange={handleFile} />

                    {uploadLogo.isError && (
                        <p style={{ fontSize: '0.8125rem', color: 'var(--red)', marginBottom: 12 }}>
                            {uploadLogo.error?.response?.data?.message ?? 'Upload failed.'}
                        </p>
                    )}

                    {/* Company name */}
                    <div style={{ marginTop: 4 }}>
                        <p className="form-label" style={{ marginBottom: 6 }}>Company name</p>
                        {isAdmin ? (
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input
                                    className="field"
                                    style={{ flex: 1 }}
                                    value={companyName}
                                    onChange={e => { setCompanyName(e.target.value); setNameEditing(true); }}
                                    placeholder="e.g. Acme Corp"
                                />
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() => saveName.mutate()}
                                    disabled={!nameEditing || saveName.isPending}
                                >
                                    {saveName.isPending ? 'Saving…' : 'Save'}
                                </button>
                            </div>
                        ) : (
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-1)' }}>{branding.data?.company_name}</p>
                        )}
                    </div>

                    {/* Currency */}
                    <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                        <p className="form-label" style={{ marginBottom: 2 }}>Currency</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 10 }}>
                            Symbol appears on all monetary values. Code is informational (e.g. USD, EUR, PHP).
                        </p>
                        {isAdmin ? (
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input
                                    className="field"
                                    style={{ width: 64 }}
                                    value={currencySymbol}
                                    onChange={e => { setCurrencySymbol(e.target.value); setCurrencyEditing(true); }}
                                    placeholder="$"
                                    maxLength={8}
                                    title="Symbol"
                                />
                                <input
                                    list="currency-codes"
                                    className="field"
                                    style={{ width: 90 }}
                                    value={currencyCode}
                                    onChange={e => {
                                        const code = e.target.value.toUpperCase();
                                        setCurrencyCode(code);
                                        if (CURRENCY_SYMBOLS[code]) setCurrencySymbol(CURRENCY_SYMBOLS[code]);
                                        setCurrencyEditing(true);
                                    }}
                                    placeholder="USD"
                                    maxLength={3}
                                    title="Code"
                                />
                                <datalist id="currency-codes">
                                    {Object.entries(CURRENCY_SYMBOLS).map(([code, sym]) => (
                                        <option key={code} value={code}>{sym} — {code}</option>
                                    ))}
                                </datalist>
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() => saveCurrency.mutate()}
                                    disabled={!currencyEditing || saveCurrency.isPending}
                                >
                                    {saveCurrency.isPending ? 'Saving…' : 'Save'}
                                </button>
                            </div>
                        ) : (
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-1)' }}>
                                {branding.data?.currency_symbol} &nbsp; <span style={{ color: 'var(--text-3)' }}>{branding.data?.currency_code}</span>
                            </p>
                        )}
                    </div>
                </div>

                {/* ── Tax Rate ── */}
                <div className="card" style={{ padding: 24 }}>
                    <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>Default Tax Rate</h2>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-3)', marginBottom: 20 }}>
                        Pre-filled tax rate (%) on new sales. Can be overridden per sale.
                    </p>
                    {isAdmin ? (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input
                                type="number" min="0" max="100" step="0.01"
                                className="field"
                                style={{ width: 100 }}
                                value={taxRate}
                                onChange={e => { setTaxRate(e.target.value); setTaxEditing(true); }}
                            />
                            <span style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>%</span>
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={() => saveTax.mutate()}
                                disabled={!taxEditing || saveTax.isPending}
                            >
                                {saveTax.isPending ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    ) : (
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-1)' }}>{taxRate}%</p>
                    )}
                </div>

                {/* ── License ── */}
                <div className="card" style={{ padding: 24 }}>
                    <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>License</h2>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-3)', marginBottom: 20 }}>
                        Current license details for this installation.
                    </p>

                    {license.isLoading ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                            {[0,1,2].map(i => <span key={i} className="loading-dot" style={{ animationDelay: `${i*0.2}s` }} />)}
                        </div>
                    ) : license.data?.valid ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.8125rem', color: 'var(--text-3)' }}>Plan</span>
                                <span className={`badge ${TIER_BADGE[license.data.tier] ?? 'badge-gray'}`} style={{ textTransform: 'capitalize' }}>
                                    {license.data.tier}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '0.8125rem', color: 'var(--text-3)' }}>Max users</span>
                                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-1)' }}>
                                    {license.data.max_users === 0 ? 'Unlimited' : license.data.max_users}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '0.8125rem', color: 'var(--text-3)' }}>Expires</span>
                                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: license.data.expiring_soon ? 'var(--amber)' : 'var(--text-1)' }}>
                                    {license.data.expires_at}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '0.8125rem', color: 'var(--text-3)' }}>Days remaining</span>
                                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: license.data.days_remaining <= 30 ? 'var(--amber)' : 'var(--green)' }}>
                                    {license.data.days_remaining}d
                                </span>
                            </div>
                            {license.data.expiring_soon && (
                                <div style={{
                                    padding: '10px 12px',
                                    background: 'var(--amber-light)',
                                    borderRadius: 'var(--radius-sm)',
                                    borderLeft: '3px solid var(--amber)',
                                    fontSize: '0.8125rem',
                                    color: '#92400e',
                                }}>
                                    License expiring soon. Contact your vendor for a renewal key.
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="alert-error">License is not active or has expired.</div>
                    )}
                </div>

            </div>
        </Layout>
    );
}
