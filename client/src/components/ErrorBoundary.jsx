import { Component } from 'react';

/**
 * Catches uncaught render/lifecycle errors anywhere below it in the tree
 * and shows a visible message instead of letting React silently unmount
 * the whole app (a blank white page with no clue what went wrong).
 *
 * This exact failure mode happened in production: firebase.js threw on
 * an undefined VITE_FIREBASE_API_KEY at module load time, and with no
 * error boundary, the entire app just vanished with only a console error
 * visible to anyone who opened devtools.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // eslint-disable-next-line no-console
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 600, margin: '4rem auto' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Something went wrong</h1>
          <p style={{ color: '#666' }}>
            The app hit an unexpected error and couldn't render. If you're
            the developer, check the browser console for details.
          </p>
          {import.meta.env.DEV && this.state.error && (
            <pre style={{ background: '#f4f4f4', padding: '1rem', marginTop: '1rem', overflow: 'auto', fontSize: '0.85rem' }}>
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
