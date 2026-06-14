import { useState, type FormEvent } from 'react'
import { Check, X, ShieldAlert } from 'lucide-react'
import type { Area, Iniciativa } from '../types/database'
import type { TareaConAreas, TareaInput } from '../data/tareas'
import { AreaIcon } from '../components/AreaIcon'
import { inputStyle } from '../components/styles'

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
  onSave: (input: TareaInput, areaIds: string[]) => void
  onCancel: () => void
}) {
  const [titulo, setTitulo] = useState(initial?.titulo ?? '')
  const [responsable, setResponsable] = useState(initial?.responsable ?? 'yo')
  const [confidencial, setConfidencial] = useState(initial?.confidencial ?? false)
  const [iniciativaId, setIniciativaId] = useState<string>(initial?.iniciativa_id ?? '')
  const [areaIds, setAreaIds] = useState<string[]>(initial?.area_ids ?? [])
  const [error, setError] = useState<string | null>(null)

  function toggleArea(id: string) {
    setAreaIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const limpio = titulo.trim()
    if (!limpio) {
      setError('Ponle un título a la tarea.')
      return
    }
    onSave(
      {
        titulo: limpio,
        responsable: responsable.trim() || 'yo',
        confidencial,
        iniciativa_id: iniciativaId || null,
      },
      areaIds,
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
        <span className="mono-tag" style={{ opacity: 0.6 }}>(cifrado en Fase 3)</span>
      </label>

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
