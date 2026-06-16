import { supabase } from '../lib/supabase'
import { todayISO } from '../lib/date'
import { cifrarCampo, descifrarCampo } from '../lib/cripto'
import { seleccionarTop12 } from '../lib/eisenhower'
import type { EstadoTarea, Tarea } from '../types/database'

/** Tarea junto con los ids de áreas que la clasifican. */
export type TareaConAreas = Tarea & { area_ids: string[] }

export interface TareaInput {
  titulo: string
  responsable: string
  confidencial: boolean
  iniciativa_id: string | null
  importante: boolean
  urgente: boolean
}

async function fetchAreaMap(tareaIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>()
  if (tareaIds.length === 0) return map
  const { data, error } = await supabase
    .from('tarea_area')
    .select('tarea_id, area_id')
    .in('tarea_id', tareaIds)
  if (error) throw new Error(error.message)
  for (const row of data ?? []) {
    const list = map.get(row.tarea_id) ?? []
    list.push(row.area_id)
    map.set(row.tarea_id, list)
  }
  return map
}

export interface TareaResumen {
  id: string
  iniciativa_id: string | null
  estado: EstadoTarea
  es_top12: boolean
}

/** Resumen liviano de todas las tareas (para el dashboard). */
export async function listTareasResumen(): Promise<TareaResumen[]> {
  const { data, error } = await supabase
    .from('tarea')
    .select('id, iniciativa_id, estado, es_top12')
  if (error) throw new Error(error.message)
  return data ?? []
}

/** Todos los vínculos tarea↔área del usuario (para el dashboard). */
export async function listTareaAreas(): Promise<{ tarea_id: string; area_id: string }[]> {
  const { data, error } = await supabase.from('tarea_area').select('tarea_id, area_id')
  if (error) throw new Error(error.message)
  return data ?? []
}

/** Adjunta áreas y descifra título/encargado de cada fila. */
async function hidratarTareas(rows: Tarea[]): Promise<TareaConAreas[]> {
  const areaMap = await fetchAreaMap(rows.map((t) => t.id))
  return Promise.all(
    rows.map(async (t) => ({
      ...t,
      titulo: await descifrarCampo(t.titulo),
      responsable: await descifrarCampo(t.responsable),
      area_ids: areaMap.get(t.id) ?? [],
    })),
  )
}

/** Tareas del Top 12, ordenadas por prioridad, con sus áreas. */
export async function listTop12(): Promise<TareaConAreas[]> {
  const { data, error } = await supabase
    .from('tarea')
    .select('*')
    .eq('es_top12', true)
    .order('orden_top12', { ascending: true, nullsFirst: false })
    .order('creada_en', { ascending: true })
  if (error) throw new Error(error.message)
  return hidratarTareas(data ?? [])
}

/** Todas las tareas con sus áreas (para la matriz de Eisenhower). */
export async function listTareasConAreas(): Promise<TareaConAreas[]> {
  const { data, error } = await supabase
    .from('tarea')
    .select('*')
    .order('orden_top12', { ascending: true, nullsFirst: false })
    .order('creada_en', { ascending: true })
  if (error) throw new Error(error.message)
  return hidratarTareas(data ?? [])
}

