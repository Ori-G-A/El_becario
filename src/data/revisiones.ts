import { supabase } from '../lib/supabase'
import { cifrarCampo, descifrarCampo } from '../lib/cripto'
import type { EstadoRag, RevisionSemanal } from '../types/database'

async function descifrarRevision(row: RevisionSemanal): Promise<RevisionSemanal> {
  return {
    ...row,
    notas: row.notas ? await descifrarCampo(row.notas) : null,
  }
}

export async function listRevisiones(): Promise<RevisionSemanal[]> {
  const { data, error } = await supabase
    .from('revision_semanal')
    .select('*')
    .order('semana', { ascending: false })
  if (error) throw new Error(error.message)
  return Promise.all((data ?? []).map(descifrarRevision))
}

export async function getRevision(semana: string): Promise<RevisionSemanal | null> {
  const { data, error } = await supabase
    .from('revision_semanal')
    .select('*')
    .eq('semana', semana)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? descifrarRevision(data) : null
}

/** Crea o actualiza la revisión de una semana (única por user_id + semana). */
export async function upsertRevision(
  semana: string,
  rag_global: EstadoRag | null,
  notas: string | null,
): Promise<void> {
  const notasCifradas = notas ? await cifrarCampo(notas) : null
  const { error } = await supabase
    .from('revision_semanal')
    .upsert({ semana, rag_global, notas: notasCifradas }, { onConflict: 'user_id,semana' })
  if (error) throw new Error(error.message)
}
