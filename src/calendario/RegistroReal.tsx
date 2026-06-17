import { Clock, X } from 'lucide-react'
import type { Bloque } from '../types/database'
import { horaLocal, minutosEntre, combinarFechaHora, fechaLocalDeISO, addDays } from '../lib/date'
import { inputStyle } from '../components/styles'

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

  const fechaBase = fechaLocalDeISO(bloque.inicio)

  /** Construye el timestamp real a partir de una hora manual "HH:MM". */
  function fijarManual(campo: Campo, hhmm: string) {
    if (!hhmm) return
    if (campo === 'real_inicio') {
      onMarcar('real_inicio', combinarFechaHora(fechaBase, hhmm))
      return
    }
    // Fin: si cae en o antes de la referencia, asumimos que cruzó la medianoche.
    let iso = combinarFechaHora(fechaBase, hhmm)
    const ref = bloque.real_inicio ?? bloque.inicio
    if (new Date(iso).getTime() <= new Date(ref).getTime()) {
      iso = combinarFechaHora(addDays(fechaBase, 1), hhmm)
    }
    onMarcar('real_fin', iso)
  }

  function fila(campo: Campo, etiqueta: string, valor: string | null, planRef: string) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span className="mono-tag" style={{ width: 52 }}>{etiqueta}</span>
        <input
          type="time"
          value={valor ? horaLocal(valor) : ''}
          onChange={(e) => fijarManual(campo, e.target.value)}
          disabled={busy}
          style={{ ...inputStyle, width: 120 }}
        />
        <button
          type="button"
          className="btn"
          onClick={() => onMarcar(campo, new Date().toISOString())}
          disabled={busy}
          title="Usar la hora actual"
          style={{ padding: '0.3rem 0.5rem' }}
        >
          <Clock size={15} aria-hidden />
          Ahora
        </button>
        {valor && (
          <>
            <span className="mono-tag" style={{ opacity: 0.7 }}>
              ({deltaTexto(minutosEntre(planRef, valor))})
            </span>
            <button
              type="button"
              className="btn"
              onClick={() => onMarcar(campo, null)}
              disabled={busy}
              title={`Borrar ${etiqueta.toLowerCase()}`}
              style={{ padding: '0.3rem 0.4rem', background: 'var(--papel)', color: 'var(--tinta)' }}
            >
              <X size={15} aria-hidden />
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
      <p className="mono-tag" style={{ color: 'var(--sello)', marginBottom: '0.5rem' }}>
        Registro real
      </p>
      <p className="mono-tag" style={{ opacity: 0.7, marginBottom: '0.8rem' }}>
        Plan: {horaLocal(bloque.inicio)}–{horaLocal(bloque.fin)} · {planMin} min
      </p>

      <div style={{ display: 'grid', gap: '0.6rem' }}>
        {fila('real_inicio', 'Inicio', bloque.real_inicio, bloque.inicio)}
        {fila('real_fin', 'Fin', bloque.real_fin, bloque.fin)}
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
