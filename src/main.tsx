import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'

class LynellRenderBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null; componentStack: string | null }
> {
  state: { error: Error | null; componentStack: string | null } = {
    error: null,
    componentStack: null,
  }

  static getDerivedStateFromError(error: Error) {
    return { error, componentStack: null }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ componentStack: info.componentStack ?? null })

    if (import.meta.env.DEV) {
      console.error('[Lynell render boundary]', {
        message: error.message,
        stack: error.stack,
        componentStack: info.componentStack,
      })
    }
  }

  render() {
    const error = this.state.error
    const componentStack = this.state.componentStack

    if (error) {
      return (
        <main className="lynell-render-fallback" role="alert">
          <div>
            <p>Lynell forbereder grensesnittet på nytt.</p>
            <strong>Runtime-visningen traff en render-feil, men appen er ikke blanket.</strong>
            {import.meta.env.DEV ? (
              <small>
                {error.name}: {error.message}
              </small>
            ) : null}
            {import.meta.env.DEV && componentStack ? (
              <pre>{componentStack.split('\n').slice(0, 6).join('\n')}</pre>
            ) : null}
            <button type="button" onClick={() => window.location.reload()}>
              Last inn på nytt
            </button>
          </div>
        </main>
      )
    }

    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LynellRenderBoundary>
      <App />
    </LynellRenderBoundary>
  </React.StrictMode>,
)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('[Lynell] Service worker kunne ikke registreres.', error)
    })
  })
}
