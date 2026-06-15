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

/** Todas las iniciativas (activas y finalizadas), activas primero. */
export async function listIniciativasTodas(): Promise<Iniciativa[]> {
  const { data, error } = await supabase
    .from('iniciativa')
    .select('*')
    .order('activa', { ascending: false })
    .order('orden_prioridad', { ascending: true })
    .order('creada_en', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

/** Finaliza (activa=false) o reabre (activa=true) una iniciativa. */
export async function setActivaIniciativa(id: string, activa: boolean): Promise<void> {
  const { error } = await supabase.from('iniciativa').update({ activa }).eq('id', id)
  if (error) throw new Error(error.message)
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

/** Iniciativas sugeridas por área (personales, STL = yo). */
export const INICIATIVAS_SUGERIDAS: Omit<IniciativaInput, 'estado_rag'>[] = [
  {
    nombre: 'Familia',
    descripcion: 'Tiempo de calidad y tareas de apoyo: regalos, ayudas, presencia.',
    stl_responsable: 'yo',
    es_equipo: false,
  },
  {
    nombre: 'Esposo',
    descripcion: 'Tiempo de calidad, ocio y cuidado: trámites y citas médicas.',
    stl_responsable: 'yo',
    es_equipo: false,
  },
  {
    nombre: 'Universidad',
    descripcion: 'Pendientes del semestre: entregas de las materias matriculadas y papelería.',
    stl_responsable: 'yo',
    es_equipo: false,
  },
  {
    nombre: 'Colegio',
    descripcion: 'Trabajo diario (lun-vie) y papelería de gestión: planillas, observadores, etc.',
    stl_responsable: 'yo',
    es_equipo: false,
  },
]

/** Inserta las iniciativas sugeridas que falten (por nombre). Devuelve cuántas creó. */
export async function seedIniciativasSugeridas(): Promise<number> {
  const existentes = await listIniciativasTodas()
  const nombres = new Set(existentes.map((i) => i.nombre.trim().toLowerCase()))
  const faltan = INICIATIVAS_SUGERIDAS.filter((i) => !nombres.has(i.nombre.toLowerCase()))
  if (faltan.length === 0) return 0
  const base = existentes.length
  const rows = faltan.map((i, idx) => ({
    ...i,
    estado_rag: 'ambar' as EstadoRag,
    orden_prioridad: base + idx,
  }))
  const { error } = await supabase.from('iniciativa').insert(rows)
  if (error) throw new Error(error.message)
  return faltan.length
}
