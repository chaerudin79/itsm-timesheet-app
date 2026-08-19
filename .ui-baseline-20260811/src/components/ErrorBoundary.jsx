import { Component } from 'react'
import { AlertCircle, RotateCcw } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    // Log error for debugging
    console.error('Error caught by boundary:', error, errorInfo)
    
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }))

    // Optionally send to error tracking service
    // errorTrackingService.logError(error, errorInfo)
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center w-full min-h-screen bg-gradient-to-br from-red-50 to-rose-50 dark:from-slate-950 dark:to-red-950 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-md w-full p-6 border border-red-200 dark:border-red-900">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
                <AlertCircle className="text-red-600 dark:text-red-400" size={24} />
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">
                Oops! Something went wrong
              </h1>
            </div>

            <p className="text-slate-600 dark:text-slate-400 mb-4">
              We encountered an unexpected error. Don't worry, your data is safe.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-4 text-xs bg-slate-100 dark:bg-slate-800 p-3 rounded border border-slate-300 dark:border-slate-700 max-h-32 overflow-y-auto">
                <summary className="font-mono text-slate-600 dark:text-slate-400 cursor-pointer">
                  Error details (dev only)
                </summary>
                <pre className="mt-2 text-red-600 dark:text-red-400 whitespace-pre-wrap break-words">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium"
              >
                <RotateCcw size={16} />
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-50 rounded-lg transition-colors font-medium"
              >
                Go Home
              </button>
            </div>

            {this.state.errorCount > 3 && (
              <p className="mt-4 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded">
                ⚠️ Multiple errors detected. Consider refreshing the page or clearing your browser cache.
              </p>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
