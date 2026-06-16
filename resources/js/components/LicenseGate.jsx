import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import client from '../api/client';

export default function LicenseGate({ children }) {
    const navigate = useNavigate();

    const { data, isLoading } = useQuery({
        queryKey: ['license-status'],
        queryFn:  () => client.get('/license/status').then(r => r.data),
        staleTime: 60_000,
        retry: false,
    });

    useEffect(() => {
        if (!isLoading && data && !data.valid) {
            navigate('/activate', { replace: true });
        }
    }, [data, isLoading, navigate]);

    if (isLoading) return null;
    if (!data?.valid) return null;

    return (
        <>
            {data.expiring_soon && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
                    background: 'var(--amber)',
                    color: '#fff',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    padding: '8px 16px',
                    textAlign: 'center',
                }}>
                    ⚠ Your license expires in {data.days_remaining} day{data.days_remaining !== 1 ? 's' : ''}.
                    Contact your vendor for a renewal key.
                </div>
            )}
            {children}
        </>
    );
}
