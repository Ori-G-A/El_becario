import type { Area, Bloque, EstadoRag, Iniciativa } from '../types/database'
import { calcularMetricas, duracionMin } from './metricas'
import { addDays, fechaLocalDeISO, mondayISO } from './date'

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

/** Horas por iniciativa (bloque → tarea → iniciativa), coloreadas por su RAG. */
export function tiempoPorIniciativa(
  bloques: Bloque[],
  iniciativas: Iniciativa[],
  tareaIni: { id: string; iniciativa_id: string | null }[],
): IniciativaBalance[] {
  const iniPorId = new Map(iniciativas.map((i) => [i.id, i]))
  const iniDeTarea = new Map(tareaIni.map((t) => [t.id, t.iniciativa_id]))

  const minPorIni = new Map<string, number>()
  for (const b of bloques) {
    if (!b.tarea_id) continue
    const iniId = iniDeTarea.get(b.tarea_id)
    if (!iniId) continue
    minPorIni.set(iniId, (minPorIni.get(iniId) ?? 0) + duracionMin(b))
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
