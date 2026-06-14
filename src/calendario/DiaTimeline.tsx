import { createElement, type MouseEvent } from 'react'
import { Shield, Bell } from 'lucide-react'
import type { Bloque } from '../types/database'
import { TIPO_BLOQUE } from '../lib/bloqueTipos'
import { horaLocal, minutosDesdeMedianoche } from '../lib/date'

const HORA_INICIO = 6 // 6:00
const HORA_FIN = 24 // medianoche
const ALTO_HORA = 56 // px por hora
const PX_POR_MIN = ALTO_HORA / 60
const MIN_INICIO = HORA_INICIO * 60
const ALTO_TOTAL = (HORA_FIN - HORA_INICIO) * ALTO_HORA
const COL_IZQ = 54 // ancho de la columna de horas

export function DiaTimeline({
  bloques,
  onSelectBloque,
  onCrearEnHora,
}: {
  bloques: Bloque[]
  onSelectBloque: (b: Bloque) => void
  onCrearEnHora: (hhmm: string) => void
}) {
  const horas = Array.from({ length: HORA_FIN - HORA_INICIO + 1 }, (_, i) => HORA_INICIO + i)

  function onBackgroundClick(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const minutos = MIN_INICIO + Math.round(y / PX_POR_MIN / 15) * 15
    const h = Math.floor(minutos / 60)
    const m = minutos % 60
    if (h < HORA_INICIO || h >= HORA_FIN) return
    onCrearEnHora(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }

  return (
    <div
      className="card"
      style={{ position: 'relative', height: ALTO_TOTAL, padding: 0, overflow: 'hidden' }}
    >
      {/* Capa de fondo: líneas de hora + click para crear */}
      <div
        onClick={onBackgroundClick}
        style={{ position: 'absolute', inset: 0, cursor: 'copy' }}
        aria-label="Toca para crear un bloque"
      >
        {horas.map((h) => {
          const top = (h - HORA_INICIO) * ALTO_HORA
          return (
            <div key={h} style={{ position: 'absolute', top, left: 0, right: 0 }}>
              <span
                className="mono-tag"
                style={{ position: 'absolute', top: -7, left: 8, opacity: 0.5 }}
              >
                {String(h % 24).padStart(2, '0')}:00
              </span>
              <div style={{ marginLeft: COL_IZQ, borderTop: '1px solid var(--papel-hueco)' }} />
            </div>
          )
        })}
      </div>

      {/* Bloques */}
      {bloques.map((b) => {
        const ini = minutosDesdeMedianoche(b.inicio)
        const fin = minutosDesdeMedianoche(b.fin)
        const top = Math.max(0, (ini - MIN_INICIO) * PX_POR_MIN)
        const alto = Math.max(22, (fin - ini) * PX_POR_MIN - 2)
        const cfg = TIPO_BLOQUE[b.tipo]
        const completado = Boolean(b.real_inicio && b.real_fin)
        return (
          <button
            key={b.id}
            type="button"
            onClick={() => onSelectBloque(b)}
            style={{
              position: 'absolute',
              top,
              left: COL_IZQ + 4,
              right: 6,
              height: alto,
              overflow: 'hidden',
              textAlign: 'left',
              padding: '0.25rem 0.45rem',
              borderRadius: 'var(--radio)',
              border: b.protegido ? '2.5px solid var(--tinta)' : '2px solid var(--tinta)',
              borderLeft: `6px solid ${cfg.color}`,
              background: completado ? 'var(--papel-hueco)' : 'var(--papel)',
              boxShadow: b.protegido ? 'var(--sombra-dura-sm)' : 'none',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              {createElement(cfg.icon, { size: 13, color: cfg.color, 'aria-hidden': true })}
              <strong style={{ fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {b.titulo}
              </strong>
              {b.protegido && <Shield size={12} aria-label="Protegido" />}
              {b.importante && <Bell size={12} aria-label="Importante" />}
            </div>
            {alto > 30 && (
              <span className="mono-tag" style={{ opacity: 0.6 }}>
                {horaLocal(b.inicio)}–{horaLocal(b.fin)}
                {completado ? ' · hecho' : ''}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
