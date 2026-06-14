import { supabase } from '../lib/supabase'
import { todayISO } from '../lib/date'
import type { Tarea } from '../types/database'

/** Tarea junto con los ids de áreas que la clasifican. */
export type TareaConAreas = Tarea & { area_ids: string[] }

export interface TareaInput {
  titulo: string
  responsable: string
  confidencial: boolean
  iniciativa_id: string | null
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

/** Tareas del Top 12, ordenadas por prioridad, con sus áreas. */
export async function listTop12(): Promise<TareaConAreas[]> {
  const { data, error } = await supabase
    .from('tarea')
    .select('*')
    .eq('es_top12', true)
    .order('orden_top12', { ascending: true, nullsFirst: false })
    .order('creada_en', { ascending: true })
  if (error) throw new Error(error.message)
  const tareas = data ?? []
  const areaMap = await fetchAreaMap(tareas.map((t) => t.id))
  return tareas.map((t) => ({ ...t, area_ids: areaMap.get(t.id) ?? [] }))
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

export async function createTarea(
  input: TareaInput,
  areaIds: string[],
  orden: number,
): Promise<Tarea> {
  const { data, error } = await supabase
    .from('tarea')
    .insert({ ...input, es_top12: true, orden_top12: orden })
    .select()
    .single()
  if (error) throw new Error(error.message)
  await setTareaAreas(data.id, areaIds)
  return data
}

export async function updateTarea(
  id: string,
  input: TareaInput,
  areaIds: string[],
): Promise<void> {
  const { error } = await supabase.from('tarea').update(input).eq('id', id)
  if (error) throw new Error(error.message)
  await setTareaAreas(id, areaIds)
}

export async function deleteTarea(id: string): Promise<void> {
  const { error } = await supabase.from('tarea').delete().eq('id', id)
  if (error) throw new Error(error.message)
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
