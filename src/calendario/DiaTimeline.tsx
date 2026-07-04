import { createElement, useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import { Shield, Bell, Moon, ShieldAlert } from 'lucide-react'
import type { Bloque } from '../types/database'
import { TIPO_BLOQUE } from '../lib/bloqueTipos'
import { horaLocal, combinarFechaHora } from '../lib/date'
import {
  ALTO_HORA,
  ALTO_TOTAL,
  HORAS,
  HORA_INICIO,
  PX_POR_MIN,
  topYAltoEnDia,
  horaDesdeY,
  layoutSolapamiento,
} from '../lib/timeline'

const COL_IZQ = 46 // ancho de la columna de horas
const DIA_MS = 86_400_000
const SNAP_MIN = 15

export function DiaTimeline({
  fechaISO,
  bloques,
  onSelectBloque,
  onCrearEnHora,
  onMover,
}: {
  fechaISO: string
  bloques: Bloque[]
  onSelectBloque: (b: Bloque) => void
  onCrearEnHora: (hhmm: string) => void
  onMover: (b: Bloque, deltaMin: number) => void
}) {
  const diaMs = new Date(combinarFechaHora(fechaISO, '00:00')).getTime()

  // Arrastre con mouse (solo PC): en táctil el gesto pelearía con el scroll,
  // ahí siguen los botones −30/+30/→ mañana al abrir el bloque.
  const [drag, setDrag] = useState<{ id: string; dy: number } | null>(null)
  const yInicioRef = useRef(0)
  const arrastroRef = useRef(false)

  function deltaMinDe(dy: number): number {
    return Math.round(dy / PX_POR_MIN / SNAP_MIN) * SNAP_MIN
  }

  function onBloquePointerDown(e: PointerEvent<HTMLButtonElement>, b: Bloque) {
    if (e.pointerType !== 'mouse' || e.button !== 0) return
    yInicioRef.current = e.clientY
    arrastroRef.current = false
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag({ id: b.id, dy: 0 })
  }

  function onBloquePointerMove(e: PointerEvent<HTMLButtonElement>, b: Bloque) {
    if (!drag || drag.id !== b.id) return
    const dy = e.clientY - yInicioRef.current
    if (Math.abs(dy) > 4) arrastroRef.current = true
    if (arrastroRef.current) setDrag({ id: b.id, dy })
  }

  function onBloquePointerUp(b: Bloque) {
    if (!drag || drag.id !== b.id) return
    const deltaMin = deltaMinDe(drag.dy)
    setDrag(null)
    if (arrastroRef.current && deltaMin !== 0) onMover(b, deltaMin)
  }

  function onBloqueClick(b: Bloque) {
    // Un arrastre no es un click: no abrir el formulario al soltar.
    if (arrastroRef.current) {
      arrastroRef.current = false
      return
    }
    onSelectBloque(b)
  }

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

        const arrastrando = drag?.id === b.id && arrastroRef.current
        const deltaMin = arrastrando && drag ? deltaMinDe(drag.dy) : 0
        const desplazado = (ms: string) =>
          new Date(new Date(ms).getTime() + deltaMin * 60_000).toISOString()

        return (
          <button
            key={b.id}
            type="button"
            onClick={() => onBloqueClick(b)}
            onPointerDown={(e) => onBloquePointerDown(e, b)}
            onPointerMove={(e) => onBloquePointerMove(e, b)}
            onPointerUp={() => onBloquePointerUp(b)}
            onPointerCancel={() => setDrag(null)}
            style={{
              position: 'absolute',
              top: top + deltaMin * PX_POR_MIN,
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
              boxShadow: arrastrando ? 'var(--sombra-dura-sm)' : b.protegido ? 'var(--sombra-dura-sm)' : 'none',
              cursor: arrastrando ? 'grabbing' : 'pointer',
              zIndex: arrastrando ? 2 : undefined,
              opacity: arrastrando ? 0.9 : 1,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              {createElement(cfg.icon, { size: 13, color: cfg.color, 'aria-hidden': true })}
              <strong style={{ fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {b.titulo}
              </strong>
              {b.protegido && <Shield size={11} aria-label="Protegido" />}
              {b.importante && <Bell size={11} aria-label="Importante" />}
              {b.confidencial && <ShieldAlert size={11} aria-label="Confidencial" />}
              {b.tipo === 'sueno' && <Moon size={11} aria-hidden />}
            </div>
            {alto > 28 && (
              <span className="mono-tag" style={{ opacity: 0.6, fontSize: '0.64rem' }}>
                {horaLocal(desplazado(b.inicio))}–{horaLocal(desplazado(b.fin))}
                {completado ? ' · hecho' : ''}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
