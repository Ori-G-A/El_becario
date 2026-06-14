import { supabase } from '../lib/supabase'
import type { EstadoRag, Iniciativa } from '../types/database'

export interface IniciativaInput {
  nombre: string
  descripcion: string | null
  stl_responsable: string
  es_equipo: boolean
  estado_rag: EstadoRag
}

export async function listIniciativas(): Promise<Iniciativa[]> {
  const { data, error } = await supabase
    .from('iniciativa')
    .select('*')
    .eq('activa', true)
    .order('orden_prioridad', { ascending: true })
    .order('creada_en', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createIniciativa(
  input: IniciativaInput,
  orden: number,
): Promise<Iniciativa> {
  const { data, error } = await supabase
    .from('iniciativa')
    .insert({ ...input, orden_prioridad: orden })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateIniciativa(
  id: string,
  patch: Partial<IniciativaInput>,
): Promise<void> {
  const { error } = await supabase.from('iniciativa').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

/** Atajo para cambiar solo el RAG manual desde la tarjeta. */
export async function setRag(id: string, estado_rag: EstadoRag): Promise<void> {
  const { error } = await supabase
    .from('iniciativa')
    .update({ estado_rag })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteIniciativa(id: string): Promise<void> {
  const { error } = await supabase.from('iniciativa').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
