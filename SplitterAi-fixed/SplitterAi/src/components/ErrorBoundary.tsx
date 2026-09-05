import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface Props {
  children?: ReactNode
  fallbackTitle?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null })
    window.location.href = '/'
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[var(--bg)] text-[var(--text)] font-sans text-center min-h-[400px]">
          <div className="rounded-panel border border-[var(--bad-quiet)] bg-[var(--bad-dim)] p-8 max-w-[500px] w-full space-y-4 shadow-[var(--shadow-float)]">
            <div className="w-12 h-12 rounded-control bg-[var(--bad-dim)] text-[var(--bad)] flex items-center justify-center mx-auto border border-[var(--bad-quiet)]">
              <AlertTriangle size={24} />
            </div>

            <h2 className="text-[18px] font-bold text-[var(--text)]">
              {this.props.fallbackTitle || 'Something went wrong loading this page'}
            </h2>

            <p className="text-[12.5px] text-[var(--text-2)] font-mono leading-relaxed bg-[var(--bg-inset)] p-3 rounded-control border border-[var(--border)] text-left overflow-x-auto">
              {this.state.error?.message || 'An unexpected error occurred during rendering.'}
            </p>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleGoHome}
                className="flex items-center gap-2 px-4 py-2 rounded-control bg-[var(--panel-2)] hover:bg-[var(--panel-3)] text-[var(--text-2)] text-[13px] font-semibold transition-colors cursor-pointer border border-[var(--border)]"
              >
                <Home size={14} />
                <span>Back to Home</span>
              </button>

              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-4 py-2 rounded-control bg-[var(--accent)] hover:brightness-110 text-[var(--accent-ink)] text-[13px] font-semibold transition-colors cursor-pointer"
              >
                <RefreshCw size={14} />
                <span>Retry</span>
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
