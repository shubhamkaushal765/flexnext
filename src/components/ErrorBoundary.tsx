import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode; level?: 'app' | 'section' };
type State = { hasError: boolean };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.level ?? 'app'}]`, error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const isApp = (this.props.level ?? 'app') === 'app';
    return (
      <div className={isApp ? 'error-boundary full-page' : 'error-boundary'} role="alert">
        <h2>Something went wrong</h2>
        <p>
          {isApp
            ? 'FlexNext hit an unexpected error. Reload to continue.'
            : 'This section failed to load. Other parts of the app should still work.'}
        </p>
        <div className="row">
          {!isApp && (
            <button type="button" onClick={() => this.setState({ hasError: false })}>
              Try again
            </button>
          )}
          <button type="button" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      </div>
    );
  }
}
