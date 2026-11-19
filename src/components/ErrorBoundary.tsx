import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message || 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Eldergrove ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0c1017] text-[#f4efe4] flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl border border-rose-500/40 bg-[#141a24] p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-rose-300 mb-2">Something went wrong</h2>
            <p className="text-xs text-slate-300 mb-4 break-words">{this.state.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition cursor-pointer"
            >
              Reload Eldergrove
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
