import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error('[ErrorBoundary]', error, info.componentStack);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    minHeight: '60vh', padding: '2rem', textAlign: 'center',
                }}>
                    <div style={{
                        background: 'var(--bg-card, #fff)', border: '1px solid var(--border-medium, #e5e7eb)',
                        borderRadius: 16, padding: '2.5rem', maxWidth: 440, width: '100%',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                    }}>
                        <AlertTriangle size={48} color="var(--color-text-warning, #f59e0b)" style={{ marginBottom: 16 }} />
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8, color: 'var(--color-text-primary, #1f2937)' }}>
                            Something went wrong
                        </h2>
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary, #6b7280)', marginBottom: 20, lineHeight: 1.5 }}>
                            An unexpected error occurred while rendering this page.
                            Your data is safe — try refreshing.
                        </p>
                        <button
                            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 8,
                                padding: '10px 24px', borderRadius: 10, border: 'none',
                                background: 'var(--color-primary, #2563eb)', color: '#fff',
                                fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                            }}
                        >
                            <RefreshCw size={16} /> Reload Page
                        </button>
                        {this.state.error && (
                            <details style={{ marginTop: 16, textAlign: 'left', fontSize: '0.75rem', color: 'var(--color-text-tertiary, #9ca3af)' }}>
                                <summary style={{ cursor: 'pointer' }}>Technical details</summary>
                                <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{this.state.error.toString()}</pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
