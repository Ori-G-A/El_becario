import { X, Coffee } from 'lucide-react'

const EXPERIENCIA = [
  ['Fase 1', 'Aprendí a guardar tu vida sin perderla: auth, candado con PIN y tus áreas.'],
  ['Fase 2', 'Me dieron un calendario. Ahora sé cuándo trabajás de más y te lo digo.'],
  ['Fase 3', 'Me puse elegante: gráficos, secretos y, algún día, dejarte notificaciones.'],
]

export function CurriculumModal({ cafes, onClose }: { cafes: number; onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="CV del becario"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(24,24,24,0.45)',
        display: 'grid',
        placeItems: 'center',
        padding: '1.5rem',
        zIndex: 100,
      }}
    >
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 460, width: '100%', padding: '1.5rem', background: 'var(--papel)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p className="mono-tag" style={{ color: 'var(--sello)' }}>Currículum vitae</p>
            <h2 style={{ fontSize: '1.8rem', margin: '0.2rem 0 0' }}>El Becario</h2>
            <p className="mono-tag" style={{ opacity: 0.7 }}>
              Pasante no remunerado · Disponibilidad inmediata
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tinta)' }}
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        <p style={{ margin: '1rem 0', fontStyle: 'italic', opacity: 0.85 }}>
          "Ordeno tu semana, te protejo el trabajo profundo y te mando a dormir.
          A cambio, solo pido café."
        </p>

        <p className="mono-tag" style={{ marginBottom: '0.5rem' }}>Experiencia</p>
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem' }}>
          {EXPERIENCIA.map(([etapa, texto]) => (
            <li key={etapa} style={{ display: 'flex', gap: '0.6rem', padding: '0.3rem 0' }}>
              <strong className="mono-tag" style={{ color: 'var(--sello)', flexShrink: 0 }}>{etapa}</strong>
              <span style={{ opacity: 0.9 }}>{texto}</span>
            </li>
          ))}
        </ul>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            paddingTop: '0.9rem',
            borderTop: '1px solid var(--papel-hueco)',
          }}
        >
          <Coffee size={16} aria-hidden />
          <span className="mono-tag">Cafés cobrados: {cafes}</span>
        </div>
      </div>
    </div>
  )
}
