import { minutosDesdeMedianoche } from './date'

/** Geometría compartida por las vistas Día y Semana del calendario. */
export const HORA_INICIO = 6
export const HORA_FIN = 24
export const ALTO_HORA = 56 // px por hora
export const PX_POR_MIN = ALTO_HORA / 60
export const MIN_INICIO = HORA_INICIO * 60
export const ALTO_TOTAL = (HORA_FIN - HORA_INICIO) * ALTO_HORA
export const HORAS = Array.from(
  { length: HORA_FIN - HORA_INICIO + 1 },
  (_, i) => HORA_INICIO + i,
)

const pad = (n: number) => String(n).padStart(2, '0')

/** Posición vertical (px) del inicio de un bloque dentro del timeline. */
export function bloqueTop(inicioISO: string): number {
  return Math.max(0, (minutosDesdeMedianoche(inicioISO) - MIN_INICIO) * PX_POR_MIN)
}

/** Alto (px) de un bloque según su duración. */
export function bloqueAlto(inicioISO: string, finISO: string): number {
  const ini = minutosDesdeMedianoche(inicioISO)
  const fin = minutosDesdeMedianoche(finISO)
  return Math.max(22, (fin - ini) * PX_POR_MIN - 2)
}

/** Convierte una posición vertical en hora "HH:MM" (snap a 15 min), o null si cae fuera. */
export function horaDesdeY(y: number, snapMin = 15): string | null {
  const minutos = MIN_INICIO + Math.round(y / PX_POR_MIN / snapMin) * snapMin
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  if (h < HORA_INICIO || h >= HORA_FIN) return null
  return `${pad(h)}:${pad(m)}`
}
