/**
 * Tipos del modelo de datos de El Becario (Fase 1).
 *
 * Hechos a mano para reflejar `supabase/schema.sql`. Cuando el esquema esté
 * aplicado, se pueden regenerar con:
 *   supabase gen types typescript --project-id <id> > src/types/database.ts
 */

export type EstadoRag = 'rojo' | 'ambar' | 'verde'
export type EstadoTarea = 'pendiente' | 'en_curso' | 'hecha'
export type TipoBloque =
  | 'top_goal'
  | 'trabajo_profundo'
  | 'reactivo'
  | 'reunion'
  | 'autocuidado'
  | 'sueno'

// NOTA: estos modelos son `type` (no `interface`) a propósito. Un `interface`
// no es asignable a `Record<string, unknown>`, y el cliente de Supabase exige
// esa forma (GenericTable) para inferir Row/Insert/Update; con interface, todo
// degradaba a `never`.

export type Area = {
  id: string
  user_id: string
  nombre: string
  color: string
  icono: string
  orden: number
  creada_en: string
}

export type Iniciativa = {
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

export type Tarea = {
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

export type TareaArea = {
  tarea_id: string
  area_id: string
  user_id: string
}

export type RevisionSemanal = {
  id: string
  user_id: string
  semana: string
  rag_global: EstadoRag | null
  notas: string | null
  creada_en: string
  actualizada_en: string
}

export type Bloque = {
  id: string
  user_id: string
  tarea_id: string | null
  titulo: string
  inicio: string
  fin: string
  real_inicio: string | null
  real_fin: string | null
  tipo: TipoBloque
  protegido: boolean
  importante: boolean
  aviso_min_antes: number | null
  creada_en: string
  actualizada_en: string
}

type WithDefaults<T, OptionalKeys extends keyof T> = Omit<T, OptionalKeys> &
  Partial<Pick<T, OptionalKeys>>

type Table<TRow, TInsert, TUpdate> = {
  Row: TRow
  Insert: TInsert
  Update: TUpdate
  Relationships: []
}

export interface Database {
  public: {
    Tables: {
      area: Table<
        Area,
        WithDefaults<Area, 'id' | 'user_id' | 'orden' | 'icono' | 'creada_en'>,
        Partial<Area>
      >
      iniciativa: Table<
        Iniciativa,
        WithDefaults<
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
        >,
        Partial<Iniciativa>
      >
      tarea: Table<
        Tarea,
        WithDefaults<
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
        >,
        Partial<Tarea>
      >
      tarea_area: Table<
        TareaArea,
        WithDefaults<TareaArea, 'user_id'>,
        Partial<TareaArea>
      >
      revision_semanal: Table<
        RevisionSemanal,
        WithDefaults<
          RevisionSemanal,
          'id' | 'user_id' | 'rag_global' | 'notas' | 'creada_en' | 'actualizada_en'
        >,
        Partial<RevisionSemanal>
      >
      bloque: Table<
        Bloque,
        WithDefaults<
          Bloque,
          | 'id'
          | 'user_id'
          | 'tarea_id'
          | 'real_inicio'
          | 'real_fin'
          | 'tipo'
          | 'protegido'
          | 'importante'
          | 'aviso_min_antes'
          | 'creada_en'
          | 'actualizada_en'
        >,
        Partial<Bloque>
      >
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      estado_rag: EstadoRag
      estado_tarea: EstadoTarea
      tipo_bloque: TipoBloque
    }
    CompositeTypes: Record<string, never>
  }
}
