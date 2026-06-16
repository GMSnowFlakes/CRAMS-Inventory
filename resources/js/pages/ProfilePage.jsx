import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/Layout';
import api from '../api/client';
import { useToast } from '../context/ToastContext';

const ROLE_LABELS = {
    owner:   'Owner',
    admin:   'Admin',
    manager: 'Manager',
    staff:   'Staff',
};

export default function ProfilePage() {
    const qc = useQueryClient();
    const { addToast } = useToast();

    const { data: me, isLoading } = useQuery({
        queryKey: ['me'],
        queryFn: () => api.get('/auth/me').then(r => r.data),
    });

    const [infoForm, setInfoForm] = useState(null);
    const [pwForm, setPwForm]     = useState({ current_password: '', password: '', password_confirmation: '' });
    const [pwErr, setPwErr]       = useState('');
    const [infoErr, setInfoErr]   = useState('');

    const form = infoForm ?? { name: me?.name ?? '', email: me?.email ?? '' };
    const set  = (k, v) => setInfoForm(f => ({ ...(f ?? { name: me?.name, email: me?.email }), [k]: v }));
    const setPw = (k, v) => setPwForm(f => ({ ...f, [k]: v }));

    const infoMut = useMutation({
        mutationFn: (d) => api.put('/auth/profile', d).then(r => r.data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['me'] });
            setInfoForm(null);
            setInfoErr('');
            addToast('Profile updated');
        },
        onError: (e) => setInfoErr(e?.response?.data?.message ?? 'Update failed'),
    });

    const pwMut = useMutation({
        mutationFn: (d) => api.put('/auth/profile', d).then(r => r.data),
        onSuccess: () => {
            setPwForm({ current_password: '', password: '', password_confirmation: '' });
            setPwErr('');
            addToast('Password changed');
        },
        onError: (e) => setPwErr(e?.response?.data?.message ?? 'Password change failed'),
    });

    const submitInfo = (e) => {
        e.preventDefault();
        setInfoErr('');
        if (!form.name.trim() || !form.email.trim()) { setInfoErr('Name and email are required'); return; }
        infoMut.mutate({ name: form.name, email: form.email });
    };

    const submitPw = (e) => {
        e.preventDefault();
        setPwErr('');
        if (!pwForm.current_password) { setPwErr('Enter your current password'); return; }
        if (pwForm.password.length < 8) { setPwErr('New password must be at least 8 characters'); return; }
        if (pwForm.password !== pwForm.password_confirmation) { setPwErr('Passwords do not match'); return; }
        pwMut.mutate(pwForm);
    };

    if (isLoading) return (
        <Layout>
            <div style={{ display: 'flex', gap: 6, padding: 40 }}>{[0,1,2].map(i => <span key={i} className="loading-dot" style={{ animationDelay: `${i*0.2}s` }} />)}</div>
        </Layout>
    );

    return (
        <Layout>
            <div className="page-header">
                <div>
                    <h1 className="page-title">My Profile</h1>
                    <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', marginTop: 2 }}>Account settings and security</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 900 }}>
                {/* Account info */}
                <div className="card" style={{ padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                        <div style={{
                            width: 52, height: 52, borderRadius: '50%',
                            background: 'var(--indigo-light)', color: 'var(--indigo)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: '1.25rem',
                        }}>
                            {me?.name?.charAt(0)?.toUpperCase() ?? '?'}
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{me?.name}</div>
                            <div style={{ fontSize: '0.8125rem', color: 'var(--text-3)' }}>{me?.email}</div>
                            <span className="badge badge-sky" style={{ marginTop: 4 }}>
                                {ROLE_LABELS[me?.role] ?? me?.role}
                            </span>
                        </div>
                    </div>

                    <form onSubmit={submitInfo} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>Personal Information</div>

                        {infoErr && <div className="alert-error">{infoErr}</div>}

                        <div>
                            <label className="field-label">Full Name</label>
                            <input className="field" value={form.name} onChange={e => set('name', e.target.value)} />
                        </div>
                        <div>
                            <label className="field-label">Email Address</label>
                            <input type="email" className="field" value={form.email} onChange={e => set('email', e.target.value)} />
                        </div>
                        <div>
                            <label className="field-label">Company</label>
                            <input className="field" value={me?.company?.name ?? '—'} disabled style={{ opacity: 0.6 }} />
                        </div>

                        <button type="submit" className="btn btn-primary" disabled={infoMut.isPending} style={{ alignSelf: 'flex-start' }}>
                            {infoMut.isPending ? 'Saving…' : 'Save Changes'}
                        </button>
                    </form>
                </div>

                {/* Change password */}
                <div className="card" style={{ padding: 24 }}>
                    <div style={{ fontWeight: 600, marginBottom: 20 }}>Change Password</div>

                    <form onSubmit={submitPw} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {pwErr && <div className="alert-error">{pwErr}</div>}

                        <div>
                            <label className="field-label">Current Password</label>
                            <input
                                type="password"
                                className="field"
                                value={pwForm.current_password}
                                onChange={e => setPw('current_password', e.target.value)}
                                autoComplete="current-password"
                            />
                        </div>
                        <div>
                            <label className="field-label">New Password</label>
                            <input
                                type="password"
                                className="field"
                                value={pwForm.password}
                                onChange={e => setPw('password', e.target.value)}
                                autoComplete="new-password"
                                placeholder="Minimum 8 characters"
                            />
                        </div>
                        <div>
                            <label className="field-label">Confirm New Password</label>
                            <input
                                type="password"
                                className="field"
                                value={pwForm.password_confirmation}
                                onChange={e => setPw('password_confirmation', e.target.value)}
                                autoComplete="new-password"
                            />
                        </div>

                        <button type="submit" className="btn btn-primary" disabled={pwMut.isPending} style={{ alignSelf: 'flex-start' }}>
                            {pwMut.isPending ? 'Changing…' : 'Change Password'}
                        </button>
                    </form>
                </div>
            </div>
        </Layout>
    );
}
