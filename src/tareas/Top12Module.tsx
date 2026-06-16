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
import { Plus, Target, LayoutGrid, ListChecks } from 'lucide-react'
import type { Area, Iniciativa } from '../types/database'
import { listAreas } from '../data/areas'
import { listIniciativas } from '../data/iniciativas'
import {
  type TareaConAreas,
  type TareaInput,
  listTareasConAreas,
  createTarea,
  updateTarea,
  deleteTarea,
  reorderTop12,
  setTopGoalDeHoy,
  clearTopGoal,
  setEstadoTarea,
  setOverrideTop12,
  sincronizarTop12,
} from '../data/tareas'
import { todayISO } from '../lib/date'
import {
  cuadranteDe,
  seleccionarTop12,
  TOP12_MAX,
  type Cuadrante,
} from '../lib/eisenhower'
import { TareaForm } from './TareaForm'
import { TareaRow } from './TareaRow'
import { MatrizEisenhower } from './MatrizEisenhower'

type Vista = 'matriz' | 'top12'

const VISTAS: { id: Vista; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'matriz', label: 'Matriz', icon: LayoutGrid },
  { id: 'top12', label: 'Top 12', icon: ListChecks },
]

function esTopGoalHoy(t: TareaConAreas): boolean {
  return t.es_top_goal && t.fecha === todayISO()
}

/** Orden de display del Top 12: por orden manual (arrastre), nulls al final. */
function porOrdenDisplay(a: TareaConAreas, b: TareaConAreas): number {
  const oa = a.orden_top12 ?? Number.POSITIVE_INFINITY
  const ob = b.orden_top12 ?? Number.POSITIVE_INFINITY
  if (oa !== ob) return oa - ob
  return a.creada_en.localeCompare(b.creada_en)
}

