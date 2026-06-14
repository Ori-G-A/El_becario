import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Users, User, Check, RotateCcw } from 'lucide-react'
import type { EstadoRag, Iniciativa } from '../types/database'
import {
  type IniciativaInput,
  listIniciativasTodas,
  createIniciativa,
  updateIniciativa,
  setRag,
  setActivaIniciativa,
  deleteIniciativa,
} from '../data/iniciativas'
import { RagSelector } from '../components/RagSelector'
import { IniciativaForm } from './IniciativaForm'

export function IniciativasModule() {
  const [items, setItems] = useState<Iniciativa[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<{ open: boolean; editing: Iniciativa | null }>({
    open: false,
    editing: null,
  })

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setItems(await listIniciativasTodas())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude cargar las iniciativas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [])

  async function handleSave(input: IniciativaInput) {
    setBusy(true)
    setError(null)
    try {
      if (form.editing) {
        await updateIniciativa(form.editing.id, input)
      } else {
        await createIniciativa(input, items.length)
      }
      setForm({ open: false, editing: null })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude guardar la iniciativa.')
    } finally {
      setBusy(false)
    }
  }

  async function handleRag(ini: Iniciativa, estado: EstadoRag) {
    setItems((prev) => prev.map((i) => (i.id === ini.id ? { ...i, estado_rag: estado } : i)))
    try {
      await setRag(ini.id, estado)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude cambiar el RAG.')
      await load()
    }
  }

  async function handleFinalizar(ini: Iniciativa) {
    setBusy(true)
    setError(null)
    try {
      await setActivaIniciativa(ini.id, !ini.activa)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude cambiar la iniciativa.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(ini: Iniciativa) {
    if (!window.confirm(`¿Borro "${ini.nombre}"? Las tareas vinculadas quedan sin iniciativa.`)) return
    setBusy(true)
    setError(null)
    try {
      await deleteIniciativa(ini.id)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude borrar la iniciativa.')
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
          Iniciativas{' '}
          <span className="mono-tag" style={{ opacity: 0.6 }}>
            {items.length}
          </span>
        </h1>
        {!form.open && (
          <button type="button" className="btn" onClick={() => setForm({ open: true, editing: null })}>
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
        <IniciativaForm
          initial={form.editing}
          busy={busy}
          onSave={handleSave}
          onCancel={() => setForm({ open: false, editing: null })}
        />
      )}

      {loading ? (
        <p className="mono-tag">Revisando los proyectos…</p>
      ) : items.length === 0 && !form.open ? (
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <p style={{ marginBottom: '0.4rem', fontWeight: 600 }}>Sin iniciativas todavía.</p>
          <p style={{ marginBottom: '1.1rem', opacity: 0.8 }}>
            Una iniciativa es una línea de trabajo: Oulad, la tesis, lo que sea. Cada
            una con su semáforo.
          </p>
          <button type="button" className="btn" onClick={() => setForm({ open: true, editing: null })}>
            <Plus size={16} aria-hidden />
            Crear la primera
          </button>
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.6rem' }}>
          {items.map((ini) => (
            <li
              key={ini.id}
              className="card"
              style={{ padding: '0.8rem 0.9rem', opacity: ini.activa ? 1 : 0.6 }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.8rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '1.05rem' }}>{ini.nombre}</strong>
                    {!ini.activa && (
                      <span className="sello-goma" style={{ fontSize: '0.7rem', padding: '0.05em 0.4em' }}>
                        Hecho
                      </span>
                    )}
                    <span
                      className="mono-tag"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        opacity: 0.7,
                      }}
                    >
                      {ini.es_equipo ? <Users size={12} aria-hidden /> : <User size={12} aria-hidden />}
                      {ini.es_equipo ? 'Equipo' : 'Personal'}
                    </span>
                  </div>
                  {ini.descripcion && (
                    <p style={{ opacity: 0.8, margin: '0.25rem 0 0', fontSize: '0.92rem' }}>
                      {ini.descripcion}
                    </p>
                  )}
                  <p className="mono-tag" style={{ opacity: 0.7, marginTop: '0.3rem' }}>
                    STL: {ini.stl_responsable}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => handleFinalizar(ini)}
                    disabled={busy}
                    title={ini.activa ? 'Finalizar' : 'Reabrir'}
                    style={{ padding: '0.3rem 0.4rem', background: 'var(--papel)', color: 'var(--tinta)' }}
                  >
                    {ini.activa ? <Check size={15} aria-hidden /> : <RotateCcw size={15} aria-hidden />}
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setForm({ open: true, editing: ini })}
                    title="Editar"
                    style={{ padding: '0.3rem 0.4rem', background: 'var(--papel)', color: 'var(--tinta)' }}
                  >
                    <Pencil size={15} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => handleDelete(ini)}
                    disabled={busy}
                    title="Borrar"
                    style={{ padding: '0.3rem 0.4rem', background: 'var(--papel)', color: 'var(--tinta)' }}
                  >
                    <Trash2 size={15} aria-hidden />
                  </button>
                </div>
              </div>
              <div style={{ marginTop: '0.7rem' }}>
                <RagSelector value={ini.estado_rag} onChange={(estado) => handleRag(ini, estado)} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
