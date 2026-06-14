import { supabase } from '../lib/supabase'
import type { EstadoRag, RevisionSemanal } from '../types/database'

export async function listRevisiones(): Promise<RevisionSemanal[]> {
  const { data, error } = await supabase
    .from('revision_semanal')
    .select('*')
    .order('semana', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getRevision(semana: string): Promise<RevisionSemanal | null> {
  const { data, error } = await supabase
    .from('revision_semanal')
    .select('*')
    .eq('semana', semana)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

/** Crea o actualiza la revisión de una semana (única por user_id + semana). */
export async function upsertRevision(
  semana: string,
  rag_global: EstadoRag | null,
  notas: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('revision_semanal')
    .upsert({ semana, rag_global, notas }, { onConflict: 'user_id,semana' })
  if (error) throw new Error(error.message)
}
