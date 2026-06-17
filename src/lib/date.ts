function toISO(d: Date): string {
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

/** Fecha de hoy en formato YYYY-MM-DD (hora local). */
export function todayISO(): string {
  return toISO(new Date())
}

/** Lunes de la semana de `base` (YYYY-MM-DD, hora local). */
export function mondayISO(base = new Date()): string {
  const d = new Date(base)
  const dia = d.getDay() // 0=domingo … 6=sábado
  const offset = dia === 0 ? -6 : 1 - dia
  d.setDate(d.getDate() + offset)
  return toISO(d)
}

/** "9 de junio de 2026" a partir de un YYYY-MM-DD. */
export function formatFechaLarga(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** "lunes 9 de junio" a partir de un YYYY-MM-DD. */
export function nombreDia(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

/** Suma `n` días a un YYYY-MM-DD (puede ser negativo). */
export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return toISO(new Date(y, m - 1, d + n))
}

/** Combina un día (YYYY-MM-DD) y una hora (HH:MM) en un timestamp ISO local. */
export function combinarFechaHora(fechaISO: string, hhmm: string): string {
  const [y, m, d] = fechaISO.split('-').map(Number)
  const [hh, mm] = hhmm.split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm).toISOString()
}

/** Hora local "HH:MM" de un timestamp ISO. */
export function horaLocal(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Minutos desde la medianoche (hora local) de un timestamp ISO. */
export function minutosDesdeMedianoche(iso: string): number {
  const d = new Date(iso)
  return d.getHours() * 60 + d.getMinutes()
}

/** Día local (YYYY-MM-DD) de un timestamp ISO. */
export function fechaLocalDeISO(iso: string): string {
  return toISO(new Date(iso))
}

/** Minutos entre dos timestamps ISO (b - a). Redondeado. */
export function minutosEntre(aISO: string, bISO: string): number {
  return Math.round((new Date(bISO).getTime() - new Date(aISO).getTime()) / 60000)
}

/** Lunes de la semana que contiene a `fechaISO` (YYYY-MM-DD). */
export function lunesDe(fechaISO: string): string {
  const [y, m, d] = fechaISO.split('-').map(Number)
  return mondayISO(new Date(y, m - 1, d))
}

/**
 * Días (YYYY-MM-DD) entre `desdeISO` y `hastaISO` inclusive.
 * `dias` = null → todos; si no, solo los getDay() incluidos (0=domingo … 6=sábado).
 * Tope de seguridad de 366 iteraciones para no generar series infinitas.
 */
export function fechasEntre(
  desdeISO: string,
  hastaISO: string,
  dias: number[] | null,
): string[] {
  const out: string[] = []
  let cursor = desdeISO
  for (let i = 0; i < 366 && cursor <= hastaISO; i++) {
    const [y, m, d] = cursor.split('-').map(Number)
    const dow = new Date(y, m - 1, d).getDay()
    if (!dias || dias.includes(dow)) out.push(cursor)
    cursor = addDays(cursor, 1)
  }
  return out
}

/** Límites [desde, hasta) del día en timestamps ISO. */
export function diaBounds(fechaISO: string): { desde: string; hasta: string } {
  const [y, m, d] = fechaISO.split('-').map(Number)
  return {
    desde: new Date(y, m - 1, d, 0, 0).toISOString(),
    hasta: new Date(y, m - 1, d + 1, 0, 0).toISOString(),
  }
}
