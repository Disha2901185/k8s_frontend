import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 bg-red-50 text-red-900 h-screen overflow-auto">
                    <h1 className="text-2xl font-bold mb-4">Application Crashed</h1>
                    <div className="font-mono bg-white p-4 rounded border border-red-200 shadow-sm mb-6">
                        <h2 className="font-bold text-red-700 mb-2">Error Message:</h2>
                        <p className="whitespace-pre-wrap text-red-600">{this.state.error && this.state.error.toString()}</p>
                    </div>
                    <div className="font-mono text-xs bg-slate-50 p-4 rounded border border-slate-200 overflow-auto">
                        <h2 className="font-bold text-slate-700 mb-2">Component Stack:</h2>
                        <pre className="whitespace-pre">{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
