import { useState, createElement, type FormEvent } from 'react'
import { Check, X, Shield, Bell, ShieldAlert } from 'lucide-react'
import type { Bloque, TipoBloque } from '../types/database'
import type { BloqueInput } from '../data/bloques'
import { TIPO_BLOQUE, TIPOS_BLOQUE } from '../lib/bloqueTipos'
import { combinarFechaHora, horaLocal, addDays, fechasEntre, masUnaHora } from '../lib/date'
import { inputStyle } from '../components/styles'

const AVISO_MAX_MIN = 7 * 24 * 60

export function BloqueForm({
  initial,
  fechaISO,
  defaultHora,
  esSerie,
  tareas,
  iniciativas,
  busy,
  onSave,
  onCancel,
}: {
  initial: Bloque | null
  fechaISO: string
  defaultHora?: string
  esSerie: boolean
  tareas: { id: string; titulo: string }[]
  iniciativas: { id: string; nombre: string }[]
  busy: boolean
  onSave: (inputs: BloqueInput[], alcanceSerie?: boolean) => void
  onCancel: () => void
}) {
  const horaInicialInicio = initial ? horaLocal(initial.inicio) : (defaultHora ?? '09:00')
  const horaInicialFin = initial ? horaLocal(initial.fin) : masUnaHora(horaInicialInicio)

  const [titulo, setTitulo] = useState(initial?.titulo ?? '')
  const [tareaId, setTareaId] = useState<string>(initial?.tarea_id ?? '')
  const [iniciativaId, setIniciativaId] = useState<string>(initial?.iniciativa_id ?? '')
  const [tipo, setTipo] = useState<TipoBloque>(initial?.tipo ?? 'trabajo_profundo')
  const [horaInicio, setHoraInicio] = useState(horaInicialInicio)
  const [horaFin, setHoraFin] = useState(horaInicialFin)
  const [protegido, setProtegido] = useState(initial?.protegido ?? false)
  const [importante, setImportante] = useState(initial?.importante ?? false)
  const [confidencial, setConfidencial] = useState(initial?.confidencial ?? false)
  const [aviso, setAviso] = useState<string>(
    initial?.aviso_min_antes != null ? String(initial.aviso_min_antes) : '10',
  )
  const [alcance, setAlcance] = useState<'uno' | 'serie'>('uno')
  const [repetir, setRepetir] = useState<'no' | 'todos' | 'dias'>('no')
  const [desde, setDesde] = useState(fechaISO)
  const [hasta, setHasta] = useState(fechaISO)
  const [diasSel, setDiasSel] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)

  function toggleDia(n: number) {
    setDiasSel((prev) => {
      const next = new Set(prev)
      if (next.has(n)) next.delete(n)
      else next.add(n)
      return next
    })
  }

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
    const avisoMin = Number(aviso)
    if (importante && (!Number.isInteger(avisoMin) || avisoMin < 0 || avisoMin > AVISO_MAX_MIN)) {
      setError('El aviso debe estar entre 0 minutos y 7 días.')
      return
    }

    // Un bloque por fecha. Si el fin es menor o igual al inicio, cruza la
    // medianoche y termina al día siguiente (p. ej. sueño 23:00 → 07:00).
    const bloqueDe = (f: string): BloqueInput => ({
      titulo: limpio,
      tarea_id: tareaId || null,
      // Con tarea, la iniciativa viene de la tarea; la directa solo aplica sin tarea.
      iniciativa_id: tareaId ? null : iniciativaId || null,
      tipo,
      inicio: combinarFechaHora(f, horaInicio),
      fin: combinarFechaHora(horaFin <= horaInicio ? addDays(f, 1) : f, horaFin),
      protegido,
      importante,
      confidencial,
      aviso_min_antes: importante ? avisoMin : null,
    })

    let fechas: string[] = [fechaISO]
    if (!initial && repetir !== 'no') {
      if (hasta < desde) {
        setError('La fecha de fin tiene que ser igual o posterior a la de inicio.')
        return
      }
      if (repetir === 'dias' && diasSel.size === 0) {
        setError('Elegí al menos un día de la semana.')
        return
      }
      fechas = fechasEntre(desde, hasta, repetir === 'todos' ? null : [...diasSel])
      if (fechas.length === 0) {
        setError('Ese rango no incluye ningún día de los que elegiste.')
        return
      }
    }

    onSave(fechas.map(bloqueDe), esSerie && alcance === 'serie')
  }

  return (
    <form onSubmit={submit} className="card" style={{ padding: '1.1rem', marginBottom: '1rem' }}>
      <p className="mono-tag" style={{ color: 'var(--sello)', marginBottom: '0.6rem' }}>
        {initial ? 'Editar bloque' : 'Nuevo bloque'}
      </p>

      {initial && esSerie && (
        <div style={{ marginBottom: '0.9rem' }}>
          <p className="mono-tag" style={{ marginBottom: '0.4rem' }}>Aplicar cambios a</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {([['uno', 'Solo este bloque'], ['serie', 'Toda la serie']] as const).map(([id, label]) => {
              const on = alcance === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setAlcance(id)}
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
            })}
          </div>
        </div>
      )}

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

      {!tareaId && iniciativas.length > 0 && (
        <>
          <label className="mono-tag" htmlFor="bloque-iniciativa" style={{ display: 'block', marginBottom: '0.35rem' }}>
            Iniciativa (opcional)
          </label>
          <select
            id="bloque-iniciativa"
            value={iniciativaId}
            onChange={(e) => setIniciativaId(e.target.value)}
            style={{ ...inputStyle, marginBottom: '0.9rem' }}
          >
            <option value="">Sin iniciativa</option>
            {iniciativas.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nombre}
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

      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', cursor: 'pointer' }}>
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
          El título se cifra con tu PIN. Las notificaciones no podrán mostrarlo.
        </p>
      )}

      {!initial && (
        <div style={{ marginBottom: '1rem' }}>
          <p className="mono-tag" style={{ marginBottom: '0.4rem' }}>Repetir</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {([['no', 'Solo este día'], ['todos', 'Todos los días'], ['dias', 'Días específicos']] as const).map(
              ([id, label]) => {
                const on = repetir === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setRepetir(id)}
                    aria-pressed={on}
                    style={{
                      padding: '0.3rem 0.6rem',
                      border: 'var(--borde)',
                      borderRadius: 'var(--radio)',
                      background: on ? 'var(--tinta)' : 'var(--papel)',
                      color: on ? 'var(--papel)' : 'var(--tinta)',
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

          {repetir === 'dias' && (
            <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.7rem' }}>
              {[{ n: 1, l: 'L' }, { n: 2, l: 'M' }, { n: 3, l: 'X' }, { n: 4, l: 'J' }, { n: 5, l: 'V' }, { n: 6, l: 'S' }, { n: 0, l: 'D' }].map(
                (d) => {
                  const on = diasSel.has(d.n)
                  return (
                    <button
                      key={d.n}
                      type="button"
                      onClick={() => toggleDia(d.n)}
                      aria-pressed={on}
                      style={{
                        width: 34,
                        height: 34,
                        border: 'var(--borde)',
                        borderRadius: 'var(--radio)',
                        background: on ? 'var(--sello)' : 'var(--papel)',
                        color: on ? '#fff' : 'var(--tinta)',
                        cursor: 'pointer',
                        fontWeight: 700,
                      }}
                    >
                      {d.l}
                    </button>
                  )
                },
              )}
            </div>
          )}

          {repetir !== 'no' && (
            <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.7rem' }}>
              <div style={{ flex: 1 }}>
                <label className="mono-tag" htmlFor="bloque-desde" style={{ display: 'block', marginBottom: '0.35rem' }}>
                  Desde
                </label>
                <input id="bloque-desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="mono-tag" htmlFor="bloque-hasta" style={{ display: 'block', marginBottom: '0.35rem' }}>
                  Hasta
                </label>
                <input id="bloque-hasta" type="date" value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} style={inputStyle} />
              </div>
            </div>
          )}
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
