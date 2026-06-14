import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Target, Trash2 } from 'lucide-react'
import type { Bloque } from '../types/database'
import { todayISO, addDays, nombreDia, combinarFechaHora } from '../lib/date'
import {
  type BloqueInput,
  listBloquesDelDia,
  createBloque,
  updateBloque,
  deleteBloque,
} from '../data/bloques'
import { listTop12, type TareaConAreas } from '../data/tareas'
import { BloqueForm } from './BloqueForm'
import { DiaTimeline } from './DiaTimeline'

export function CalendarioModule() {
  const [fechaISO, setFechaISO] = useState(todayISO())
  const [bloques, setBloques] = useState<Bloque[]>([])
  const [tareas, setTareas] = useState<TareaConAreas[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<{ open: boolean; editing: Bloque | null; hora?: string }>({
    open: false,
    editing: null,
  })

  async function load(fecha: string) {
    setLoading(true)
    setError(null)
    try {
      const [b, t] = await Promise.all([listBloquesDelDia(fecha), listTop12()])
      setBloques(b)
      setTareas(t)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude cargar el día.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(fechaISO)
  }, [fechaISO])

  function irA(fecha: string) {
    setForm({ open: false, editing: null })
    setFechaISO(fecha)
  }

  async function handleSave(input: BloqueInput) {
    setBusy(true)
    setError(null)
    try {
      if (form.editing) {
        await updateBloque(form.editing.id, input)
      } else {
        await createBloque(input)
      }
      setForm({ open: false, editing: null })
      await load(fechaISO)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude guardar el bloque.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(b: Bloque) {
    if (!window.confirm(`¿Borro "${b.titulo}"?`)) return
    setBusy(true)
    setError(null)
    try {
      await deleteBloque(b.id)
      setForm({ open: false, editing: null })
      await load(fechaISO)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude borrar el bloque.')
    } finally {
      setBusy(false)
    }
  }

  async function agendarTopGoal(tarea: TareaConAreas) {
    setBusy(true)
    setError(null)
    try {
      await createBloque({
        titulo: tarea.titulo,
        tarea_id: tarea.id,
        tipo: 'top_goal',
        inicio: combinarFechaHora(fechaISO, '09:00'),
        fin: combinarFechaHora(fechaISO, '11:00'),
        protegido: true,
        importante: false,
        aviso_min_antes: null,
      })
      await load(fechaISO)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude agendar el Top Goal.')
    } finally {
      setBusy(false)
    }
  }

  const esHoy = fechaISO === todayISO()
  const topGoalTarea = tareas.find((t) => t.es_top_goal && t.fecha === fechaISO) ?? null
  const topGoalAgendado = bloques.some((b) => b.tipo === 'top_goal')

  return (
    <section>
      {/* Navegación de día */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          marginBottom: '1rem',
        }}
      >
        <button
          type="button"
          className="btn"
          onClick={() => irA(addDays(fechaISO, -1))}
          aria-label="Día anterior"
          style={{ padding: '0.45rem 0.55rem', background: 'var(--papel)', color: 'var(--tinta)' }}
        >
          <ChevronLeft size={18} aria-hidden />
        </button>

        <div style={{ textAlign: 'center', flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 'clamp(1.2rem, 5vw, 1.7rem)', textTransform: 'capitalize' }}>
            {nombreDia(fechaISO)}
          </h1>
          {!esHoy && (
            <button
              type="button"
              onClick={() => irA(todayISO())}
              className="mono-tag"
              style={{ background: 'none', border: 'none', color: 'var(--sello)', cursor: 'pointer', fontWeight: 600 }}
            >
              Volver a hoy
            </button>
          )}
        </div>

        <button
          type="button"
          className="btn"
          onClick={() => irA(addDays(fechaISO, 1))}
          aria-label="Día siguiente"
          style={{ padding: '0.45rem 0.55rem', background: 'var(--papel)', color: 'var(--tinta)' }}
        >
          <ChevronRight size={18} aria-hidden />
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {!form.open && (
          <button
            type="button"
            className="btn"
            onClick={() => setForm({ open: true, editing: null, hora: '09:00' })}
          >
            <Plus size={16} aria-hidden />
            Nuevo bloque
          </button>
        )}
        {topGoalTarea && !topGoalAgendado && !form.open && (
          <button
            type="button"
            className="btn"
            onClick={() => agendarTopGoal(topGoalTarea)}
            disabled={busy}
            style={{ background: 'var(--papel)', color: 'var(--tinta)' }}
          >
            <Target size={16} aria-hidden />
            Agendar Top Goal (2 h protegidas)
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
        <>
          <BloqueForm
            initial={form.editing}
            fechaISO={fechaISO}
            defaultHora={form.hora}
            tareas={tareas.map((t) => ({ id: t.id, titulo: t.titulo }))}
            busy={busy}
            onSave={handleSave}
            onCancel={() => setForm({ open: false, editing: null })}
          />
          {form.editing && (
            <button
              type="button"
              className="btn"
              onClick={() => form.editing && handleDelete(form.editing)}
              disabled={busy}
              style={{ marginBottom: '1rem', background: 'var(--papel)', color: 'var(--rag-rojo)' }}
            >
              <Trash2 size={15} aria-hidden />
              Borrar bloque
            </button>
          )}
        </>
      )}

      {loading ? (
        <p className="mono-tag">Armando tu día…</p>
      ) : (
        <DiaTimeline
          bloques={bloques}
          onSelectBloque={(b) => setForm({ open: true, editing: b })}
          onCrearEnHora={(hora) => setForm({ open: true, editing: null, hora })}
        />
      )}
    </section>
  )
}
