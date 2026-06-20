import { CheckCircle2, Circle, CalendarX, ShieldAlert } from 'lucide-react'
import type { TareaConAreas } from '../data/tareas'

/** Franja "Pendientes del día": tareas agendadas sin horario, con checkbox. */
export function ChecklistDia({
  tareas,
  busy,
  onToggleHecha,
  onQuitar,
}: {
  tareas: TareaConAreas[]
  busy: boolean
  onToggleHecha: (t: TareaConAreas) => void
  onQuitar: (t: TareaConAreas) => void
}) {
  if (tareas.length === 0) return null
  const pendientes = tareas.filter((t) => t.estado !== 'hecha').length

  return (
    <div className="card" style={{ padding: '0.8rem', marginBottom: '1rem' }}>
      <p className="mono-tag" style={{ color: 'var(--sello)', marginBottom: '0.6rem' }}>
        Pendientes del día{' '}
        <span style={{ opacity: 0.6 }}>· {pendientes} sin hacer</span>
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.4rem' }}>
        {tareas.map((t) => {
          const hecha = t.estado === 'hecha'
          return (
            <li
              key={t.id}
              className="card"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.45rem 0.55rem',
                minWidth: 0,
                opacity: hecha ? 0.55 : 1,
              }}
            >
              <button
                type="button"
                onClick={() => onToggleHecha(t)}
                disabled={busy}
                aria-pressed={hecha}
                title={hecha ? 'Marcar como pendiente' : 'Marcar como hecha'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 2,
                  cursor: 'pointer',
                  color: hecha ? 'var(--rag-verde)' : 'var(--tinta)',
                }}
              >
                {hecha ? <CheckCircle2 size={18} aria-hidden /> : <Circle size={18} aria-hidden />}
              </button>

              <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                {t.confidencial && <ShieldAlert size={13} aria-label="Confidencial" />}
                <strong
                  style={{
                    fontSize: '0.92rem',
                    overflowWrap: 'anywhere',
                    textDecoration: hecha ? 'line-through' : 'none',
                  }}
                >
                  {t.titulo}
                </strong>
              </div>

              {t.estimacion_min != null && (
                <span className="mono-tag" style={{ opacity: 0.7, whiteSpace: 'nowrap' }}>
                  ~{t.estimacion_min} min
                </span>
              )}
              <button
                type="button"
                className="btn"
                onClick={() => onQuitar(t)}
                disabled={busy}
                title="Sacar del día"
                style={{ padding: '0.25rem 0.3rem', background: 'var(--papel)', color: 'var(--tinta)' }}
              >
                <CalendarX size={14} aria-hidden />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
