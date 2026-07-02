import { todayISO } from './date'

// ponytail: la última visita vive en localStorage (por dispositivo). Basta
// para una sola usuaria cuyo dispositivo principal es el teléfono.
const KEY = 'becario-ultima-visita'

/** Días de ausencia a partir de los cuales el becario ofrece limpieza. */
export const AUSENCIA_MIN_DIAS = 3

/**
 * Registra la visita de hoy y devuelve cuántos días pasaron desde la anterior
 * (0 si es la primera visita o fue hoy mismo), junto con su fecha.
 */
export function registrarVisita(): { dias: number; ultimaISO: string | null } {
  const hoy = todayISO()
  const previa = localStorage.getItem(KEY)
  localStorage.setItem(KEY, hoy)
  if (!previa || previa >= hoy) return { dias: 0, ultimaISO: previa }
  const dias = Math.round(
    (new Date(hoy).getTime() - new Date(previa).getTime()) / 86_400_000,
  )
  return { dias, ultimaISO: previa }
}
