import { Component, type ReactNode } from 'react'

interface State {
  error: Error | null
}

/** Red de seguridad: si algo en el árbol se rompe, muestra una salida en vez
 *  de dejar la pantalla en blanco. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '1.5rem' }}>
        <section className="card" style={{ maxWidth: 420, padding: '1.75rem', textAlign: 'center' }}>
          <p className="mono-tag" style={{ color: 'var(--sello)' }}>Ups</p>
          <h1 style={{ fontSize: '1.8rem', margin: '0.3rem 0 0.6rem' }}>El becario tropezó</h1>
          <p style={{ marginBottom: '1.25rem', opacity: 0.85 }}>
            Algo se rompió al cargar la pantalla. Una recarga suele resolverlo.
          </p>
          <button
            type="button"
            className="btn"
            onClick={() => window.location.reload()}
            style={{ justifyContent: 'center' }}
          >
            Recargar
          </button>
        </section>
      </main>
    )
  }
}