/** El Top Goal marcado para hoy, si existe. */
export async function getTopGoalDeHoy(): Promise<Tarea | null> {
  const { data, error } = await supabase
    .from('tarea')
    .select('*')
    .eq('es_top_goal', true)
    .eq('fecha', todayISO())
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

/** Reemplaza el conjunto de áreas de una tarea. */
export async function setTareaAreas(tareaId: string, areaIds: string[]): Promise<void> {
  const del = await supabase.from('tarea_area').delete().eq('tarea_id', tareaId)
  if (del.error) throw new Error(del.error.message)
  if (areaIds.length === 0) return
  const rows = areaIds.map((area_id) => ({ tarea_id: tareaId, area_id }))
  const ins = await supabase.from('tarea_area').insert(rows)
  if (ins.error) throw new Error(ins.error.message)
}

/** Cifra título y encargado si la tarea es confidencial; si no, los deja en claro. */
async function prepararCampos(input: TareaInput): Promise<TareaInput> {
  if (!input.confidencial) return input
  return {
    ...input,
    titulo: await cifrarCampo(input.titulo),
    responsable: await cifrarCampo(input.responsable),
  }
}

export async function createTarea(
  input: TareaInput,
  areaIds: string[],
): Promise<Tarea> {
  // El Top 12 ya no se fuerza al crear: lo decide la selección de Eisenhower.
  const campos = await prepararCampos(input)
  const { data, error } = await supabase.from('tarea').insert(campos).select().single()
  if (error) throw new Error(error.message)
  await setTareaAreas(data.id, areaIds)
  return data
}

export async function updateTarea(
  id: string,
  input: TareaInput,
  areaIds: string[],
): Promise<void> {
  const campos = await prepararCampos(input)
  const { error } = await supabase.from('tarea').update(campos).eq('id', id)
  if (error) throw new Error(error.message)
  await setTareaAreas(id, areaIds)
}

export async function setEstadoTarea(id: string, estado: EstadoTarea): Promise<void> {
  const { error } = await supabase.from('tarea').update({ estado }).eq('id', id)
  if (error) throw new Error(error.message)
}

/** Cambia el cuadrante de Eisenhower (importante × urgente). */
export async function setCuadrante(
  id: string,
  importante: boolean,
  urgente: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('tarea')
    .update({ importante, urgente })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

/** Fuerza o libera la pertenencia al Top 12 ('fijar' | 'excluir' | null). */
export async function setOverrideTop12(
  id: string,
  override: 'fijar' | 'excluir' | null,
): Promise<void> {
  const { error } = await supabase
    .from('tarea')
    .update({ top12_override: override })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteTarea(id: string): Promise<void> {
  const { error } = await supabase.from('tarea').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/**
 * Recalcula la SELECCIÓN de Eisenhower (quién entra al Top 12) y la materializa
 * en `es_top12` / `orden_top12`, escribiendo solo las filas que cambian. Así el
 * panel, el calendario y los respaldos leen siempre un Top 12 consistente.
 *
 * Conserva el orden manual de los miembros que ya estaban (no pisa el arrastre):
 * a los que entran nuevos les asigna un orden al final; a los que salen, null.
 * Devuelve true si tocó algo.
 */
export async function sincronizarTop12(tareas: Tarea[]): Promise<boolean> {
  const seleccion = seleccionarTop12(tareas)
  const enTopSet = new Set(seleccion)
  const porId = new Map(tareas.map((t) => [t.id, t]))

  const esMiembroEstable = (id: string): boolean => {
    const t = porId.get(id)
    return !!t && t.es_top12 && t.orden_top12 !== null
  }

  // Los nuevos se anexan después del mayor orden vigente, en orden de prioridad.
  const ordenVigente = seleccion
    .filter(esMiembroEstable)
    .map((id) => porId.get(id)!.orden_top12 as number)
  let cursor = ordenVigente.length > 0 ? Math.max(...ordenVigente) : -1
  const ordenPlaneado = new Map<string, number>()
  for (const id of seleccion) {
    if (!esMiembroEstable(id)) ordenPlaneado.set(id, ++cursor)
  }

  const updates: Promise<void>[] = []
  for (const t of tareas) {
    const enTop = enTopSet.has(t.id)
    const nuevoOrden = enTop ? (ordenPlaneado.get(t.id) ?? t.orden_top12) : null
    if (t.es_top12 === enTop && t.orden_top12 === nuevoOrden) continue
    updates.push(
      (async () => {
        const { error } = await supabase
          .from('tarea')
          .update({ es_top12: enTop, orden_top12: nuevoOrden })
          .eq('id', t.id)
        if (error) throw new Error(error.message)
      })(),
    )
  }
  if (updates.length === 0) return false
  await Promise.all(updates)
  return true
}

/** Persiste el nuevo orden del Top 12 (orden_top12 = posición). */
export async function reorderTop12(orderedIds: string[]): Promise<void> {
  await Promise.all(
    orderedIds.map((id, i) =>
      supabase
        .from('tarea')
        .update({ orden_top12: i })
        .eq('id', id)
        .then(({ error }) => {
          if (error) throw new Error(error.message)
        }),
    ),
  )
}

/** Marca una tarea como Top Goal de hoy (desmarca cualquier otra del día). */
export async function setTopGoalDeHoy(tareaId: string): Promise<void> {
  const hoy = todayISO()
  const clear = await supabase
    .from('tarea')
    .update({ es_top_goal: false })
    .eq('es_top_goal', true)
    .eq('fecha', hoy)
  if (clear.error) throw new Error(clear.error.message)

  const set = await supabase
    .from('tarea')
    .update({ es_top_goal: true, fecha: hoy })
    .eq('id', tareaId)
  if (set.error) throw new Error(set.error.message)
}

export async function clearTopGoal(tareaId: string): Promise<void> {
  const { error } = await supabase
    .from('tarea')
    .update({ es_top_goal: false })
    .eq('id', tareaId)
  if (error) throw new Error(error.message)
}
