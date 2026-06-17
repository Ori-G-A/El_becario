import { supabase } from '../lib/supabase'
import { diaBounds, addDays } from '../lib/date'
import { cifrarCampo, descifrarCampo } from '../lib/cripto'
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

async function descifrarBloque(row: Bloque): Promise<Bloque> {
  return {
    ...row,
    titulo: await descifrarCampo(row.titulo),
  }
}

async function prepararBloque(input: BloqueInput): Promise<BloqueInput> {
  return {
    ...input,
    titulo: await cifrarCampo(input.titulo),
  }
}

async function prepararPatch(patch: Partial<BloqueInput>): Promise<Partial<BloqueInput>> {
  return {
    ...patch,
    titulo: patch.titulo === undefined ? undefined : await cifrarCampo(patch.titulo),
  }
}

/** Bloques que solapan un dia, incluyendo los que cruzan medianoche. */
export async function listBloquesDelDia(fechaISO: string): Promise<Bloque[]> {
  const { desde, hasta } = diaBounds(fechaISO)
  const { data, error } = await supabase
    .from('bloque')
    .select('*')
    .lt('inicio', hasta)
    .gt('fin', desde)
    .order('inicio', { ascending: true })
  if (error) throw new Error(error.message)
  return Promise.all((data ?? []).map(descifrarBloque))
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
  return Promise.all((data ?? []).map(descifrarBloque))
}

/** Todos los bloques con inicio desde `desdeISO` (para series del dashboard). */
export async function listBloquesDesde(desdeISO: string): Promise<Bloque[]> {
  const { data, error } = await supabase
    .from('bloque')
    .select('*')
    .gte('inicio', desdeISO)
    .order('inicio', { ascending: true })
  if (error) throw new Error(error.message)
  return Promise.all((data ?? []).map(descifrarBloque))
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
  return Promise.all((data ?? []).map(descifrarBloque))
}

export async function createBloque(input: BloqueInput): Promise<Bloque> {
  const campos = await prepararBloque(input)
  const { data, error } = await supabase.from('bloque').insert(campos).select().single()
  if (error) throw new Error(error.message)
  return descifrarBloque(data)
}

/** Crea varios bloques de una (para series recurrentes). */
export async function createBloques(inputs: BloqueInput[]): Promise<void> {
  if (inputs.length === 0) return
  const filas = await Promise.all(inputs.map(prepararBloque))
  const { error } = await supabase.from('bloque').insert(filas)
  if (error) throw new Error(error.message)
}

export async function updateBloque(id: string, patch: Partial<BloqueInput>): Promise<void> {
  // Al editar, re-armamos el aviso por si cambió el horario o la importancia.
  const campos = await prepararPatch(patch)
  const { error } = await supabase
    .from('bloque')
    .update({ ...campos, aviso_enviado: false })
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
