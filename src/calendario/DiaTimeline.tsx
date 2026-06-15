import { createElement, type MouseEvent } from 'react'
import { Shield, Bell, Moon } from 'lucide-react'
import type { Bloque } from '../types/database'
import { TIPO_BLOQUE } from '../lib/bloqueTipos'
import { horaLocal, combinarFechaHora } from '../lib/date'
import {
  ALTO_HORA,
  ALTO_TOTAL,
  HORAS,
  HORA_INICIO,
  topYAltoEnDia,
  horaDesdeY,
  layoutSolapamiento,
} from '../lib/timeline'

const COL_IZQ = 46 // ancho de la columna de horas
const DIA_MS = 86_400_000

export function DiaTimeline({
  fechaISO,
  bloques,
  onSelectBloque,
  onCrearEnHora,
}: {
  fechaISO: string
  bloques: Bloque[]
  onSelectBloque: (b: Bloque) => void
  onCrearEnHora: (hhmm: string) => void
}) {
  const diaMs = new Date(combinarFechaHora(fechaISO, '00:00')).getTime()

  const pos = layoutSolapamiento(
    bloques.map((b) => ({
      id: b.id,
      ini: Math.max(diaMs, new Date(b.inicio).getTime()),
      fin: Math.min(diaMs + DIA_MS, new Date(b.fin).getTime()),
    })),
  )

  function onBackgroundClick(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const hora = horaDesdeY(e.clientY - rect.top)
    if (hora) onCrearEnHora(hora)
  }

  return (
    <div className="card" style={{ position: 'relative', height: ALTO_TOTAL, padding: 0, overflow: 'hidden' }}>
      <div
        onClick={onBackgroundClick}
        style={{ position: 'absolute', inset: 0, cursor: 'copy' }}
        aria-label="Toca para crear un bloque"
      >
        {HORAS.map((h) => {
          const top = (h - HORA_INICIO) * ALTO_HORA
          return (
            <div key={h} style={{ position: 'absolute', top, left: 0, right: 0 }}>
              <span className="mono-tag" style={{ position: 'absolute', top: -7, left: 8, opacity: 0.5 }}>
                {String(h % 24).padStart(2, '0')}:00
              </span>
              <div style={{ marginLeft: COL_IZQ, borderTop: '1px solid var(--papel-hueco)' }} />
            </div>
          )
        })}
      </div>

      {bloques.map((b) => {
        const cfg = TIPO_BLOQUE[b.tipo]
        const completado = Boolean(b.real_inicio && b.real_fin)
        const { top, alto } = topYAltoEnDia(b.inicio, b.fin, diaMs)
        const { col, cols } = pos.get(b.id) ?? { col: 0, cols: 1 }
        const left = `calc(${COL_IZQ + 4}px + (100% - ${COL_IZQ + 6}px) * ${col} / ${cols})`
        const width = `calc((100% - ${COL_IZQ + 6}px) / ${cols} - 2px)`
        return (
          <button
            key={b.id}
            type="button"
            onClick={() => onSelectBloque(b)}
            style={{
              position: 'absolute',
              top,
              left,
              width,
              height: alto,
              overflow: 'hidden',
              textAlign: 'left',
              padding: '0.2rem 0.4rem',
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
              <strong style={{ fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {b.titulo}
              </strong>
              {b.protegido && <Shield size={11} aria-label="Protegido" />}
              {b.importante && <Bell size={11} aria-label="Importante" />}
              {b.tipo === 'sueno' && <Moon size={11} aria-hidden />}
            </div>
            {alto > 28 && (
              <span className="mono-tag" style={{ opacity: 0.6, fontSize: '0.64rem' }}>
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
