import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Target, Trash2, CalendarDays, CalendarRange } from 'lucide-react'
import type { Bloque, Iniciativa } from '../types/database'
import {
  todayISO,
  addDays,
  nombreDia,
  combinarFechaHora,
  fechaLocalDeISO,
  lunesDe,
  formatFechaLarga,
  proximaMediaHora,
} from '../lib/date'
import {
  type BloqueInput,
  listBloquesDelDia,
  listBloquesDeSemana,
  createBloque,
  createBloques,
  updateBloque,
  updateSerie,
  deleteBloque,
  deleteSerie,
  setRealInicio,
  setRealFin,
} from '../data/bloques'
import {
  listTop12,
  listTareasAgendadas,
  setAgendadaPara,
  setEstadoTarea,
  crearPendienteRapido,
  type TareaConAreas,
} from '../data/tareas'
import { listIniciativas } from '../data/iniciativas'
import { sumarCafe } from '../easter/cafe'
import { BloqueForm } from './BloqueForm'
import { ChecklistDia } from './ChecklistDia'
import { PendienteRapidoForm } from './PendienteRapidoForm'
import { DiaTimeline } from './DiaTimeline'
import { SemanaTimeline } from './SemanaTimeline'
import { RegistroReal } from './RegistroReal'

type Modo = 'dia' | 'semana'

