/** Geometría compartida por las vistas Día y Semana del calendario. */
export const HORA_INICIO = 0
export const HORA_FIN = 24
export const ALTO_HORA = 48 // px por hora
export const PX_POR_MIN = ALTO_HORA / 60
export const MIN_INICIO = HORA_INICIO * 60
export const ALTO_TOTAL = (HORA_FIN - HORA_INICIO) * ALTO_HORA
export const HORAS = Array.from(
  { length: HORA_FIN - HORA_INICIO + 1 },
  (_, i) => HORA_INICIO + i,
)

const pad = (n: number) => String(n).padStart(2, '0')

/** Convierte una posición vertical en hora "HH:MM" (snap a 15 min), o null si cae fuera. */
export function horaDesdeY(y: number, snapMin = 15): string | null {
  const minutos = MIN_INICIO + Math.round(y / PX_POR_MIN / snapMin) * snapMin
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  if (h < HORA_INICIO || h >= HORA_FIN) return null
  return `${pad(h)}:${pad(m)}`
}

/**
 * Posición de un bloque DENTRO de un día (recortado a [0, 24h)).
 * Soporta bloques que empiezan el día anterior o terminan el siguiente.
 */
export function topYAltoEnDia(
  inicioISO: string,
  finISO: string,
  diaMs: number,
): { top: number; alto: number } {
  const ini = new Date(inicioISO).getTime()
  const fin = new Date(finISO).getTime()
  const startMin = Math.max(0, (ini - diaMs) / 60000)
  const endMin = Math.min(24 * 60, (fin - diaMs) / 60000)
  return {
    top: startMin * PX_POR_MIN,
    alto: Math.max(18, (endMin - startMin) * PX_POR_MIN),
  }
}

export interface Posicion {
  col: number
  cols: number
}

/**
 * Reparte en columnas los items que se solapan en el tiempo, para mostrarlos
 * lado a lado. `ini`/`fin` en milisegundos.
 */
export function layoutSolapamiento(
  items: { id: string; ini: number; fin: number }[],
): Map<string, Posicion> {
  const res = new Map<string, Posicion>()
  const ordenados = [...items].sort((a, b) => a.ini - b.ini || a.fin - b.fin)

  let cluster: { id: string; ini: number; fin: number }[] = []
  let clusterFin = -Infinity

  const cerrar = () => {
    const colFin: number[] = [] // fin de cada columna
    const colDe = new Map<string, number>()
    for (const it of cluster) {
      let col = colFin.findIndex((f) => f <= it.ini)
      if (col === -1) {
        col = colFin.length
        colFin.push(it.fin)
      } else {
        colFin[col] = it.fin
      }
      colDe.set(it.id, col)
    }
    const cols = colFin.length
    for (const it of cluster) res.set(it.id, { col: colDe.get(it.id) ?? 0, cols })
  }

  for (const it of ordenados) {
    if (cluster.length && it.ini >= clusterFin) {
      cerrar()
      cluster = []
      clusterFin = -Infinity
    }
    cluster.push(it)
    clusterFin = Math.max(clusterFin, it.fin)
  }
  if (cluster.length) cerrar()
  return res
}
