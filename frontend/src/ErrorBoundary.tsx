import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true, error: _, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error, errorInfo });

    // Detect failed dynamic imports (chunk load errors)
    const errorMsg = error?.message || "";
    const isChunkError =
      errorMsg.includes("Failed to fetch dynamically imported module") ||
      errorMsg.includes("Importing a module script failed") ||
      errorMsg.includes("error loading dynamically imported module");

    if (isChunkError) {
      const lastReload = sessionStorage.getItem("last-chunk-reload");
      const now = Date.now();
      // Reload automatically if not done in the last 10 seconds to avoid infinite loop
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem("last-chunk-reload", now.toString());
        window.location.reload();
      }
    }
  }

  public render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message || "";
      const isChunkError =
        errorMsg.includes("Failed to fetch dynamically imported module") ||
        errorMsg.includes("Importing a module script failed") ||
        errorMsg.includes("error loading dynamically imported module");

      const handleReload = () => {
        sessionStorage.setItem("last-chunk-reload", Date.now().toString());
        window.location.reload();
      };

      const handleGoHome = () => {
        window.location.href = "/";
      };

      return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4 transition-colors duration-300 font-sans">
          <div className="max-w-md w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-lg p-6 md:p-8 animate-scale-in text-center">
            {/* Header/Icon */}
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-[var(--bg-primary)] border border-[var(--border-color)] mb-6">
              {isChunkError ? (
                <svg 
                  className="h-8 w-8 text-[var(--primary-color)]" 
                  style={{ animation: 'spin 3s linear infinite' }}
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor" 
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
                </svg>
              ) : (
                <svg className="h-8 w-8 text-red-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2" style={{ color: 'var(--text-primary)' }}>
              {isChunkError ? "System Update Ready" : "Something went wrong"}
            </h1>

            {/* Description */}
            <p className="text-[var(--text-secondary)] text-sm md:text-base mb-6 leading-relaxed">
              {isChunkError 
                ? "A new version of the Smart Campus application is ready. We need to refresh your session to load the latest modules." 
                : "An unexpected error occurred in the application. You can reload the page or return to the dashboard."}
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              <button
                onClick={handleReload}
                className="w-full sm:w-auto px-6 py-2.5 bg-[var(--primary-color)] hover:bg-[var(--secondary-color)] text-white font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:ring-offset-2 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
                </svg>
                Reload System
              </button>
              <button
                onClick={handleGoHome}
                className="w-full sm:w-auto px-6 py-2.5 bg-[var(--bg-primary)] hover:bg-[var(--border-color)] border border-[var(--border-color)] text-[var(--text-primary)] font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:ring-offset-2 hover:scale-[1.02] active:scale-[0.98]"
                style={{ color: 'var(--text-primary)' }}
              >
                Go to Dashboard
              </button>
            </div>

            {/* Details (Collapsible Stack Trace) */}
            <details className="text-left bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl overflow-hidden group">
              <summary className="px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] cursor-pointer select-none hover:bg-[var(--border-color)] transition-colors duration-150 flex items-center justify-between">
                <span>View technical details</span>
                <svg className="h-4 w-4 transform group-open:rotate-180 transition-transform duration-150" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-4 py-3 border-t border-[var(--border-color)] text-xs text-[var(--text-secondary)] font-mono overflow-auto max-h-48 whitespace-pre-wrap leading-normal">
                <div className="font-semibold text-red-500 mb-1">
                  {this.state.error && this.state.error.toString()}
                </div>
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </div>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

