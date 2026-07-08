import type {
  Area,
  Bloque,
  EstadoRag,
  EstadoTarea,
  Iniciativa,
  RevisionSemanal,
} from '../types/database'
import { calcularMetricas, duracionMin } from './metricas'
import { addDays, fechaLocalDeISO, mondayISO } from './date'

interface TareaLite {
  iniciativa_id: string | null
  estado: EstadoTarea
  es_top12: boolean
}

function etiquetaCorta(fechaISO: string): string {
  const [, m, d] = fechaISO.split('-').map(Number)
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`
}

export interface SemanaSerie {
  semanaISO: string
  label: string
  horas: number
  profundoH: number
  reactivoH: number
}

/** Serie de las últimas `semanas` (incluida la actual). */
export function serieSemanal(bloques: Bloque[], semanas: number): SemanaSerie[] {
  const lunesActual = mondayISO()
  const out: SemanaSerie[] = []
  for (let i = semanas - 1; i >= 0; i--) {
    const lun = addDays(lunesActual, -7 * i)
    const fin = addDays(lun, 7)
    const dela = bloques.filter((b) => {
      const dia = fechaLocalDeISO(b.inicio)
      return dia >= lun && dia < fin
    })
    const m = calcularMetricas(dela)
    out.push({
      semanaISO: lun,
      label: etiquetaCorta(lun),
      horas: +m.horasTrabajadas.toFixed(1),
      profundoH: +(m.minProfundo / 60).toFixed(1),
      reactivoH: +(m.minReactivo / 60).toFixed(1),
    })
  }
  return out
}

export interface AreaBalance {
  nombre: string
  color: string
  horas: number
}

/** Horas por área en los bloques dados (una tarea con N áreas suma a cada una). */
export function balanceAreas(
  bloques: Bloque[],
  areas: Area[],
  tareaAreas: { tarea_id: string; area_id: string }[],
): AreaBalance[] {
  const areaPorId = new Map(areas.map((a) => [a.id, a]))
  const areasDeTarea = new Map<string, string[]>()
  for (const ta of tareaAreas) {
    const l = areasDeTarea.get(ta.tarea_id) ?? []
    l.push(ta.area_id)
    areasDeTarea.set(ta.tarea_id, l)
  }

  const minPorArea = new Map<string, number>()
  let sinArea = 0
  for (const b of bloques) {
    const min = duracionMin(b)
    if (min === 0) continue // no cumplido (o sin duración): no aporta horas
    const ids = b.tarea_id ? (areasDeTarea.get(b.tarea_id) ?? []) : []
    if (ids.length === 0) {
      sinArea += min
      continue
    }
    for (const id of ids) minPorArea.set(id, (minPorArea.get(id) ?? 0) + min)
  }

  const res: AreaBalance[] = []
  for (const [id, min] of minPorArea) {
    const a = areaPorId.get(id)
    if (a) res.push({ nombre: a.nombre, color: a.color, horas: +(min / 60).toFixed(1) })
  }
  res.sort((x, y) => y.horas - x.horas)
  if (sinArea > 0) {
    res.push({ nombre: 'Sin área', color: '#9A978C', horas: +(sinArea / 60).toFixed(1) })
  }
  return res
}

export interface IniciativaBalance {
  nombre: string
  horas: number
  rag: EstadoRag
}

/** Horas por iniciativa (bloque → tarea → iniciativa, o bloque → iniciativa directo). */
export function tiempoPorIniciativa(
  bloques: Bloque[],
  iniciativas: Iniciativa[],
  tareaIni: { id: string; iniciativa_id: string | null }[],
): IniciativaBalance[] {
  const iniPorId = new Map(iniciativas.map((i) => [i.id, i]))
  const iniDeTarea = new Map(tareaIni.map((t) => [t.id, t.iniciativa_id]))

  const minPorIni = new Map<string, number>()
  for (const b of bloques) {
    // La iniciativa de la tarea manda; si no hay, vale la directa del bloque.
    const iniId = (b.tarea_id ? iniDeTarea.get(b.tarea_id) : null) ?? b.iniciativa_id
    if (!iniId) continue
    const min = duracionMin(b)
    if (min === 0) continue
    minPorIni.set(iniId, (minPorIni.get(iniId) ?? 0) + min)
  }

  const res: IniciativaBalance[] = []
  for (const [id, min] of minPorIni) {
    const ini = iniPorId.get(id)
    if (ini) res.push({ nombre: ini.nombre, horas: +(min / 60).toFixed(1), rag: ini.estado_rag })
  }
  res.sort((x, y) => y.horas - x.horas)
  return res
}

/** Conteo de iniciativas por estado RAG. */
export function tallyRag(iniciativas: Iniciativa[]): Record<EstadoRag, number> {
  const t: Record<EstadoRag, number> = { rojo: 0, ambar: 0, verde: 0 }
  for (const i of iniciativas) t[i.estado_rag]++
  return t
}

export interface AvanceTop12 {
  hechas: number
  total: number
}

export function avanceTop12(tareas: TareaLite[]): AvanceTop12 {
  const top = tareas.filter((t) => t.es_top12)
  return { total: top.length, hechas: top.filter((t) => t.estado === 'hecha').length }
}

export interface TareasPorIni {
  nombre: string
  hechas: number
  pendientes: number
}

/** Tareas hechas vs pendientes por iniciativa (solo iniciativas con tareas). */
export function tareasPorIniciativa(
  iniciativas: Iniciativa[],
  tareas: TareaLite[],
): TareasPorIni[] {
  const iniPorId = new Map(iniciativas.map((i) => [i.id, i]))
  const acc = new Map<string, { hechas: number; pendientes: number }>()
  for (const t of tareas) {
    if (!t.iniciativa_id) continue
    const a = acc.get(t.iniciativa_id) ?? { hechas: 0, pendientes: 0 }
    if (t.estado === 'hecha') a.hechas++
    else a.pendientes++
    acc.set(t.iniciativa_id, a)
  }
  const res: TareasPorIni[] = []
  for (const [id, a] of acc) {
    const ini = iniPorId.get(id)
    if (ini) res.push({ nombre: ini.nombre, hechas: a.hechas, pendientes: a.pendientes })
  }
  return res.sort((x, y) => y.hechas + y.pendientes - (x.hechas + x.pendientes))
}

export interface CruceAreaIni {
  /** Filas: { nombre: iniciativa, [nombreArea]: horas, ... }. */
  filas: Record<string, number | string>[]
  /** Áreas presentes (claves de las barras apiladas), con su color. */
  areas: { nombre: string; color: string }[]
}

/** Tiempo de cada iniciativa desglosado por área (bloque → tarea → iniciativa + áreas). */
export function cruceAreaIniciativa(
  bloques: Bloque[],
  iniciativas: Iniciativa[],
  areas: Area[],
  tareas: { id: string; iniciativa_id: string | null }[],
  tareaAreas: { tarea_id: string; area_id: string }[],
): CruceAreaIni {
  const iniPorId = new Map(iniciativas.map((i) => [i.id, i]))
  const areaPorId = new Map(areas.map((a) => [a.id, a]))
  const iniDeTarea = new Map(tareas.map((t) => [t.id, t.iniciativa_id]))
  const areasDeTarea = new Map<string, string[]>()
  for (const ta of tareaAreas) {
    const l = areasDeTarea.get(ta.tarea_id) ?? []
    l.push(ta.area_id)
    areasDeTarea.set(ta.tarea_id, l)
  }

  const acc = new Map<string, Map<string, number>>()
  const areasUsadas = new Set<string>()
  for (const b of bloques) {
    if (!b.tarea_id) continue
    const iniId = iniDeTarea.get(b.tarea_id)
    if (!iniId) continue
    const areaIds = areasDeTarea.get(b.tarea_id) ?? []
    if (areaIds.length === 0) continue
    const min = duracionMin(b)
    if (min === 0) continue
    const m = acc.get(iniId) ?? new Map<string, number>()
    for (const aid of areaIds) {
      m.set(aid, (m.get(aid) ?? 0) + min)
      areasUsadas.add(aid)
    }
    acc.set(iniId, m)
  }

  const areasList: { nombre: string; color: string }[] = []
  for (const id of areasUsadas) {
    const a = areaPorId.get(id)
    if (a) areasList.push({ nombre: a.nombre, color: a.color })
  }

  const filas: Record<string, number | string>[] = []
  for (const [iniId, m] of acc) {
    const ini = iniPorId.get(iniId)
    if (!ini) continue
    const fila: Record<string, number | string> = { nombre: ini.nombre }
    for (const [aid, min] of m) {
      const a = areaPorId.get(aid)
      if (a) fila[a.nombre] = +(min / 60).toFixed(1)
    }
    filas.push(fila)
  }

  return { filas, areas: areasList }
}

export interface RagSemana {
  label: string
  rag: EstadoRag | null
}

/** Tendencia del RAG personal a partir de las revisiones (más viejas primero). */
export function ragTrend(revisiones: RevisionSemanal[], n = 8): RagSemana[] {
  return revisiones
    .slice(0, n)
    .reverse()
    .map((r) => ({ label: etiquetaCorta(r.semana), rag: r.rag_global }))
}
