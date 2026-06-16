/**
 * Matriz de Eisenhower y seleccion semiautomatica del Top 12.
 *
 * Logica pura (sin red ni cifrado) para poder probarla aislada. Trabaja sobre
 * cualquier objeto con los campos minimos de una tarea.
 */

export type Cuadrante = 'q1' | 'q2' | 'q3' | 'q4'

export interface TareaEisenhower {
  id: string
  importante: boolean
  urgente: boolean
  estado: 'pendiente' | 'en_curso' | 'hecha'
  top12_override: 'fijar' | 'excluir' | null
  orden_top12: number | null
  creada_en: string
}

export const TOP12_MAX = 12

export interface MetaCuadrante {
  id: Cuadrante
  titulo: string
  pista: string
  /** Token CSS del color de acento. */
  color: string
}

/** Orden visual y de prioridad: Q1 manda, Q4 es el antojo. */
export const CUADRANTES: MetaCuadrante[] = [
  { id: 'q1', titulo: 'Hacer ya', pista: 'Importante y urgente. Arde.', color: 'var(--rag-rojo)' },
  { id: 'q2', titulo: 'Planificar', pista: 'Importante, sin apuro. Aquí se gana.', color: 'var(--rag-verde)' },
  { id: 'q3', titulo: 'Delegar', pista: 'Urgente pero no tan tuyo. ¿Quién más?', color: 'var(--rag-ambar)' },
  { id: 'q4', titulo: 'Porque sí', pista: 'No tiene sentido, pero igual lo quieres.', color: 'var(--sello)' },
]

const META_POR_ID = new Map(CUADRANTES.map((c) => [c.id, c]))

export function metaCuadrante(c: Cuadrante): MetaCuadrante {
  return META_POR_ID.get(c)!
}

export function cuadranteDe(t: { importante: boolean; urgente: boolean }): Cuadrante {
  if (t.importante && t.urgente) return 'q1'
  if (t.importante) return 'q2'
  if (t.urgente) return 'q3'
  return 'q4'
}

/** Peso de prioridad del cuadrante para el ranking (menor = más prioritario). */
const RANGO_CUADRANTE: Record<Cuadrante, number> = { q1: 0, q2: 1, q3: 2, q4: 3 }

/** Desempate estable: orden manual primero (nulls al final), luego antigüedad. */
function porOrdenManual(a: TareaEisenhower, b: TareaEisenhower): number {
  const oa = a.orden_top12 ?? Number.POSITIVE_INFINITY
  const ob = b.orden_top12 ?? Number.POSITIVE_INFINITY
  if (oa !== ob) return oa - ob
  return a.creada_en.localeCompare(b.creada_en)
}

function porRanking(a: TareaEisenhower, b: TareaEisenhower): number {
  const ra = RANGO_CUADRANTE[cuadranteDe(a)]
  const rb = RANGO_CUADRANTE[cuadranteDe(b)]
  if (ra !== rb) return ra - rb
  return porOrdenManual(a, b)
}

/** Tareas que entran al Top 12, ya ordenadas. Devuelve ids (máx. 12). */
export function seleccionarTop12(tareas: TareaEisenhower[]): string[] {
  const candidatas = tareas.filter(
    (t) => t.estado !== 'hecha' && t.top12_override !== 'excluir',
  )
  const fijadas = candidatas
    .filter((t) => t.top12_override === 'fijar')
    .sort(porOrdenManual)
  const automaticas = candidatas
    .filter((t) => t.top12_override !== 'fijar')
    .sort(porRanking)
  return [...fijadas, ...automaticas].slice(0, TOP12_MAX).map((t) => t.id)
}
