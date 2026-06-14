import { useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Plus, Target } from 'lucide-react'
import type { Area } from '../types/database'
import { listAreas } from '../data/areas'
import {
  type TareaConAreas,
  type TareaInput,
  listTop12,
  createTarea,
  updateTarea,
  deleteTarea,
  reorderTop12,
  setTopGoalDeHoy,
  clearTopGoal,
} from '../data/tareas'
import { todayISO } from '../lib/date'
import { TareaForm } from './TareaForm'
import { TareaRow } from './TareaRow'

const TOP12_MAX = 12

function esTopGoalHoy(t: TareaConAreas): boolean {
  return t.es_top_goal && t.fecha === todayISO()
}

export function Top12Module() {
  const [areas, setAreas] = useState<Area[]>([])
  const [tareas, setTareas] = useState<TareaConAreas[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<{ open: boolean; editing: TareaConAreas | null }>({
    open: false,
    editing: null,
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const areasById = useMemo(() => new Map(areas.map((a) => [a.id, a])), [areas])
  const topGoal = useMemo(() => tareas.find(esTopGoalHoy) ?? null, [tareas])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [a, t] = await Promise.all([listAreas(), listTop12()])
      setAreas(a)
      setTareas(t)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude cargar el Top 12.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [])

  async function handleSave(input: TareaInput, areaIds: string[]) {
    setBusy(true)
    setError(null)
    try {
      if (form.editing) {
        await updateTarea(form.editing.id, input, areaIds)
      } else {
        await createTarea(input, areaIds, tareas.length)
      }
      setForm({ open: false, editing: null })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude guardar la tarea.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(t: TareaConAreas) {
    if (!window.confirm(`¿Borro "${t.titulo}"?`)) return
    setBusy(true)
    setError(null)
    try {
      await deleteTarea(t.id)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude borrar la tarea.')
    } finally {
      setBusy(false)
    }
  }

  async function handleToggleTopGoal(t: TareaConAreas) {
    setBusy(true)
    setError(null)
    try {
      if (esTopGoalHoy(t)) {
        await clearTopGoal(t.id)
      } else {
        await setTopGoalDeHoy(t.id)
      }
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude cambiar el Top Goal.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = tareas.findIndex((t) => t.id === active.id)
    const newIndex = tareas.findIndex((t) => t.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return

    const next = arrayMove(tareas, oldIndex, newIndex)
    setTareas(next) // optimista
    try {
      await reorderTop12(next.map((t) => t.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude guardar el nuevo orden.')
      await load()
    }
  }

  const lleno = tareas.length >= TOP12_MAX

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
          Top 12{' '}
          <span className="mono-tag" style={{ opacity: 0.6 }}>
            {tareas.length}/{TOP12_MAX}
          </span>
        </h1>
        {!form.open && (
          <button
            type="button"
            className="btn"
            onClick={() => setForm({ open: true, editing: null })}
            disabled={lleno}
            title={lleno ? 'El Top 12 está lleno' : 'Agregar tarea'}
          >
            <Plus size={16} aria-hidden />
            Agregar
          </button>
        )}
      </div>

      {/* Bloque Top Goal del día */}
      <div
        className="card"
        style={{
          padding: '1rem',
          marginBottom: '1.25rem',
          borderColor: 'var(--sello)',
          background: topGoal ? 'var(--papel)' : 'var(--papel-hueco)',
        }}
      >
        <p className="mono-tag" style={{ color: 'var(--sello)', marginBottom: '0.3rem' }}>
          <Target size={13} style={{ verticalAlign: '-2px', marginRight: 4 }} aria-hidden />
          Top Goal de hoy · bloque protegido
        </p>
        {topGoal ? (
          <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem' }}>
            {topGoal.titulo}
          </strong>
        ) : (
          <p style={{ opacity: 0.8 }}>
            ¿Y tu Top Goal? Marca una tarea con el blanco{' '}
            <Target size={14} style={{ verticalAlign: '-2px' }} aria-hidden /> y reservo
            tus primeras 2 horas para eso.
          </p>
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
        <TareaForm
          initial={form.editing}
          areas={areas}
          busy={busy}
          onSave={handleSave}
          onCancel={() => setForm({ open: false, editing: null })}
        />
      )}

      {loading ? (
        <p className="mono-tag">Ordenando tus prioridades…</p>
      ) : tareas.length === 0 && !form.open ? (
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <p style={{ marginBottom: '0.4rem', fontWeight: 600 }}>El Top 12 está vacío.</p>
          <p style={{ marginBottom: '1.1rem', opacity: 0.8 }}>
            Doce cosas, no más. Empieza por la que de verdad mueve la aguja.
          </p>
          <button
            type="button"
            className="btn"
            onClick={() => setForm({ open: true, editing: null })}
          >
            <Plus size={16} aria-hidden />
            Agregar la primera
          </button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={tareas.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.6rem' }}>
              {tareas.map((t, i) => (
                <TareaRow
                  key={t.id}
                  tarea={t}
                  posicion={i + 1}
                  areasById={areasById}
                  isTopGoal={esTopGoalHoy(t)}
                  busy={busy}
                  onEdit={() => setForm({ open: true, editing: t })}
                  onDelete={() => handleDelete(t)}
                  onToggleTopGoal={() => handleToggleTopGoal(t)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </section>
  )
}
