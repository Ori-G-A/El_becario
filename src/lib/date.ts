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
