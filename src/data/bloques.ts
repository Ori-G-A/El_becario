import { supabase } from '../lib/supabase'
import { diaBounds, addDays } from '../lib/date'
import type { Bloque, TipoBloque } from '../types/database'

export interface BloqueInput {
  titulo: string
  tarea_id: string | null
  tipo: TipoBloque
  inicio: string
  fin: string
  protegido: boolean
  importante: boolean
  aviso_min_antes: number | null
}

/** Bloques que SOLAPAN un día (incluye los que cruzan medianoche), por inicio. */
export async function listBloquesDelDia(fechaISO: string): Promise<Bloque[]> {
  const { desde, hasta } = diaBounds(fechaISO)
  const { data, error } = await supabase
    .from('bloque')
    .select('*')
    .lt('inicio', hasta)
    .gt('fin', desde)
    .order('inicio', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

/** Bloques que solapan la semana (lunes..domingo) que arranca en `lunesISO`. */
export async function listBloquesDeSemana(lunesISO: string): Promise<Bloque[]> {
  const desde = diaBounds(lunesISO).desde
  const hasta = diaBounds(addDays(lunesISO, 6)).hasta
  const { data, error } = await supabase
    .from('bloque')
    .select('*')
    .lt('inicio', hasta)
    .gt('fin', desde)
    .order('inicio', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

/** Todos los bloques con inicio desde `desdeISO` (para series del dashboard). */
export async function listBloquesDesde(desdeISO: string): Promise<Bloque[]> {
  const { data, error } = await supabase
    .from('bloque')
    .select('*')
    .gte('inicio', desdeISO)
    .order('inicio', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

/** Bloques marcados como importantes con inicio en los próximos `dias`. */
export async function listImportantesProximos(dias = 14): Promise<Bloque[]> {
  const ahora = new Date().toISOString()
  const hasta = new Date(Date.now() + dias * 86_400_000).toISOString()
  const { data, error } = await supabase
    .from('bloque')
    .select('*')
    .eq('importante', true)
    .gte('inicio', ahora)
    .lt('inicio', hasta)
    .order('inicio', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createBloque(input: BloqueInput): Promise<Bloque> {
  const { data, error } = await supabase.from('bloque').insert(input).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateBloque(id: string, patch: Partial<BloqueInput>): Promise<void> {
  // Al editar, re-armamos el aviso por si cambió el horario o la importancia.
  const { error } = await supabase
    .from('bloque')
    .update({ ...patch, aviso_enviado: false })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteBloque(id: string): Promise<void> {
  const { error } = await supabase.from('bloque').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/** Marca/desmarca el inicio real de un bloque (un toque). */
export async function setRealInicio(id: string, valor: string | null): Promise<void> {
  const { error } = await supabase.from('bloque').update({ real_inicio: valor }).eq('id', id)
  if (error) throw new Error(error.message)
}

/** Marca/desmarca el fin real de un bloque (un toque). */
export async function setRealFin(id: string, valor: string | null): Promise<void> {
  const { error } = await supabase.from('bloque').update({ real_fin: valor }).eq('id', id)
  if (error) throw new Error(error.message)
}
