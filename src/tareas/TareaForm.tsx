import { useState, type FormEvent } from 'react'
import { Check, X, ShieldAlert } from 'lucide-react'
import type { Area, Iniciativa, TipoBloque } from '../types/database'
import type { TareaConAreas, TareaInput } from '../data/tareas'
import { AreaIcon } from '../components/AreaIcon'
import { inputStyle } from '../components/styles'
import { cuadranteDe, metaCuadrante } from '../lib/eisenhower'
import { TIPO_BLOQUE, TIPOS_BLOQUE } from '../lib/bloqueTipos'
import { combinarFechaHora, addDays } from '../lib/date'

/** Bloque a crear junto con la tarea cuando se agenda "con horario". */
export interface BloqueDeTarea {
  inicio: string
  fin: string
  tipo: TipoBloque
}

/** Control sí/no de un solo eje (importante o urgente). */
function EjeSiNo({
  etiqueta,
  valor,
  onChange,
}: {
  etiqueta: string
  valor: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div style={{ flex: 1, minWidth: 130 }}>
      <p className="mono-tag" style={{ marginBottom: '0.35rem' }}>{etiqueta}</p>
      <div style={{ display: 'flex', gap: '0.4rem' }}>
        {[
          { v: true, txt: 'Sí' },
          { v: false, txt: 'No' },
        ].map(({ v, txt }) => {
          const on = valor === v
          return (
            <button
              key={txt}
              type="button"
              onClick={() => onChange(v)}
              aria-pressed={on}
              style={{
                flex: 1,
                padding: '0.4rem 0.6rem',
                fontWeight: 600,
                border: 'var(--borde)',
                borderRadius: 'var(--radio)',
                background: on ? 'var(--tinta)' : 'var(--papel)',
                color: on ? 'var(--papel)' : 'var(--tinta)',
                boxShadow: on ? 'var(--sombra-dura-sm)' : 'none',
                cursor: 'pointer',
              }}
            >
              {txt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function TareaForm({
  initial,
  areas,
  iniciativas,
  busy,
  onSave,
  onCancel,
}: {
  initial: TareaConAreas | null
  areas: Area[]
  iniciativas: Iniciativa[]
  busy: boolean
  onSave: (input: TareaInput, areaIds: string[], bloque?: BloqueDeTarea) => void
  onCancel: () => void
}) {
  const [titulo, setTitulo] = useState(initial?.titulo ?? '')
  const [responsable, setResponsable] = useState(initial?.responsable ?? 'yo')
  const [confidencial, setConfidencial] = useState(initial?.confidencial ?? false)
  const [iniciativaId, setIniciativaId] = useState<string>(initial?.iniciativa_id ?? '')
  const [areaIds, setAreaIds] = useState<string[]>(initial?.area_ids ?? [])
  const [importante, setImportante] = useState(initial?.importante ?? false)
  const [urgente, setUrgente] = useState(initial?.urgente ?? false)
  const [estimacion, setEstimacion] = useState(
    initial?.estimacion_min != null ? String(initial.estimacion_min) : '',
  )
  const [dia, setDia] = useState(initial?.agendada_para ?? '')
  const [modo, setModo] = useState<'checklist' | 'bloque'>('checklist')
  const [horaInicio, setHoraInicio] = useState('09:00')
  const [horaFin, setHoraFin] = useState('10:00')
  const [tipoBloque, setTipoBloque] = useState<TipoBloque>('trabajo_profundo')
  const [error, setError] = useState<string | null>(null)

  const meta = metaCuadrante(cuadranteDe({ importante, urgente }))

  function toggleArea(id: string) {
    setAreaIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  // "Con horario" (crear el bloque) solo al crear la tarea; al editar, solo checklist.
  const conHorario = !initial && dia !== '' && modo === 'bloque'

  function submit(e: FormEvent) {
    e.preventDefault()
    const limpio = titulo.trim()
    if (!limpio) {
      setError('Ponle un título a la tarea.')
      return
    }
    const estimacionMin = estimacion.trim() === '' ? null : Number(estimacion)
    if (estimacionMin != null && (!Number.isFinite(estimacionMin) || estimacionMin < 0)) {
      setError('La estimación debe ser un número de minutos válido.')
      return
    }

    const bloque: BloqueDeTarea | undefined = conHorario
      ? {
          inicio: combinarFechaHora(dia, horaInicio),
          fin: combinarFechaHora(horaFin <= horaInicio ? addDays(dia, 1) : dia, horaFin),
          tipo: tipoBloque,
        }
      : undefined

    onSave(
      {
        titulo: limpio,
        responsable: responsable.trim() || 'yo',
        confidencial,
        iniciativa_id: iniciativaId || null,
        importante,
        urgente,
        estimacion_min: estimacionMin,
        // Si va con horario, vive en el timeline: no se agenda como checklist.
        agendada_para: dia === '' || conHorario ? null : dia,
      },
      areaIds,
      bloque,
    )
  }

  return (
    <form onSubmit={submit} className="card" style={{ padding: '1.1rem', marginBottom: '1rem' }}>
      <p className="mono-tag" style={{ color: 'var(--sello)', marginBottom: '0.6rem' }}>
        {initial ? 'Editar tarea' : 'Nueva tarea'}
      </p>

      <label className="mono-tag" htmlFor="tarea-titulo" style={{ display: 'block', marginBottom: '0.35rem' }}>
        Título
      </label>
      <input
        id="tarea-titulo"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="Ej: Cerrar el roadmap de Oulad"
        maxLength={200}
        autoFocus
        style={{ ...inputStyle, marginBottom: '0.9rem' }}
      />

      <label className="mono-tag" htmlFor="tarea-resp" style={{ display: 'block', marginBottom: '0.35rem' }}>
        Encargado
      </label>
      <input
        id="tarea-resp"
        value={responsable}
        onChange={(e) => setResponsable(e.target.value)}
        placeholder="yo"
        maxLength={80}
        style={{ ...inputStyle, marginBottom: '0.9rem' }}
      />

      <label className="mono-tag" htmlFor="tarea-ini" style={{ display: 'block', marginBottom: '0.35rem' }}>
        Iniciativa
      </label>
      <select
        id="tarea-ini"
        value={iniciativaId}
        onChange={(e) => setIniciativaId(e.target.value)}
        style={{ ...inputStyle, marginBottom: '0.9rem' }}
      >
        <option value="">Sin iniciativa</option>
        {iniciativas.map((ini) => (
          <option key={ini.id} value={ini.id}>
            {ini.nombre}
          </option>
        ))}
      </select>

      <div style={{ display: 'flex', gap: '0.7rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
        <EjeSiNo etiqueta="¿Importante?" valor={importante} onChange={setImportante} />
        <EjeSiNo etiqueta="¿Urgente?" valor={urgente} onChange={setUrgente} />
      </div>
      <p
        className="mono-tag"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          marginBottom: '0.9rem',
          padding: '0.2rem 0.5rem',
          border: `2px solid ${meta.color}`,
          borderRadius: 'var(--radio)',
        }}
      >
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: meta.color }} />
        {meta.titulo} · {meta.pista}
      </p>

      <p className="mono-tag" style={{ marginBottom: '0.4rem' }}>Áreas</p>
      {areas.length === 0 ? (
        <p style={{ opacity: 0.7, marginBottom: '0.9rem' }}>
          Todavía no hay áreas. Crea algunas en la pestaña Áreas.
        </p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.9rem' }}>
          {areas.map((area) => {
            const on = areaIds.includes(area.id)
            return (
              <button
                key={area.id}
                type="button"
                onClick={() => toggleArea(area.id)}
                aria-pressed={on}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.3rem 0.6rem',
                  border: 'var(--borde)',
                  borderRadius: 'var(--radio)',
                  background: on ? area.color : 'var(--papel)',
                  color: on ? '#fff' : 'var(--tinta)',
                  boxShadow: on ? 'var(--sombra-dura-sm)' : 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                }}
              >
                <AreaIcon name={area.icono} size={14} color={on ? '#fff' : area.color} />
                {area.nombre}
              </button>
            )
          })}
        </div>
      )}

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1rem',
          cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          checked={confidencial}
          onChange={(e) => setConfidencial(e.target.checked)}
          style={{ width: 18, height: 18, accentColor: 'var(--sello)' }}
        />
        <ShieldAlert size={16} aria-hidden />
        <span style={{ fontWeight: 600 }}>Confidencial</span>
      </label>
      {confidencial && (
        <p className="mono-tag" style={{ opacity: 0.7, margin: '-0.6rem 0 1rem', lineHeight: 1.4 }}>
          Título y encargado se cifran con tu PIN. Si lo olvidas, no se recuperan.
        </p>
      )}

      <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginBottom: '0.9rem' }}>
        <div style={{ flex: 1, minWidth: 130 }}>
          <label className="mono-tag" htmlFor="tarea-estim" style={{ display: 'block', marginBottom: '0.35rem' }}>
            Estimación (min)
          </label>
          <input
            id="tarea-estim"
            type="number"
            min={0}
            value={estimacion}
            onChange={(e) => setEstimacion(e.target.value)}
            placeholder="opcional"
            style={inputStyle}
          />
        </div>
        <div style={{ flex: 1, minWidth: 130 }}>
          <label className="mono-tag" htmlFor="tarea-dia" style={{ display: 'block', marginBottom: '0.35rem' }}>
            Agendar para
          </label>
          <input
            id="tarea-dia"
            type="date"
            value={dia}
            onChange={(e) => setDia(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      {dia !== '' && !initial && (
        <div style={{ marginBottom: '0.9rem' }}>
          <p className="mono-tag" style={{ marginBottom: '0.4rem' }}>Modo</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {([['checklist', 'Sin horario (checklist)'], ['bloque', 'Con horario']] as const).map(
              ([id, label]) => {
                const on = modo === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setModo(id)}
                    aria-pressed={on}
                    style={{
                      padding: '0.3rem 0.6rem',
                      border: 'var(--borde)',
                      borderRadius: 'var(--radio)',
                      background: on ? 'var(--sello)' : 'var(--papel)',
                      color: on ? '#fff' : 'var(--tinta)',
                      boxShadow: on ? 'var(--sombra-dura-sm)' : 'none',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                    }}
                  >
                    {label}
                  </button>
                )
              },
            )}
          </div>
        </div>
      )}

      {conHorario && (
        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginBottom: '0.9rem' }}>
          <div style={{ flex: 1, minWidth: 90 }}>
            <label className="mono-tag" htmlFor="tarea-ini-h" style={{ display: 'block', marginBottom: '0.35rem' }}>
              Inicio
            </label>
            <input id="tarea-ini-h" type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ flex: 1, minWidth: 90 }}>
            <label className="mono-tag" htmlFor="tarea-fin-h" style={{ display: 'block', marginBottom: '0.35rem' }}>
              Fin
            </label>
            <input id="tarea-fin-h" type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ flex: 1, minWidth: 130 }}>
            <label className="mono-tag" htmlFor="tarea-tipo-b" style={{ display: 'block', marginBottom: '0.35rem' }}>
              Tipo de bloque
            </label>
            <select
              id="tarea-tipo-b"
              value={tipoBloque}
              onChange={(e) => setTipoBloque(e.target.value as TipoBloque)}
              style={inputStyle}
            >
              {TIPOS_BLOQUE.map((t) => (
                <option key={t} value={t}>
                  {TIPO_BLOQUE[t].label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {error && (
        <p style={{ color: 'var(--rag-rojo)', fontWeight: 600, marginBottom: '0.75rem' }}>{error}</p>
      )}

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="submit" className="btn" disabled={busy}>
          <Check size={16} aria-hidden />
          {initial ? 'Guardar' : 'Agregar'}
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
