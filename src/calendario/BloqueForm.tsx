import { useState, createElement, type FormEvent } from 'react'
import { Check, X, Shield, Bell } from 'lucide-react'
import type { Bloque, TipoBloque } from '../types/database'
import type { BloqueInput } from '../data/bloques'
import { TIPO_BLOQUE, TIPOS_BLOQUE } from '../lib/bloqueTipos'
import { combinarFechaHora, horaLocal, addDays } from '../lib/date'
import { inputStyle } from '../components/styles'

const AVISO_MAX_MIN = 7 * 24 * 60

function masUnaHora(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const total = (h + 1) % 24
  return `${String(total).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function BloqueForm({
  initial,
  fechaISO,
  defaultHora,
  tareas,
  busy,
  onSave,
  onCancel,
}: {
  initial: Bloque | null
  fechaISO: string
  defaultHora?: string
  tareas: { id: string; titulo: string }[]
  busy: boolean
  onSave: (input: BloqueInput) => void
  onCancel: () => void
}) {
  const horaInicialInicio = initial ? horaLocal(initial.inicio) : (defaultHora ?? '09:00')
  const horaInicialFin = initial ? horaLocal(initial.fin) : masUnaHora(horaInicialInicio)

  const [titulo, setTitulo] = useState(initial?.titulo ?? '')
  const [tareaId, setTareaId] = useState<string>(initial?.tarea_id ?? '')
  const [tipo, setTipo] = useState<TipoBloque>(initial?.tipo ?? 'trabajo_profundo')
  const [horaInicio, setHoraInicio] = useState(horaInicialInicio)
  const [horaFin, setHoraFin] = useState(horaInicialFin)
  const [protegido, setProtegido] = useState(initial?.protegido ?? false)
  const [importante, setImportante] = useState(initial?.importante ?? false)
  const [aviso, setAviso] = useState<string>(
    initial?.aviso_min_antes != null ? String(initial.aviso_min_antes) : '10',
  )
  const [error, setError] = useState<string | null>(null)

  function onTareaChange(id: string) {
    setTareaId(id)
    if (!titulo.trim() && id) {
      const t = tareas.find((x) => x.id === id)
      if (t) setTitulo(t.titulo)
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const limpio = titulo.trim()
    if (!limpio) {
      setError('Ponle un título al bloque.')
      return
    }
    const inicio = combinarFechaHora(fechaISO, horaInicio)
    // Si el fin es menor o igual al inicio, el bloque termina al día siguiente
    // (p. ej. sueño 23:00 → 07:00).
    const finFecha = horaFin <= horaInicio ? addDays(fechaISO, 1) : fechaISO
    const fin = combinarFechaHora(finFecha, horaFin)
    const avisoMin = Number(aviso)
    if (importante && (!Number.isInteger(avisoMin) || avisoMin < 0 || avisoMin > AVISO_MAX_MIN)) {
      setError('El aviso debe estar entre 0 minutos y 7 días.')
      return
    }
    onSave({
      titulo: limpio,
      tarea_id: tareaId || null,
      tipo,
      inicio,
      fin,
      protegido,
      importante,
      aviso_min_antes: importante ? avisoMin : null,
    })
  }

  return (
    <form onSubmit={submit} className="card" style={{ padding: '1.1rem', marginBottom: '1rem' }}>
      <p className="mono-tag" style={{ color: 'var(--sello)', marginBottom: '0.6rem' }}>
        {initial ? 'Editar bloque' : 'Nuevo bloque'}
      </p>

      <label className="mono-tag" htmlFor="bloque-titulo" style={{ display: 'block', marginBottom: '0.35rem' }}>
        Título
      </label>
      <input
        id="bloque-titulo"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="Ej: Escribir capítulo 3"
        maxLength={200}
        autoFocus
        style={{ ...inputStyle, marginBottom: '0.9rem' }}
      />

      <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '0.9rem' }}>
        <div style={{ flex: 1 }}>
          <label className="mono-tag" htmlFor="bloque-ini" style={{ display: 'block', marginBottom: '0.35rem' }}>
            Inicio
          </label>
          <input
            id="bloque-ini"
            type="time"
            value={horaInicio}
            onChange={(e) => setHoraInicio(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label className="mono-tag" htmlFor="bloque-fin" style={{ display: 'block', marginBottom: '0.35rem' }}>
            Fin
          </label>
          <input
            id="bloque-fin"
            type="time"
            value={horaFin}
            onChange={(e) => setHoraFin(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      {horaFin <= horaInicio && (
        <p className="mono-tag" style={{ color: 'var(--sello)', margin: '-0.5rem 0 0.9rem' }}>
          Termina al día siguiente (cruza la medianoche).
        </p>
      )}

      <p className="mono-tag" style={{ marginBottom: '0.4rem' }}>Tipo</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.9rem' }}>
        {TIPOS_BLOQUE.map((t) => {
          const cfg = TIPO_BLOQUE[t]
          const on = tipo === t
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              aria-pressed={on}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.3rem 0.6rem',
                border: 'var(--borde)',
                borderRadius: 'var(--radio)',
                background: on ? cfg.color : 'var(--papel)',
                color: on ? '#fff' : 'var(--tinta)',
                boxShadow: on ? 'var(--sombra-dura-sm)' : 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
              }}
            >
              {createElement(cfg.icon, { size: 14, color: on ? '#fff' : cfg.color, 'aria-hidden': true })}
              {cfg.label}
            </button>
          )
        })}
      </div>

      {tareas.length > 0 && (
        <>
          <label className="mono-tag" htmlFor="bloque-tarea" style={{ display: 'block', marginBottom: '0.35rem' }}>
            Tarea (opcional)
          </label>
          <select
            id="bloque-tarea"
            value={tareaId}
            onChange={(e) => onTareaChange(e.target.value)}
            style={{ ...inputStyle, marginBottom: '0.9rem' }}
          >
            <option value="">Sin tarea</option>
            {tareas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.titulo}
              </option>
            ))}
          </select>
        </>
      )}

      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={protegido}
          onChange={(e) => setProtegido(e.target.checked)}
          style={{ width: 18, height: 18, accentColor: 'var(--sello)' }}
        />
        <Shield size={16} aria-hidden />
        <span style={{ fontWeight: 600 }}>Bloque protegido</span>
      </label>

      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: importante ? '0.6rem' : '1rem', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={importante}
          onChange={(e) => setImportante(e.target.checked)}
          style={{ width: 18, height: 18, accentColor: 'var(--sello)' }}
        />
        <Bell size={16} aria-hidden />
        <span style={{ fontWeight: 600 }}>Importante (con aviso)</span>
      </label>

      {importante && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <span className="mono-tag">Avisar</span>
          <input
            type="number"
            min={0}
            max={AVISO_MAX_MIN}
            value={aviso}
            onChange={(e) => setAviso(e.target.value)}
            style={{ ...inputStyle, width: 90 }}
          />
          <span className="mono-tag">min antes</span>
        </div>
      )}

      {error && (
        <p style={{ color: 'var(--rag-rojo)', fontWeight: 600, marginBottom: '0.75rem' }}>{error}</p>
      )}

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="submit" className="btn" disabled={busy}>
          <Check size={16} aria-hidden />
          {initial ? 'Guardar' : 'Agendar'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="btn"
          style={{ background: 'var(--papel)', color: 'var(--tinta)' }}
        >
          <X size={16} aria-hidden />
          Cancelar
        </button>
      </div>
    </form>
  )
}
