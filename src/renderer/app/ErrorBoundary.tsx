import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  error: Error | null;
  info: ErrorInfo | null;
}

/**
 * Catches render-time exceptions anywhere below it and prints the stack to
 * the screen — without this, an unhandled error blanks the whole app.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.setState({ error, info });
    // Also log to the renderer console so it shows up in DevTools.
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => this.setState({ error: null, info: null });

  override render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="m-8 max-w-3xl rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-sm">
        <div className="mb-2 font-display text-lg font-semibold text-destructive">
          La interfaz lanzó una excepción
        </div>
        <pre className="whitespace-pre-wrap break-words font-mono text-xs text-foreground">
          {error.message}
          {'\n\n'}
          {error.stack}
          {info ? '\n\nComponent stack:' + info.componentStack : ''}
        </pre>
        <button
          onClick={this.reset}
          className="mt-4 rounded-md border border-border bg-card px-3 py-1.5 text-xs hover:bg-accent"
        >
          Reintentar
        </button>
      </div>
    );
  }
}
