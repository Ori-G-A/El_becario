import { createElement, type MouseEvent } from 'react'
import { Shield, Moon } from 'lucide-react'
import type { Bloque } from '../types/database'
import { TIPO_BLOQUE } from '../lib/bloqueTipos'
import { addDays, todayISO, combinarFechaHora } from '../lib/date'
import {
  ALTO_HORA,
  ALTO_TOTAL,
  HORAS,
  HORA_INICIO,
  topYAltoEnDia,
  horaDesdeY,
  layoutSolapamiento,
} from '../lib/timeline'

const GUTTER = 34
const DIA_MIN = 80
const DIA_MS = 86_400_000

export function SemanaTimeline({
  lunesISO,
  bloques,
  onSelectBloque,
  onCrear,
}: {
  lunesISO: string
  bloques: Bloque[]
  onSelectBloque: (b: Bloque) => void
  onCrear: (fechaISO: string, hhmm: string) => void
}) {
  const dias = Array.from({ length: 7 }, (_, i) => addDays(lunesISO, i))
  const hoy = todayISO()

  function colClick(fechaISO: string) {
    return (e: MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const hora = horaDesdeY(e.clientY - rect.top)
      if (hora) onCrear(fechaISO, hora)
    }
  }

  return (
    <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
      <div style={{ minWidth: GUTTER + 7 * DIA_MIN }}>
        {/* Encabezado de días */}
        <div
          style={{
            display: 'flex',
            position: 'sticky',
            top: 0,
            background: 'var(--papel)',
            borderBottom: 'var(--borde)',
            zIndex: 2,
          }}
        >
          <div style={{ width: GUTTER, flexShrink: 0 }} />
          {dias.map((dia) => {
            const [y, m, d] = dia.split('-').map(Number)
            const wd = new Date(y, m - 1, d).toLocaleDateString('es', { weekday: 'short' })
            const esHoy = dia === hoy
            return (
              <div
                key={dia}
                style={{
                  flex: 1,
                  minWidth: DIA_MIN,
                  textAlign: 'center',
                  padding: '0.35rem 0.2rem',
                  background: esHoy ? 'var(--tinta)' : 'transparent',
                  color: esHoy ? 'var(--papel)' : 'var(--tinta)',
                  borderLeft: '1px solid var(--papel-hueco)',
                }}
              >
                <div className="mono-tag" style={{ textTransform: 'capitalize', opacity: esHoy ? 1 : 0.7 }}>
                  {wd}
                </div>
                <strong style={{ fontFamily: 'var(--font-display)' }}>{d}</strong>
              </div>
            )
          })}
        </div>

        {/* Cuerpo: gutter de horas + columnas */}
        <div style={{ display: 'flex', position: 'relative', height: ALTO_TOTAL }}>
          <div style={{ width: GUTTER, flexShrink: 0, position: 'relative' }}>
            {HORAS.map((h) => (
              <span
                key={h}
                className="mono-tag"
                style={{ position: 'absolute', top: (h - HORA_INICIO) * ALTO_HORA - 7, right: 4, opacity: 0.5, fontSize: '0.6rem' }}
              >
                {String(h % 24).padStart(2, '0')}
              </span>
            ))}
          </div>

          {dias.map((dia) => {
            const diaMs = new Date(combinarFechaHora(dia, '00:00')).getTime()
            const delDia = bloques.filter((b) => {
              const ini = new Date(b.inicio).getTime()
              const fin = new Date(b.fin).getTime()
              return ini < diaMs + DIA_MS && fin > diaMs
            })
            const pos = layoutSolapamiento(
              delDia.map((b) => ({
                id: b.id,
                ini: Math.max(diaMs, new Date(b.inicio).getTime()),
                fin: Math.min(diaMs + DIA_MS, new Date(b.fin).getTime()),
              })),
            )
            return (
              <div
                key={dia}
                onClick={colClick(dia)}
                style={{
                  flex: 1,
                  minWidth: DIA_MIN,
                  position: 'relative',
                  borderLeft: '1px solid var(--papel-hueco)',
                  cursor: 'copy',
                }}
              >
                {HORAS.map((h) => (
                  <div
                    key={h}
                    style={{
                      position: 'absolute',
                      top: (h - HORA_INICIO) * ALTO_HORA,
                      left: 0,
                      right: 0,
                      borderTop: '1px solid var(--papel-hueco)',
                    }}
                  />
                ))}

                {delDia.map((b) => {
                  const cfg = TIPO_BLOQUE[b.tipo]
                  const completado = Boolean(b.real_inicio && b.real_fin)
                  const { top, alto } = topYAltoEnDia(b.inicio, b.fin, diaMs)
                  const { col, cols } = pos.get(b.id) ?? { col: 0, cols: 1 }
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectBloque(b)
                      }}
                      style={{
                        position: 'absolute',
                        top,
                        left: `calc(${col}/${cols} * 100%)`,
                        width: `calc(100%/${cols} - 1px)`,
                        height: alto,
                        overflow: 'hidden',
                        textAlign: 'left',
                        padding: '0.1rem 0.25rem',
                        borderRadius: 3,
                        border: '2px solid var(--tinta)',
                        borderLeft: `4px solid ${cfg.color}`,
                        background: completado ? 'var(--papel-hueco)' : 'var(--papel)',
                        boxShadow: b.protegido ? 'var(--sombra-dura-sm)' : 'none',
                        cursor: 'pointer',
                        lineHeight: 1.1,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                        {createElement(cfg.icon, { size: 10, color: cfg.color, 'aria-hidden': true })}
                        {b.protegido && <Shield size={9} aria-label="Protegido" />}
                        {b.tipo === 'sueno' && <Moon size={9} aria-hidden />}
                      </div>
                      <span
                        style={{
                          fontSize: '0.66rem',
                          fontWeight: 600,
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {b.titulo}
                      </span>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
