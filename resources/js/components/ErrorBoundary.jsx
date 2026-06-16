import { Component } from 'react';

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error('[ErrorBoundary]', error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: '100vh', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 12,
                    padding: 32, fontFamily: 'system-ui, sans-serif',
                }}>
                    <div style={{ fontSize: '2rem' }}>⚠</div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Something went wrong</h2>
                    <p style={{ color: '#666', fontSize: '0.875rem', margin: 0, maxWidth: 420, textAlign: 'center' }}>
                        {this.state.error?.message ?? 'An unexpected error occurred.'}
                    </p>
                    <button
                        onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
                        style={{ marginTop: 8, padding: '8px 20px', borderRadius: 8, border: 'none', background: '#4f46e5', color: '#fff', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}
                    >
                        Reload page
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
