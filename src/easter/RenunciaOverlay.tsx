import { useEffect } from 'react'

/** El becario "renuncia" por 5 segundos (resultado del código Konami). */
export function RenunciaOverlay({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onDone, 5000)
    return () => window.clearTimeout(t)
  }, [onDone])

  return (
    <div
      role="alertdialog"
      aria-label="El becario renunció"
      onClick={onDone}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--tinta)',
        color: 'var(--papel)',
        display: 'grid',
        placeItems: 'center',
        textAlign: 'center',
        padding: '2rem',
        zIndex: 200,
        cursor: 'pointer',
      }}
    >
      <div>
        <p
          className="mono-tag"
          style={{ color: 'var(--rag-ambar)', marginBottom: '0.6rem', letterSpacing: '0.12em' }}
        >
          Carta de renuncia
        </p>
        <h1 style={{ fontSize: 'clamp(2rem, 9vw, 3.5rem)', color: 'var(--papel)' }}>
          Renuncio.
        </h1>
        <p style={{ marginTop: '1rem', opacity: 0.85, maxWidth: '32ch', marginInline: 'auto' }}>
          …es broma. Salí cinco minutos por un café (yo, no tú). Ya vuelvo a ordenarte la vida.
        </p>
      </div>
    </div>
  )
}
