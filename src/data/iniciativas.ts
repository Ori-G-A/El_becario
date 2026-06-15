import { supabase } from '../lib/supabase'
import { cifrarCampo, descifrarCampo } from '../lib/cripto'
import type { EstadoRag, Iniciativa } from '../types/database'

export interface IniciativaInput {
  nombre: string
  descripcion: string | null
  stl_responsable: string
  es_equipo: boolean
  estado_rag: EstadoRag
}

async function descifrarIniciativa(row: Iniciativa): Promise<Iniciativa> {
  return {
    ...row,
    descripcion: row.descripcion ? await descifrarCampo(row.descripcion) : null,
    stl_responsable: await descifrarCampo(row.stl_responsable),
  }
}

async function prepararIniciativa(input: IniciativaInput): Promise<IniciativaInput> {
  return {
    ...input,
    descripcion: input.descripcion ? await cifrarCampo(input.descripcion) : null,
    stl_responsable: await cifrarCampo(input.stl_responsable),
  }
}

async function prepararPatch(
  patch: Partial<IniciativaInput>,
): Promise<Partial<IniciativaInput>> {
  return {
    ...patch,
    descripcion:
      patch.descripcion === undefined || patch.descripcion === null
        ? patch.descripcion
        : await cifrarCampo(patch.descripcion),
    stl_responsable:
      patch.stl_responsable === undefined
        ? undefined
        : await cifrarCampo(patch.stl_responsable),
  }
}

export async function listIniciativas(): Promise<Iniciativa[]> {
  const { data, error } = await supabase
    .from('iniciativa')
    .select('*')
    .eq('activa', true)
    .order('orden_prioridad', { ascending: true })
    .order('creada_en', { ascending: true })
  if (error) throw new Error(error.message)
  return Promise.all((data ?? []).map(descifrarIniciativa))
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
  return Promise.all((data ?? []).map(descifrarIniciativa))
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
  const campos = await prepararIniciativa(input)
  const { data, error } = await supabase
    .from('iniciativa')
    .insert({ ...campos, orden_prioridad: orden })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return descifrarIniciativa(data)
}

export async function updateIniciativa(
  id: string,
  patch: Partial<IniciativaInput>,
): Promise<void> {
  const campos = await prepararPatch(patch)
  const { error } = await supabase.from('iniciativa').update(campos).eq('id', id)
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
  const rows = await Promise.all(
    faltan.map(async (i, idx) => ({
      ...(await prepararIniciativa({ ...i, estado_rag: 'ambar' })),
      orden_prioridad: base + idx,
    })),
  )
  const { error } = await supabase.from('iniciativa').insert(rows)
  if (error) throw new Error(error.message)
  return faltan.length
}