export function CalendarioModule() {
  const [modo, setModo] = useState<Modo>('dia')
  const [fechaISO, setFechaISO] = useState(todayISO())
  const [bloques, setBloques] = useState<Bloque[]>([])
  const [tareas, setTareas] = useState<TareaConAreas[]>([])
  const [pendientes, setPendientes] = useState<TareaConAreas[]>([])
  const [iniciativas, setIniciativas] = useState<Iniciativa[]>([])
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
      const [b, t, p] = await Promise.all([
        consulta,
        listTop12(),
        modoActual === 'dia' ? listTareasAgendadas(fecha) : Promise.resolve([]),
      ])
      setBloques(b)
      setTareas(t)
      setPendientes(p)
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

  useEffect(() => {
    listIniciativas()
      .then(setIniciativas)
      .catch(() => {
        // Sin iniciativas no se bloquea el pendiente rápido: queda "Sin iniciativa".
      })
  }, [])

  async function crearPendiente(titulo: string, iniciativaId: string | null, estimacionMin: number | null) {
    setBusy(true)
    setError(null)
    try {
      const tareaId = await crearPendienteRapido(titulo, iniciativaId, estimacionMin)
      // Decidir de antemano cuánto tiempo dedicarle: un bloque reactivo desde
      // ahora, para que el imprevisto también cuente en las métricas de la semana.
      if (estimacionMin != null) {
        const inicio = new Date().toISOString()
        await createBloque({
          titulo,
          tarea_id: tareaId,
          tipo: 'reactivo',
          inicio,
          fin: new Date(new Date(inicio).getTime() + estimacionMin * 60_000).toISOString(),
          protegido: false,
          importante: false,
          confidencial: false,
          aviso_min_antes: null,
        })
      }
      await load(modo, fechaISO)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude crear el pendiente.')
    } finally {
      setBusy(false)
    }
  }

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

  /** Para hoy, la próxima media hora; para otros días, 09:00. */
  function horaSugerida(fecha: string): string {
    return fecha === todayISO() ? proximaMediaHora() : '09:00'
  }

  function abrirEdicion(b: Bloque) {
    setForm({ open: true, editing: b, fecha: fechaLocalDeISO(b.inicio) })
  }

  async function handleSave(inputs: BloqueInput[], alcanceSerie?: boolean) {
    setBusy(true)
    setError(null)
    try {
      if (form.editing) {
        if (alcanceSerie && form.editing.serie_id) {
          await updateSerie(form.editing.serie_id, inputs[0])
        } else {
          await updateBloque(form.editing.id, inputs[0])
        }
      } else {
        await createBloques(inputs)
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

  async function handleDeleteSerie(b: Bloque) {
    if (!b.serie_id) return
    if (!window.confirm('¿Borro TODOS los bloques de esta serie recurrente?')) return
    setBusy(true)
    setError(null)
    try {
      await deleteSerie(b.serie_id)
      setForm((f) => ({ ...f, open: false, editing: null }))
      await load(modo, fechaISO)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude borrar la serie.')
    } finally {
      setBusy(false)
    }
  }

  /** Corre un bloque `deltaMin` minutos (o un día entero) sin pasar por el formulario. */
  async function moverBloque(b: Bloque, deltaMin: number) {
    setBusy(true)
    setError(null)
    try {
      await updateBloque(b.id, {
        inicio: new Date(new Date(b.inicio).getTime() + deltaMin * 60_000).toISOString(),
        fin: new Date(new Date(b.fin).getTime() + deltaMin * 60_000).toISOString(),
      })
      setForm((f) => ({ ...f, open: false, editing: null }))
      await load(modo, fechaISO)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude mover el bloque.')
    } finally {
      setBusy(false)
    }
  }

  async function marcarReal(b: Bloque, campo: 'real_inicio' | 'real_fin', valor: string | null) {
    setBusy(true)
    setError(null)
    try {
      if (campo === 'real_inicio') await setRealInicio(b.id, valor)
      else await setRealFin(b.id, valor)
      // Café del becario: un Top Goal recién completado suma una taza.
      if (campo === 'real_fin' && valor && b.tipo === 'top_goal' && b.real_inicio) {
        void sumarCafe()
      }
      setBloques((prev) => prev.map((x) => (x.id === b.id ? { ...x, [campo]: valor } : x)))
      setForm((f) =>
        f.editing && f.editing.id === b.id
          ? { ...f, editing: { ...f.editing, [campo]: valor } }
          : f,
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude guardar el registro.')
    } finally {
      setBusy(false)
    }
  }

  async function togglePendiente(t: TareaConAreas) {
    setBusy(true)
    setError(null)
    try {
      await setEstadoTarea(t.id, t.estado === 'hecha' ? 'pendiente' : 'hecha')
      await load(modo, fechaISO)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude cambiar el pendiente.')
    } finally {
      setBusy(false)
    }
  }

  async function quitarPendiente(t: TareaConAreas) {
    setBusy(true)
    setError(null)
    try {
      await setAgendadaPara(t.id, null)
      await load(modo, fechaISO)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude sacar la tarea del día.')
    } finally {
      setBusy(false)
    }
  }

  async function agendarTopGoal(tarea: TareaConAreas) {
    setBusy(true)
    setError(null)
    try {
      const inicio = combinarFechaHora(fechaISO, horaSugerida(fechaISO))
      await createBloque({
        // El bloque no se cifra: si la tarea es confidencial, no copiamos su título.
        titulo: tarea.confidencial ? 'Top Goal protegido' : tarea.titulo,
        tarea_id: tarea.id,
        tipo: 'top_goal',
        inicio,
        fin: new Date(new Date(inicio).getTime() + 2 * 3600_000).toISOString(),
        protegido: true,
        importante: false,
        confidencial: false,
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
            onClick={() => {
              const fecha = modo === 'dia' ? fechaISO : todayISO()
              abrirNuevo(fecha, horaSugerida(fecha))
            }}
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
            key={form.editing ? form.editing.id : 'nuevo'}
            initial={form.editing}
            fechaISO={form.fecha}
            defaultHora={form.hora}
            esSerie={form.editing?.serie_id != null}
            tareas={tareas.map((t) => ({ id: t.id, titulo: t.titulo }))}
            busy={busy}
            onSave={handleSave}
            onCancel={() => setForm((f) => ({ ...f, open: false, editing: null }))}
          />
          {form.editing && (
            <>
              <RegistroReal bloque={form.editing} busy={busy} onMarcar={(campo, valor) => form.editing && marcarReal(form.editing, campo, valor)} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                {([
                  ['−30 min', -30],
                  ['+30 min', 30],
                  ['→ mañana', 24 * 60],
                ] as const).map(([label, delta]) => (
                  <button
                    key={label}
                    type="button"
                    className="btn"
                    onClick={() => form.editing && moverBloque(form.editing, delta)}
                    disabled={busy}
                    style={{ background: 'var(--papel)', color: 'var(--tinta)' }}
                  >
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  className="btn"
                  onClick={() => form.editing && handleDelete(form.editing)}
                  disabled={busy}
                  style={{ background: 'var(--papel)', color: 'var(--rag-rojo)' }}
                >
                  <Trash2 size={15} aria-hidden />
                  Borrar bloque
                </button>
                {form.editing.serie_id && (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => form.editing && handleDeleteSerie(form.editing)}
                    disabled={busy}
                    style={{ background: 'var(--papel)', color: 'var(--rag-rojo)' }}
                  >
                    <Trash2 size={15} aria-hidden />
                    Borrar serie
                  </button>
                )}
              </div>
            </>
          )}
        </>
      )}

      {loading ? (
        <p className="mono-tag">Armando tu {modo === 'dia' ? 'día' : 'semana'}…</p>
      ) : modo === 'dia' ? (
        <>
          {esHoy && (
            <PendienteRapidoForm iniciativas={iniciativas} busy={busy} onCrear={crearPendiente} />
          )}
          <ChecklistDia
            tareas={pendientes}
            busy={busy}
            onToggleHecha={togglePendiente}
            onQuitar={quitarPendiente}
          />
          <DiaTimeline
            fechaISO={fechaISO}
            bloques={bloques}
            onSelectBloque={abrirEdicion}
            onCrearEnHora={(hora) => abrirNuevo(fechaISO, hora)}
            onMover={moverBloque}
          />
        </>
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
