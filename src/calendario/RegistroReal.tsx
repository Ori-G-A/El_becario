import { Play, Square, X } from 'lucide-react'
import type { Bloque } from '../types/database'
import { horaLocal, minutosEntre } from '../lib/date'

type Campo = 'real_inicio' | 'real_fin'

function deltaTexto(min: number): string {
  if (min === 0) return 'justo lo planeado'
  const abs = Math.abs(min)
  return min > 0 ? `+${abs} min` : `−${abs} min`
}

export function RegistroReal({
  bloque,
  busy,
  onMarcar,
}: {
  bloque: Bloque
  busy: boolean
  onMarcar: (campo: Campo, valor: string | null) => void
}) {
  const planMin = minutosEntre(bloque.inicio, bloque.fin)
  const realMin =
    bloque.real_inicio && bloque.real_fin
      ? minutosEntre(bloque.real_inicio, bloque.real_fin)
      : null

  return (
    <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
      <p className="mono-tag" style={{ color: 'var(--sello)', marginBottom: '0.5rem' }}>
        Registro real
      </p>
      <p className="mono-tag" style={{ opacity: 0.7, marginBottom: '0.8rem' }}>
        Plan: {horaLocal(bloque.inicio)}–{horaLocal(bloque.fin)} · {planMin} min
      </p>

      <div style={{ display: 'grid', gap: '0.6rem' }}>
        {/* Inicio real */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {bloque.real_inicio ? (
            <>
              <span style={{ flex: 1 }}>
                Empezaste <strong>{horaLocal(bloque.real_inicio)}</strong>{' '}
                <span className="mono-tag" style={{ opacity: 0.7 }}>
                  ({deltaTexto(minutosEntre(bloque.inicio, bloque.real_inicio))})
                </span>
              </span>
              <button
                type="button"
                className="btn"
                onClick={() => onMarcar('real_inicio', null)}
                disabled={busy}
                title="Borrar inicio real"
                style={{ padding: '0.3rem 0.4rem', background: 'var(--papel)', color: 'var(--tinta)' }}
              >
                <X size={15} aria-hidden />
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn"
              onClick={() => onMarcar('real_inicio', new Date().toISOString())}
              disabled={busy}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Play size={16} aria-hidden />
              Empezar ahora
            </button>
          )}
        </div>

        {/* Fin real */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {bloque.real_fin ? (
            <>
              <span style={{ flex: 1 }}>
                Terminaste <strong>{horaLocal(bloque.real_fin)}</strong>
              </span>
              <button
                type="button"
                className="btn"
                onClick={() => onMarcar('real_fin', null)}
                disabled={busy}
                title="Borrar fin real"
                style={{ padding: '0.3rem 0.4rem', background: 'var(--papel)', color: 'var(--tinta)' }}
              >
                <X size={15} aria-hidden />
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn"
              onClick={() => onMarcar('real_fin', new Date().toISOString())}
              disabled={busy || !bloque.real_inicio}
              title={!bloque.real_inicio ? 'Primero marca el inicio' : undefined}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Square size={16} aria-hidden />
              Terminar ahora
            </button>
          )}
        </div>
      </div>

      {realMin != null && (
        <p style={{ marginTop: '0.8rem', fontWeight: 600 }}>
          Real: {realMin} min ·{' '}
          <span
            style={{
              color:
                realMin - planMin > 0 ? 'var(--rag-rojo)' : 'var(--tinta)',
            }}
          >
            {deltaTexto(realMin - planMin)}
          </span>{' '}
          <span className="mono-tag" style={{ opacity: 0.7 }}>vs. lo planeado</span>
        </p>
      )}
    </div>
  )
}
