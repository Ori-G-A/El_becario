import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Target, Trash2, CalendarDays, CalendarRange } from 'lucide-react'
import type { Bloque } from '../types/database'
import {
  todayISO,
  addDays,
  nombreDia,
  combinarFechaHora,
  fechaLocalDeISO,
  lunesDe,
  formatFechaLarga,
} from '../lib/date'
import {
  type BloqueInput,
  listBloquesDelDia,
  listBloquesDeSemana,
  createBloque,
  updateBloque,
  deleteBloque,
} from '../data/bloques'
import { listTop12, type TareaConAreas } from '../data/tareas'
import { BloqueForm } from './BloqueForm'
import { DiaTimeline } from './DiaTimeline'
import { SemanaTimeline } from './SemanaTimeline'

type Modo = 'dia' | 'semana'

export function CalendarioModule() {
  const [modo, setModo] = useState<Modo>('dia')
  const [fechaISO, setFechaISO] = useState(todayISO())
  const [bloques, setBloques] = useState<Bloque[]>([])
  const [tareas, setTareas] = useState<TareaConAreas[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<{ open: boolean; editing: Bloque | null; hora?: string; fecha: string }>({
    open: false,
    editing: null,
    fecha: todayISO(),
  })

  const lunesISO = lunesDe(fechaISO)

  async function load(modoActual: Modo, fecha: string) {
    setLoading(true)
    setError(null)
    try {
      const consulta =
        modoActual === 'dia' ? listBloquesDelDia(fecha) : listBloquesDeSemana(lunesDe(fecha))
      const [b, t] = await Promise.all([consulta, listTop12()])
      setBloques(b)
      setTareas(t)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude cargar el calendario.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(modo, fechaISO)
  }, [modo, fechaISO])

  function navegar(deltaDias: number) {
    setForm((f) => ({ ...f, open: false, editing: null }))
    setFechaISO((prev) => addDays(prev, deltaDias))
  }

  function volverAHoy() {
    setForm((f) => ({ ...f, open: false, editing: null }))
    setFechaISO(todayISO())
  }

  function abrirNuevo(fecha: string, hora?: string) {
    setForm({ open: true, editing: null, hora, fecha })
  }

  function abrirEdicion(b: Bloque) {
    setForm({ open: true, editing: b, fecha: fechaLocalDeISO(b.inicio) })
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
      setForm((f) => ({ ...f, open: false, editing: null }))
      await load(modo, fechaISO)
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
      setForm((f) => ({ ...f, open: false, editing: null }))
      await load(modo, fechaISO)
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
      await load(modo, fechaISO)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude agendar el Top Goal.')
    } finally {
      setBusy(false)
    }
  }

  const esHoy = fechaISO === todayISO()
  const topGoalTarea = tareas.find((t) => t.es_top_goal && t.fecha === fechaISO) ?? null
  const topGoalAgendado = bloques.some(
    (b) => b.tipo === 'top_goal' && fechaLocalDeISO(b.inicio) === fechaISO,
  )

  const titulo =
    modo === 'dia'
      ? nombreDia(fechaISO)
      : `Semana del ${formatFechaLarga(lunesISO)}`

  return (
    <section>
      {/* Toggle Día / Semana */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.9rem' }}>
        {(['dia', 'semana'] as Modo[]).map((m) => {
          const activo = modo === m
          const Icon = m === 'dia' ? CalendarDays : CalendarRange
          return (
            <button
              key={m}
              type="button"
              onClick={() => setModo(m)}
              aria-pressed={activo}
              className="btn"
              style={{
                background: activo ? 'var(--tinta)' : 'var(--papel)',
                color: activo ? 'var(--papel)' : 'var(--tinta)',
                boxShadow: activo ? 'var(--sombra-dura-sm)' : 'none',
              }}
            >
              <Icon size={16} aria-hidden />
              {m === 'dia' ? 'Día' : 'Semana'}
            </button>
          )
        })}
      </div>

      {/* Navegación */}
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
          onClick={() => navegar(modo === 'dia' ? -1 : -7)}
          aria-label={modo === 'dia' ? 'Día anterior' : 'Semana anterior'}
          style={{ padding: '0.45rem 0.55rem', background: 'var(--papel)', color: 'var(--tinta)' }}
        >
          <ChevronLeft size={18} aria-hidden />
        </button>

        <div style={{ textAlign: 'center', flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 'clamp(1.15rem, 4.5vw, 1.6rem)', textTransform: 'capitalize' }}>
            {titulo}
          </h1>
          {!(modo === 'dia' && esHoy) && (
            <button
              type="button"
              onClick={volverAHoy}
              className="mono-tag"
              style={{ background: 'none', border: 'none', color: 'var(--sello)', cursor: 'pointer', fontWeight: 600 }}
            >
              {modo === 'dia' ? 'Volver a hoy' : 'Semana actual'}
            </button>
          )}
        </div>

        <button
          type="button"
          className="btn"
          onClick={() => navegar(modo === 'dia' ? 1 : 7)}
          aria-label={modo === 'dia' ? 'Día siguiente' : 'Semana siguiente'}
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
            onClick={() => abrirNuevo(modo === 'dia' ? fechaISO : todayISO(), modo === 'dia' ? '09:00' : undefined)}
          >
            <Plus size={16} aria-hidden />
            Nuevo bloque
          </button>
        )}
        {modo === 'dia' && topGoalTarea && !topGoalAgendado && !form.open && (
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
            fechaISO={form.fecha}
            defaultHora={form.hora}
            tareas={tareas.map((t) => ({ id: t.id, titulo: t.titulo }))}
            busy={busy}
            onSave={handleSave}
            onCancel={() => setForm((f) => ({ ...f, open: false, editing: null }))}
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
        <p className="mono-tag">Armando tu {modo === 'dia' ? 'día' : 'semana'}…</p>
      ) : modo === 'dia' ? (
        <DiaTimeline
          bloques={bloques}
          onSelectBloque={abrirEdicion}
          onCrearEnHora={(hora) => abrirNuevo(fechaISO, hora)}
        />
      ) : (
        <SemanaTimeline
          lunesISO={lunesISO}
          bloques={bloques}
          onSelectBloque={abrirEdicion}
          onCrear={(fecha, hora) => abrirNuevo(fecha, hora)}
        />
      )}
    </section>
  )
}
