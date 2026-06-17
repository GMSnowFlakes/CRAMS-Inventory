import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { usePermission } from '../hooks/usePermission';
import client from '../api/client';

const nav = [
    { to: '/dashboard',       label: 'Dashboard',       icon: '⬛' },
    { to: '/products',        label: 'Products',         icon: '📦' },
    { to: '/suppliers',       label: 'Suppliers',        icon: '🏭' },
    { to: '/customers',       label: 'Customers',        icon: '👤' },
    { to: '/sales',           label: 'Sales',            icon: '🧾' },
    { to: '/pos',             label: 'POS',              icon: '💳' },
    { to: '/expenses',        label: 'Expenses',         icon: '💸' },
    { to: '/inventory',       label: 'Inventory',        icon: '📊' },
    { to: '/purchase-orders',  label: 'Purchase Orders', icon: '🛒' },
    { to: '/transfer-orders', label: 'Transfers',        icon: '🔄' },
    { to: '/stock-counts',    label: 'Stock Counts',     icon: '🔢' },
    { to: '/branches',        label: 'Branches',         icon: '🏢' },
    { to: '/reports',         label: 'Reports',          icon: '📈' },
    { to: '/users',           label: 'Users',            icon: '👥' },
    { to: '/audit-logs',      label: 'Audit Logs',       icon: '🔍' },
    { to: '/industry-kits',   label: 'Industry Kits',    icon: '🏷' },
    { to: '/forecasting',     label: 'Forecasting',      icon: '📅' },
    { to: '/dna-scores',      label: 'DNA Score',         icon: '🧬' },
    { to: '/health-score',    label: 'Health Score',      icon: '💚' },
    { to: '/simulator',       label: 'Simulator',         icon: '🔬' },
    { to: '/approvals',       label: 'Approvals',         icon: '✅' },
    { to: '/compliance',      label: 'Compliance',        icon: '📋' },
    { to: '/recalls',         label: 'Recalls',           icon: '⚠' },
    { to: '/franchise',       label: 'Franchise',         icon: '🏢' },
    { to: '/supplier-portal', label: 'Supplier Portal',   icon: '🔗' },
    { to: '/settings',        label: 'Settings',         icon: '⚙' },
    { to: '/updates',         label: 'System Updates',   icon: '⬆' },
];

const NavIcon = ({ to }) => {
    const icons = {
        '/dashboard':       <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M2 10a8 8 0 1116 0A8 8 0 012 10zm8-4a1 1 0 011 1v3.586l2.707 2.707a1 1 0 01-1.414 1.414l-3-3A1 1 0 019 11V7a1 1 0 011-1z" clipRule="evenodd" fillRule="evenodd"/></svg>,
        '/products':        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm3 2h6v4H7V5zm-2 8h10v2H5v-2zm0-4h2v2H5V9zm4 0h2v2H9V9zm4 0h2v2h-2V9z"/></svg>,
        '/suppliers':       <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>,
        '/customers':       <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/></svg>,
        '/sales':           <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/></svg>,
        '/pos':             <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM2 11v4a2 2 0 002 2h12a2 2 0 002-2v-4H2zm4 2h2v2H6v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2z"/></svg>,
        '/expenses':        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/></svg>,
        '/inventory':       <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M3 3a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 13.846 4.632 16 6.414 16H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 5H6.28l-.31-1.243A1 1 0 005 3H3z"/></svg>,
        '/purchase-orders': <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/></svg>,
        '/stock-counts':    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M9 9a2 2 0 114 0 2 2 0 01-4 0z"/><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a4 4 0 00-3.446 6.032l-2.261 2.26a1 1 0 101.414 1.415l2.261-2.261A4 4 0 1011 5z" clipRule="evenodd"/></svg>,
        '/transfer-orders': <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8zM12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 15H12z"/></svg>,
        '/branches':        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd"/></svg>,
        '/reports':         <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/></svg>,
        '/users':           <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>,
        '/audit-logs':      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>,
        '/industry-kits':   <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/></svg>,
        '/forecasting':     <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/></svg>,
        '/dna-scores':      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"/></svg>,
        '/health-score':    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"/></svg>,
        '/simulator':       <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"/></svg>,
        '/approvals':       <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>,
        '/compliance':      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>,
        '/recalls':         <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>,
        '/franchise':       <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>,
        '/supplier-portal': <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd"/></svg>,
        '/settings':        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/></svg>,
    };
    return icons[to] ?? null;
};

