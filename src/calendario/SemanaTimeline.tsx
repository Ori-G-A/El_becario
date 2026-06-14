import { createElement, type MouseEvent } from 'react'
import { Shield } from 'lucide-react'
import type { Bloque } from '../types/database'
import { TIPO_BLOQUE } from '../lib/bloqueTipos'
import { addDays, fechaLocalDeISO, todayISO } from '../lib/date'
import { ALTO_HORA, ALTO_TOTAL, HORAS, HORA_INICIO, bloqueTop, bloqueAlto, horaDesdeY } from '../lib/timeline'

const GUTTER = 42
const DIA_MIN = 80

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

  const porDia = new Map<string, Bloque[]>()
  for (const b of bloques) {
    const dia = fechaLocalDeISO(b.inicio)
    const lista = porDia.get(dia) ?? []
    lista.push(b)
    porDia.set(dia, lista)
  }

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
                style={{ position: 'absolute', top: (h - HORA_INICIO) * ALTO_HORA - 7, right: 4, opacity: 0.5 }}
              >
                {String(h % 24).padStart(2, '0')}
              </span>
            ))}
          </div>

          {dias.map((dia) => (
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

              {(porDia.get(dia) ?? []).map((b) => {
                const cfg = TIPO_BLOQUE[b.tipo]
                const completado = Boolean(b.real_inicio && b.real_fin)
                const alto = bloqueAlto(b.inicio, b.fin)
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
                      top: bloqueTop(b.inicio),
                      left: 2,
                      right: 2,
                      height: alto,
                      overflow: 'hidden',
                      textAlign: 'left',
                      padding: '0.15rem 0.3rem',
                      borderRadius: 3,
                      border: '2px solid var(--tinta)',
                      borderLeft: `5px solid ${cfg.color}`,
                      background: completado ? 'var(--papel-hueco)' : 'var(--papel)',
                      boxShadow: b.protegido ? 'var(--sombra-dura-sm)' : 'none',
                      cursor: 'pointer',
                      lineHeight: 1.1,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      {createElement(cfg.icon, { size: 11, color: cfg.color, 'aria-hidden': true })}
                      {b.protegido && <Shield size={10} aria-label="Protegido" />}
                    </div>
                    <span
                      style={{
                        fontSize: '0.72rem',
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
          ))}
        </div>
      </div>
    </div>
  )
}
