import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import Layout from '../../components/Layout';
import client from '../../api/client';

export default function UpdaterPage() {
    const [log, setLog] = useState('');

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['updater-check'],
        queryFn: () => client.get('/updater/check').then(r => r.data),
        staleTime: 60_000,
    });

    const applyMutation = useMutation({
        mutationFn: (zipball_url) => client.post('/updater/apply', { zipball_url }),
        onMutate: () => setLog('Downloading update package...'),
        onSuccess: (res) => setLog(res.data.message ?? 'Update applied successfully.'),
        onError:   (err) => setLog('Error: ' + (err.response?.data?.error ?? err.message)),
    });

    return (
        <Layout>
            <div className="p-6 max-w-2xl mx-auto space-y-6">

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">System Updates</h1>
                    <p className="text-sm text-slate-500 mt-1">Keep CRAMS up to date with the latest features and fixes.</p>
                </div>

                {/* Version card */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
                    {isLoading && (
                        <p className="text-slate-500 text-sm animate-pulse">Checking for updates...</p>
                    )}

                    {isError && (
                        <div className="text-red-500 text-sm">
                            Could not reach update server. Check your internet connection.
                        </div>
                    )}

                    {data && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                                    <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Installed</p>
                                    <p className="text-xl font-bold text-slate-800 dark:text-white">v{data.current_version}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                                    <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Latest</p>
                                    <p className="text-xl font-bold text-indigo-600">v{data.latest_version}</p>
                                </div>
                            </div>

                            {data.up_to_date ? (
                                <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 rounded-lg px-4 py-3 text-sm font-medium">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                                    </svg>
                                    CRAMS is up to date
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-4 py-3 text-sm font-medium">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                                        </svg>
                                        Update available — v{data.latest_version}
                                    </div>

                                    {data.changelog && (
                                        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Changelog</p>
                                            <pre className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans">{data.changelog}</pre>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => applyMutation.mutate(data.zipball_url)}
                                        disabled={applyMutation.isPending}
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        {applyMutation.isPending ? (
                                            <>
                                                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                                                </svg>
                                                Applying update...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
                                                </svg>
                                                Update to v{data.latest_version}
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}

                            {log && (
                                <div className="bg-slate-900 text-green-400 rounded-lg px-4 py-3 text-sm font-mono">
                                    {log}
                                </div>
                            )}

                            <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-700">
                                <p className="text-xs text-slate-400">
                                    {data.published_at && <>Released {new Date(data.published_at).toLocaleDateString()}</>}
                                </p>
                                <button
                                    onClick={() => refetch()}
                                    className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
                                >
                                    Check again
                                </button>
                            </div>
                        </>
                    )}
                </div>

            </div>
        </Layout>
    );
}
