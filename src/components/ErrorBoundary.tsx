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
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0B0C10] text-white font-sans text-center min-h-[400px]">
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-8 max-w-[500px] w-full space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>

            <h2 className="text-[18px] font-bold text-white">
              {this.props.fallbackTitle || 'Something went wrong loading this page'}
            </h2>

            <p className="text-[12.5px] text-neutral-300 font-mono leading-relaxed bg-[#101218] p-3 rounded-xl border border-white/10 text-left overflow-x-auto">
              {this.state.error?.message || 'An unexpected error occurred during rendering.'}
            </p>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleGoHome}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-neutral-200 text-[13px] font-semibold transition-colors cursor-pointer border border-white/10"
              >
                <Home size={14} />
                <span>Back to Home</span>
              </button>

              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6E56CF] hover:bg-[#5E46BF] text-white text-[13px] font-semibold transition-colors cursor-pointer"
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
