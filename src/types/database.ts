/**
 * Tipos del modelo de datos de El Becario (Fase 1).
 *
 * Hechos a mano para reflejar `supabase/schema.sql`. Cuando el esquema esté
 * aplicado, se pueden regenerar con:
 *   supabase gen types typescript --project-id <id> > src/types/database.ts
 */

export type EstadoRag = 'rojo' | 'ambar' | 'verde'
export type EstadoTarea = 'pendiente' | 'en_curso' | 'hecha'

export interface Area {
  id: string
  user_id: string
  nombre: string
  color: string
  icono: string
  orden: number
  creada_en: string
}

export interface Iniciativa {
  id: string
  user_id: string
  nombre: string
  descripcion: string | null
  stl_responsable: string
  es_equipo: boolean
  estado_rag: EstadoRag
  orden_prioridad: number
  activa: boolean
  creada_en: string
  actualizada_en: string
}

export interface Tarea {
  id: string
  user_id: string
  iniciativa_id: string | null
  titulo: string
  responsable: string
  estimacion_min: number | null
  estado: EstadoTarea
  es_top12: boolean
  es_top_goal: boolean
  orden_top12: number | null
  confidencial: boolean
  fecha: string | null
  creada_en: string
  actualizada_en: string
}

export interface TareaArea {
  tarea_id: string
  area_id: string
  user_id: string
}

export interface RevisionSemanal {
  id: string
  user_id: string
  semana: string
  rag_global: EstadoRag | null
  notas: string | null
  creada_en: string
  actualizada_en: string
}

type WithDefaults<T, OptionalKeys extends keyof T> = Omit<T, OptionalKeys> &
  Partial<Pick<T, OptionalKeys>>

export interface Database {
  public: {
    Tables: {
      area: {
        Row: Area
        Insert: WithDefaults<Area, 'id' | 'user_id' | 'orden' | 'icono' | 'creada_en'>
        Update: Partial<Area>
      }
      iniciativa: {
        Row: Iniciativa
        Insert: WithDefaults<
          Iniciativa,
          | 'id'
          | 'user_id'
          | 'descripcion'
          | 'stl_responsable'
          | 'es_equipo'
          | 'estado_rag'
          | 'orden_prioridad'
          | 'activa'
          | 'creada_en'
          | 'actualizada_en'
        >
        Update: Partial<Iniciativa>
      }
      tarea: {
        Row: Tarea
        Insert: WithDefaults<
          Tarea,
          | 'id'
          | 'user_id'
          | 'iniciativa_id'
          | 'responsable'
          | 'estimacion_min'
          | 'estado'
          | 'es_top12'
          | 'es_top_goal'
          | 'orden_top12'
          | 'confidencial'
          | 'fecha'
          | 'creada_en'
          | 'actualizada_en'
        >
        Update: Partial<Tarea>
      }
      tarea_area: {
        Row: TareaArea
        Insert: WithDefaults<TareaArea, 'user_id'>
        Update: Partial<TareaArea>
      }
      revision_semanal: {
        Row: RevisionSemanal
        Insert: WithDefaults<
          RevisionSemanal,
          'id' | 'user_id' | 'rag_global' | 'notas' | 'creada_en' | 'actualizada_en'
        >
        Update: Partial<RevisionSemanal>
      }
    }
  }
}