export default function Layout({ children }) {
    const { user, logout } = useAuth();
    const { can } = usePermission();
    const { pathname } = useLocation();
    const navigate = useNavigate();

    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const handler = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (!mobile) setMobileOpen(false);
        };
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);

    // Close sidebar on nav (mobile)
    const handleNavClick = () => {
        if (isMobile) setMobileOpen(false);
    };

    const { data: branding } = useQuery({
        queryKey: ['branding'],
        queryFn:  () => client.get('/settings/branding').then(r => r.data),
        staleTime: 300_000,
    });

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const initials = user?.name
        ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
        : '??';

    return (
        <div style={{ display: 'flex', height: '100vh', background: 'var(--surface-2)' }}>
            {/* Hamburger button — mobile only */}
            {isMobile && (
                <button
                    onClick={() => setMobileOpen(v => !v)}
                    style={{
                        position: 'fixed',
                        top: 12, left: 12,
                        zIndex: 1100,
                        width: 38, height: 38,
                        borderRadius: 8,
                        background: 'var(--sidebar-bg)',
                        border: '1px solid var(--sidebar-border)',
                        color: '#f8fafc',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '1.1rem',
                        flexShrink: 0,
                    }}
                    aria-label="Open navigation"
                >
                    {mobileOpen ? '✕' : '☰'}
                </button>
            )}

            {/* Backdrop — mobile only */}
            {isMobile && mobileOpen && (
                <div
                    onClick={() => setMobileOpen(false)}
                    style={{
                        position: 'fixed', inset: 0,
                        background: 'rgba(0,0,0,0.45)',
                        zIndex: 1000,
                    }}
                />
            )}

            {/* Sidebar */}
            <aside style={{
                width: '220px',
                flexShrink: 0,
                background: 'var(--sidebar-bg)',
                borderRight: '1px solid var(--sidebar-border)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                ...(isMobile ? {
                    position: 'fixed',
                    top: 0, left: 0, bottom: 0,
                    zIndex: 1050,
                    transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
                    transition: 'transform 0.22s cubic-bezier(0.16,1,0.3,1)',
                    boxShadow: mobileOpen ? '4px 0 24px rgba(0,0,0,0.25)' : 'none',
                } : {}),
            }}>
                {/* Logo / Branding */}
                <div style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--sidebar-border)',
                    minHeight: 64,
                    display: 'flex', alignItems: 'center',
                }}>
                    {branding?.logo_url ? (
                        <img
                            src={branding.logo_url}
                            alt={branding.company_name ?? 'Logo'}
                            style={{ maxHeight: 36, maxWidth: 160, objectFit: 'contain', display: 'block' }}
                        />
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: 8,
                                background: 'var(--sidebar-accent)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                <svg viewBox="0 0 20 20" fill="white" width="16" height="16">
                                    <path d="M3 3a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 13.846 4.632 16 6.414 16H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 5H6.28l-.31-1.243A1 1 0 005 3H3z"/>
                                </svg>
                            </div>
                            <div>
                                <div style={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.9375rem', letterSpacing: '-0.02em' }}>
                                    {branding?.company_name ?? 'CRAMS'}
                                </div>
                                <div style={{ color: 'var(--sidebar-text)', fontSize: '0.6875rem', marginTop: 1 }}>Inventory Platform</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Nav */}
                <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
                    {nav.filter(({ to }) => {
                        if (to === '/audit-logs' && !can('viewAuditLogs')) return false;
                        if (to === '/settings'   && !can('manageUsers'))   return false;
                        return true;
                    }).map(({ to, label }) => {
                        const active = pathname.startsWith(to);
                        return (
                            <Link
                                key={to}
                                to={to}
                                onClick={handleNavClick}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '8px 10px',
                                    borderRadius: 8,
                                    marginBottom: 2,
                                    fontSize: '0.8125rem',
                                    fontWeight: active ? 600 : 400,
                                    color: active ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
                                    background: active ? 'var(--sidebar-active-bg)' : 'transparent',
                                    textDecoration: 'none',
                                    transition: 'all .12s',
                                    position: 'relative',
                                }}
                                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--sidebar-hover-bg)'; e.currentTarget.style.color = 'var(--sidebar-text-active)'; }}
                                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--sidebar-text)'; } }}
                            >
                                {active && (
                                    <span style={{
                                        position: 'absolute',
                                        left: 0, top: '50%',
                                        transform: 'translateY(-50%)',
                                        width: 3, height: 18,
                                        background: 'var(--sidebar-accent)',
                                        borderRadius: '0 3px 3px 0',
                                    }} />
                                )}
                                <span style={{ color: active ? 'var(--sidebar-accent)' : 'inherit', display: 'flex' }}>
                                    <NavIcon to={to} />
                                </span>
                                {label}
                            </Link>
                        );
                    })}
                </nav>

                {/* User footer */}
                <div style={{
                    padding: '14px 16px',
                    borderTop: '1px solid var(--sidebar-border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                }}>
                    <div style={{
                        width: 32, height: 32,
                        borderRadius: '50%',
                        background: 'var(--sidebar-accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#fff',
                        flexShrink: 0,
                    }}>
                        {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: '#f8fafc', fontSize: '0.8125rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {user?.name}
                        </div>
                        <div style={{ color: 'var(--sidebar-text)', fontSize: '0.6875rem', textTransform: 'capitalize' }}>
                            {user?.role}
                        </div>
                    </div>
                    <Link
                        to="/profile"
                        title="My Profile"
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--sidebar-text)', padding: 4, borderRadius: 6,
                            display: 'flex', alignItems: 'center',
                            transition: 'color .12s',
                            textDecoration: 'none',
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--sidebar-text-active)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--sidebar-text)'}
                    >
                        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                        </svg>
                    </Link>
                    <button
                        onClick={handleLogout}
                        title="Sign out"
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--sidebar-text)', padding: 4, borderRadius: 6,
                            display: 'flex', alignItems: 'center',
                            transition: 'color .12s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--sidebar-text)'}
                    >
                        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                            <path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd"/>
                        </svg>
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main style={{
                flex: 1,
                overflow: 'auto',
                padding: isMobile ? '62px 16px 24px' : '28px 32px',
                minWidth: 0,
            }}>
                {children}
            </main>
        </div>
    );
}
