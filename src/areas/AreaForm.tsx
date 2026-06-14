import { useState, type FormEvent } from 'react'
import { Check, X } from 'lucide-react'
import type { Area } from '../types/database'
import type { AreaInput } from '../data/areas'
import { AREA_COLORS, DEFAULT_AREA_COLOR } from '../lib/areaColors'
import { AREA_ICON_KEYS, DEFAULT_AREA_ICON } from '../lib/areaIcons'
import { AreaIcon } from '../components/AreaIcon'
import { inputStyle } from '../components/styles'

export function AreaForm({
  initial,
  busy,
  onSave,
  onCancel,
}: {
  initial: Area | null
  busy: boolean
  onSave: (input: AreaInput) => void
  onCancel: () => void
}) {
  const [nombre, setNombre] = useState(initial?.nombre ?? '')
  const [color, setColor] = useState(initial?.color ?? DEFAULT_AREA_COLOR)
  const [icono, setIcono] = useState(initial?.icono ?? DEFAULT_AREA_ICON)
  const [error, setError] = useState<string | null>(null)

  function submit(e: FormEvent) {
    e.preventDefault()
    const limpio = nombre.trim()
    if (!limpio) {
      setError('Ponle un nombre al área.')
      return
    }
    onSave({ nombre: limpio, color, icono })
  }

  return (
    <form
      onSubmit={submit}
      className="card"
      style={{ padding: '1.1rem', marginBottom: '1rem' }}
    >
      <p className="mono-tag" style={{ color: 'var(--sello)', marginBottom: '0.6rem' }}>
        {initial ? 'Editar área' : 'Nueva área'}
      </p>

      <label className="mono-tag" htmlFor="area-nombre" style={{ display: 'block', marginBottom: '0.35rem' }}>
        Nombre
      </label>
      <input
        id="area-nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Ej: Voluntariado"
        maxLength={60}
        autoFocus
        style={{ ...inputStyle, marginBottom: '0.9rem' }}
      />

      <p className="mono-tag" style={{ marginBottom: '0.35rem' }}>Color</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.9rem' }}>
        {AREA_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            title={c}
            aria-label={`Color ${c}`}
            aria-pressed={color === c}
            style={{
              width: 32,
              height: 32,
              background: c,
              border: color === c ? '3px solid var(--tinta)' : '2px solid var(--tinta)',
              borderRadius: 'var(--radio)',
              boxShadow: color === c ? 'var(--sombra-dura-sm)' : 'none',
              cursor: 'pointer',
            }}
          />
        ))}
      </div>

      <p className="mono-tag" style={{ marginBottom: '0.35rem' }}>Icono</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
        {AREA_ICON_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setIcono(key)}
            aria-label={`Icono ${key}`}
            aria-pressed={icono === key}
            style={{
              display: 'grid',
              placeItems: 'center',
              width: 38,
              height: 38,
              background: icono === key ? color : 'var(--papel)',
              color: icono === key ? '#fff' : 'var(--tinta)',
              border: 'var(--borde)',
              borderRadius: 'var(--radio)',
              cursor: 'pointer',
            }}
          >
            <AreaIcon name={key} size={18} color={icono === key ? '#fff' : 'var(--tinta)'} />
          </button>
        ))}
      </div>

      {error && (
        <p style={{ color: 'var(--rag-rojo)', fontWeight: 600, marginBottom: '0.75rem' }}>{error}</p>
      )}

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="submit" className="btn" disabled={busy}>
          <Check size={16} aria-hidden />
          {initial ? 'Guardar' : 'Crear'}
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
