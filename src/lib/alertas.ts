import { listImportantesProximos, listBloquesDeSemana } from '../data/bloques'
import { mondayISO, minutosEntre } from './date'
import {
  calcularMetricas,
  ragHoras,
  ragRatio,
  ragAutocuidado,
  ragEstimacion,
} from './metricas'

export interface AvisoFecha {
  id: string
  titulo: string
  inicioISO: string
  minutosFalta: number
}

export interface Alertas {
  avisos: AvisoFecha[]
  /** Cantidad de indicadores en rojo esta semana (>= 2 dispara el aviso de burnout). */
  burnoutRojos: number
}

/** Ventana por defecto si el bloque no define aviso_min_antes: 24 h. */
const VENTANA_DEFAULT = 24 * 60

export async function cargarAlertas(): Promise<Alertas> {
  const ahora = new Date().toISOString()

  const importantes = await listImportantesProximos()
  const avisos: AvisoFecha[] = importantes
    .map((b) => ({
      id: b.id,
      titulo: b.titulo,
      inicioISO: b.inicio,
      minutosFalta: minutosEntre(ahora, b.inicio),
      ventana: b.aviso_min_antes ?? VENTANA_DEFAULT,
    }))
    .filter((a) => a.minutosFalta >= 0 && a.minutosFalta <= a.ventana)
    .map(({ id, titulo, inicioISO, minutosFalta }) => ({ id, titulo, inicioISO, minutosFalta }))

  const bloquesSemana = await listBloquesDeSemana(mondayISO())
  const m = calcularMetricas(bloquesSemana)
  const burnoutRojos = [
    ragHoras(m.horasTrabajadas, m.techoHoras),
    ragRatio(m.ratioProfundo),
    ragAutocuidado(m.pctAutocuidado),
    ragEstimacion(m.sesgoEstimacion),
  ].filter((r) => r === 'rojo').length

  return { avisos, burnoutRojos }
}

/** "en 40 min" / "en 3 h" / "en 2 días". */
export function faltaTexto(minutos: number): string {
  if (minutos < 60) return `en ${minutos} min`
  if (minutos < 60 * 24) return `en ${Math.round(minutos / 60)} h`
  return `en ${Math.round(minutos / (60 * 24))} días`
}
