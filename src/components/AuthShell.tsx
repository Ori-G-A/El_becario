import type { ReactNode } from 'react'

/** Card centrada para las pantallas de acceso (login / lock). */
export function AuthShell({
  badge,
  title,
  subtitle,
  children,
}: {
  badge: string
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '1.5rem',
      }}
    >
      <section
        className="card"
        style={{ maxWidth: 420, width: '100%', padding: '1.75rem' }}
      >
        <div
          aria-hidden
          style={{
            width: 52,
            height: 52,
            display: 'grid',
            placeItems: 'center',
            background: 'var(--sello)',
            borderRadius: 14,
            fontWeight: 700,
            fontSize: '1.9rem',
            color: 'var(--sello-ink)',
            marginBottom: '1rem',
          }}
        >
          B
        </div>

        <p className="mono-tag" style={{ color: 'var(--sello)' }}>
          {badge}
        </p>
        <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', margin: '0.3rem 0 0.5rem' }}>
          {title}
        </h1>
        <p style={{ marginBottom: '1.25rem', maxWidth: '34ch' }}>{subtitle}</p>

        {children}
      </section>
    </main>
  )
}
