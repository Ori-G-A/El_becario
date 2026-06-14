import { supabase } from '../lib/supabase'
import type { Area } from '../types/database'

export interface AreaInput {
  nombre: string
  color: string
  icono: string
  orden?: number
}

/** Áreas sugeridas para el primer arranque (spec §2). */
export const DEFAULT_AREAS: Omit<AreaInput, 'orden'>[] = [
  { nombre: 'Personal', color: '#8A63D2', icono: 'user' },
  { nombre: 'Colegio', color: '#2AA9B5', icono: 'school' },
  { nombre: 'Universidad', color: '#6B8E9E', icono: 'graduation-cap' },
  { nombre: 'Familia', color: '#C77D3A', icono: 'users' },
  { nombre: 'Esposo', color: '#E8639B', icono: 'heart' },
  { nombre: 'Oulad', color: '#D98C2B', icono: 'rocket' },
]

export async function listAreas(): Promise<Area[]> {
  const { data, error } = await supabase
    .from('area')
    .select('*')
    .order('orden', { ascending: true })
    .order('creada_en', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createArea(input: AreaInput): Promise<Area> {
  const { data, error } = await supabase
    .from('area')
    .insert(input)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateArea(
  id: string,
  patch: Partial<AreaInput>,
): Promise<Area> {
  const { data, error } = await supabase
    .from('area')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteArea(id: string): Promise<void> {
  const { error } = await supabase.from('area').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/** Inserta las áreas sugeridas (solo tiene sentido con la lista vacía). */
export async function seedDefaultAreas(): Promise<Area[]> {
  const rows = DEFAULT_AREAS.map((a, i) => ({ ...a, orden: i }))
  const { data, error } = await supabase.from('area').insert(rows).select()
  if (error) throw new Error(error.message)
  return data ?? []
}
