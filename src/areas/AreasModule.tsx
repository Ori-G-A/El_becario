import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Sparkles } from 'lucide-react'
import type { Area } from '../types/database'
import {
  type AreaInput,
  listAreas,
  createArea,
  updateArea,
  deleteArea,
  seedDefaultAreas,
} from '../data/areas'
import { AreaIcon } from '../components/AreaIcon'
import { AreaForm } from './AreaForm'

export function AreasModule() {
  const [areas, setAreas] = useState<Area[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<{ open: boolean; editing: Area | null }>({
    open: false,
    editing: null,
  })

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setAreas(await listAreas())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude cargar las áreas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Carga inicial de áreas al montar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [])

  async function handleSave(input: AreaInput) {
    setBusy(true)
    setError(null)
    try {
      if (form.editing) {
        await updateArea(form.editing.id, input)
      } else {
        await createArea({ ...input, orden: areas.length })
      }
      setForm({ open: false, editing: null })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude guardar el área.')
    } finally {
      setBusy(false)
    }
  }

  async function handleSeed() {
    setBusy(true)
    setError(null)
    try {
      await seedDefaultAreas()
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude cargar las áreas sugeridas.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(area: Area) {
    if (!window.confirm(`¿Borro "${area.nombre}"? Lo que esté clasificado ahí queda sin esa etiqueta.`)) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      await deleteArea(area.id)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude borrar el área.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1rem',
        }}
      >
        <h1 style={{ fontSize: 'clamp(1.8rem, 6vw, 2.6rem)' }}>
          Áreas{' '}
          <span className="mono-tag" style={{ opacity: 0.6 }}>
            {areas.length}
          </span>
        </h1>
        {!form.open && areas.length > 0 && (
          <button
            type="button"
            className="btn"
            onClick={() => setForm({ open: true, editing: null })}
          >
            <Plus size={16} aria-hidden />
            Agregar
          </button>
        )}
      </div>

      {error && (
        <p
          className="card"
          style={{ padding: '0.75rem 1rem', color: 'var(--rag-rojo)', fontWeight: 600, marginBottom: '1rem' }}
        >
          {error}
        </p>
      )}

      {form.open && (
        <AreaForm
          initial={form.editing}
          busy={busy}
          onSave={handleSave}
          onCancel={() => setForm({ open: false, editing: null })}
        />
      )}

      {loading ? (
        <p className="mono-tag">Buscando tus carpetas…</p>
      ) : areas.length === 0 && !form.open ? (
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <p style={{ marginBottom: '0.4rem', fontWeight: 600 }}>
            El archivero está vacío.
          </p>
          <p style={{ marginBottom: '1.1rem', opacity: 0.8 }}>
            Te dejo las 6 áreas de siempre y luego las ajustas. ¿O prefieres
            armarlas tú?
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="btn" onClick={handleSeed} disabled={busy}>
              <Sparkles size={16} aria-hidden />
              Cargar áreas sugeridas
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setForm({ open: true, editing: null })}
              style={{ background: 'var(--papel)', color: 'var(--tinta)' }}
            >
              <Plus size={16} aria-hidden />
              Crear una
            </button>
          </div>
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.6rem' }}>
          {areas.map((area) => (
            <li
              key={area.id}
              className="card"
              style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.7rem 0.9rem' }}
            >
              <span
                aria-hidden
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  width: 38,
                  height: 38,
                  background: area.color,
                  border: 'var(--borde)',
                  borderRadius: 'var(--radio)',
                  flexShrink: 0,
                }}
              >
                <AreaIcon name={area.icono} size={20} color="#fff" />
              </span>
              <strong style={{ flex: 1 }}>{area.nombre}</strong>
              <button
                type="button"
                onClick={() => setForm({ open: true, editing: area })}
                title="Editar"
                aria-label={`Editar ${area.nombre}`}
                className="btn"
                style={{ padding: '0.35rem 0.5rem', background: 'var(--papel)', color: 'var(--tinta)' }}
              >
                <Pencil size={15} aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(area)}
                title="Borrar"
                aria-label={`Borrar ${area.nombre}`}
                disabled={busy}
                className="btn"
                style={{ padding: '0.35rem 0.5rem', background: 'var(--papel)', color: 'var(--tinta)' }}
              >
                <Trash2 size={15} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
