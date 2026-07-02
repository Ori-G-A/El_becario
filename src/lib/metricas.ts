import type { Bloque, EstadoRag, TipoBloque } from '../types/database'
import { minutosEntre } from './date'

/** Techo de horas de trabajo saludable por semana (configurable a futuro). */
export const TECHO_HORAS = 40

const PROFUNDO: TipoBloque[] = ['top_goal', 'trabajo_profundo']
const REACTIVO: TipoBloque[] = ['reactivo', 'reunion']
const TRABAJO: TipoBloque[] = [...PROFUNDO, ...REACTIVO]
// `autocuidado` y `sueno` quedan fuera del cómputo de horas de trabajo.

function planMin(b: Bloque): number {
  return minutosEntre(b.inicio, b.fin)
}
function realMin(b: Bloque): number | null {
  return b.real_inicio && b.real_fin ? minutosEntre(b.real_inicio, b.real_fin) : null
}
/** Duración efectiva: la real si está registrada, si no la planeada. */
export function duracionMin(b: Bloque): number {
  return realMin(b) ?? planMin(b)
}

export interface MetricasSemana {
  horasTrabajadas: number
  techoHoras: number
  ratioProfundo: number | null // 0..1 (profundo / trabajo total)
  minProfundo: number
  minReactivo: number
  pctAutocuidado: number | null // 0..1 (respetados / planeados)
  autoPlaneados: number
  autoRespetados: number
  /** real total / plan total en bloques de trabajo con registro. >1 = subestimás. */
  sesgoEstimacion: number | null
  bloquesConReal: number
}

export function calcularMetricas(bloques: Bloque[], ahora = new Date()): MetricasSemana {
  let minProfundo = 0
  let minReactivo = 0
  for (const b of bloques) {
    if (PROFUNDO.includes(b.tipo)) minProfundo += duracionMin(b)
    else if (REACTIVO.includes(b.tipo)) minReactivo += duracionMin(b)
  }
  const minTrabajo = minProfundo + minReactivo

  // Lo planeado cuenta como ocurrido salvo excepción: un bloque de autocuidado
  // que ya pasó se asume respetado aunque no se haya registrado. La acción de
  // la usuaria es corregir la excepción (borrar/mover el bloque), no registrar
  // cada uno para que las métricas vivan.
  const auto = bloques.filter((b) => b.tipo === 'autocuidado')
  const autoRespetados = auto.filter(
    (b) => b.real_inicio != null || new Date(b.fin) <= ahora,
  ).length

  let planReal = 0
  let realReal = 0
  let conReal = 0
  for (const b of bloques) {
    const r = realMin(b)
    if (r != null && TRABAJO.includes(b.tipo)) {
      planReal += planMin(b)
      realReal += r
      conReal++
    }
  }

  return {
    horasTrabajadas: minTrabajo / 60,
    techoHoras: TECHO_HORAS,
    ratioProfundo: minTrabajo > 0 ? minProfundo / minTrabajo : null,
    minProfundo,
    minReactivo,
    pctAutocuidado: auto.length > 0 ? autoRespetados / auto.length : null,
    autoPlaneados: auto.length,
    autoRespetados,
    sesgoEstimacion: planReal > 0 ? realReal / planReal : null,
    bloquesConReal: conReal,
  }
}

// --- RAG por indicador (null = sin datos suficientes) ---

export function ragHoras(horas: number, techo: number): EstadoRag {
  if (horas > techo) return 'rojo'
  if (horas >= techo * 0.9) return 'ambar'
  return 'verde'
}

export function ragRatio(ratio: number | null): EstadoRag | null {
  if (ratio == null) return null
  if (ratio >= 0.5) return 'verde'
  if (ratio >= 0.3) return 'ambar'
  return 'rojo'
}

export function ragAutocuidado(pct: number | null): EstadoRag | null {
  if (pct == null) return null
  if (pct >= 0.7) return 'verde'
  if (pct >= 0.4) return 'ambar'
  return 'rojo'
}

export function ragEstimacion(sesgo: number | null): EstadoRag | null {
  if (sesgo == null) return null
  const desvio = Math.abs(sesgo - 1)
  if (desvio <= 0.15) return 'verde'
  if (desvio <= 0.3) return 'ambar'
  return 'rojo'
}

/** RAG personal sugerido: promedio de los indicadores disponibles. */
export function ragPersonal(m: MetricasSemana): EstadoRag | null {
  const vals = [
    ragHoras(m.horasTrabajadas, m.techoHoras),
    ragRatio(m.ratioProfundo),
    ragAutocuidado(m.pctAutocuidado),
    ragEstimacion(m.sesgoEstimacion),
  ].filter((v): v is EstadoRag => v != null)

  if (vals.length === 0) return null
  const score =
    vals.reduce((s, v) => s + (v === 'rojo' ? 2 : v === 'ambar' ? 1 : 0), 0) / vals.length
  if (score >= 1.34) return 'rojo'
  if (score >= 0.67) return 'ambar'
  return 'verde'
}