export function Top12Module() {
  const [areas, setAreas] = useState<Area[]>([])
  const [iniciativas, setIniciativas] = useState<Iniciativa[]>([])
  const [tareas, setTareas] = useState<TareaConAreas[]>([])
  const [vista, setVista] = useState<Vista>('matriz')
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
  const iniciativasById = useMemo(
    () => new Map(iniciativas.map((i) => [i.id, i])),
    [iniciativas],
  )
  const topGoal = useMemo(() => tareas.find(esTopGoalHoy) ?? null, [tareas])

  // Selección de Eisenhower: quién entra al Top 12 (set de ids).
  const seleccion = useMemo(() => new Set(seleccionarTop12(tareas)), [tareas])

  // Lista ordenada del Top 12 (membresía + orden manual).
  const top12 = useMemo(
    () => tareas.filter((t) => seleccion.has(t.id)).sort(porOrdenDisplay),
    [tareas, seleccion],
  )
  const rangoPorId = useMemo(
    () => new Map(top12.map((t, i) => [t.id, i + 1])),
    [top12],
  )

  // Tareas pendientes agrupadas por cuadrante (para la matriz).
  const porCuadrante = useMemo(() => {
    const base: Record<Cuadrante, TareaConAreas[]> = { q1: [], q2: [], q3: [], q4: [] }
    for (const t of tareas) {
      if (t.estado === 'hecha') continue
      base[cuadranteDe(t)].push(t)
    }
    return base
  }, [tareas])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [a, ini, t] = await Promise.all([
        listAreas(),
        listIniciativas(),
        listTareasConAreas(),
      ])
      setAreas(a)
      setIniciativas(ini)
      setTareas(t)
      // Materializa es_top12/orden_top12 para panel y calendario (solo diffs).
      sincronizarTop12(t).catch((e) => console.warn('No pude sincronizar el Top 12.', e))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude cargar las tareas.')
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
        await createTarea(input, areaIds)
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

  async function handleToggleHecha(t: TareaConAreas) {
    setBusy(true)
    setError(null)
    try {
      await setEstadoTarea(t.id, t.estado === 'hecha' ? 'pendiente' : 'hecha')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude cambiar el estado.')
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

  async function handleSetOverride(
    t: TareaConAreas,
    override: 'fijar' | 'excluir' | null,
  ) {
    setBusy(true)
    setError(null)
    try {
      await setOverrideTop12(t.id, override)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude cambiar la prioridad.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const ids = top12.map((t) => t.id)
    const oldIndex = ids.indexOf(String(active.id))
    const newIndex = ids.indexOf(String(over.id))
    if (oldIndex < 0 || newIndex < 0) return

    const nuevoOrden = arrayMove(ids, oldIndex, newIndex)
    const posicion = new Map(nuevoOrden.map((id, i) => [id, i]))
    // Optimista: reescribe orden_top12 local para que el memo reordene.
    setTareas((prev) =>
      prev.map((t) =>
        posicion.has(t.id) ? { ...t, orden_top12: posicion.get(t.id)! } : t,
      ),
    )
    try {
      await reorderTop12(nuevoOrden)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude guardar el nuevo orden.')
      await load()
    }
  }

  const pendientes = useMemo(
    () => tareas.filter((t) => t.estado !== 'hecha').length,
    [tareas],
  )

  return (
    <section>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <h1 style={{ fontSize: 'clamp(1.8rem, 6vw, 2.6rem)' }}>
          Tareas{' '}
          <span className="mono-tag" style={{ opacity: 0.6 }}>
            {top12.length}/{TOP12_MAX} en foco · {pendientes} pendientes
          </span>
        </h1>
        {!form.open && (
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

      {/* Conmutador de vista */}
      <nav style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem' }}>
        {VISTAS.map((v) => {
          const activo = vista === v.id
          const Icon = v.icon
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => setVista(v.id)}
              aria-pressed={activo}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.85rem',
                fontWeight: 600,
                border: 'var(--borde)',
                borderRadius: 'var(--radio)',
                background: activo ? 'var(--tinta)' : 'var(--papel)',
                color: activo ? 'var(--papel)' : 'var(--tinta)',
                boxShadow: activo ? 'var(--sombra-dura-sm)' : 'none',
                cursor: 'pointer',
              }}
            >
              <Icon size={15} aria-hidden />
              {v.label}
            </button>
          )
        })}
      </nav>

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
            ¿Y tu Top Goal? Marca una tarea del Top 12 con el blanco{' '}
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
          iniciativas={iniciativas}
          busy={busy}
          onSave={handleSave}
          onCancel={() => setForm({ open: false, editing: null })}
        />
      )}

      {loading ? (
        <p className="mono-tag">Ordenando tus prioridades…</p>
      ) : tareas.length === 0 && !form.open ? (
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <p style={{ marginBottom: '0.4rem', fontWeight: 600 }}>Todavía no hay tareas.</p>
          <p style={{ marginBottom: '1.1rem', opacity: 0.8 }}>
            Anota todo lo que traes en la cabeza. Yo te ayudo a separar lo que arde de lo
            que solo hace ruido.
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
      ) : vista === 'matriz' ? (
        <MatrizEisenhower
          porCuadrante={porCuadrante}
          areasById={areasById}
          seleccion={seleccion}
          rangoPorId={rangoPorId}
          busy={busy}
          onToggleHecha={handleToggleHecha}
          onEdit={(t) => setForm({ open: true, editing: t })}
          onDelete={handleDelete}
          onSetOverride={handleSetOverride}
        />
      ) : top12.length === 0 ? (
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <p style={{ fontWeight: 600, marginBottom: '0.4rem' }}>El Top 12 está vacío.</p>
          <p style={{ opacity: 0.8 }}>
            Marca tareas como importantes o urgentes en la matriz y las subo aquí solas.
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={top12.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.6rem' }}>
              {top12.map((t) => (
                <TareaRow
                  key={t.id}
                  tarea={t}
                  areasById={areasById}
                  iniciativaNombre={
                    t.iniciativa_id ? iniciativasById.get(t.iniciativa_id)?.nombre : undefined
                  }
                  isTopGoal={esTopGoalHoy(t)}
                  busy={busy}
                  onEdit={() => setForm({ open: true, editing: t })}
                  onDelete={() => handleDelete(t)}
                  onToggleTopGoal={() => handleToggleTopGoal(t)}
                  onToggleHecha={() => handleToggleHecha(t)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </section>
  )
}
