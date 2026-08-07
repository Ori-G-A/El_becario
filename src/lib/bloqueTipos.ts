import { Target, BrainCircuit, Flame, Users, HeartPulse, Moon, type LucideIcon } from 'lucide-react'
import type { TipoBloque } from '../types/database'

export interface TipoBloqueConfig {
  label: string
  icon: LucideIcon
  /** Tono apagado de "oficina" — ni RAG ni acción. */
  color: string
  /**
   * El tipo es el eje de CÓMO usaste el tiempo. El PARA QUÉ lo dicen el área y
   * la iniciativa. Las ayudas están para que no se lean como la misma etiqueta
   * dos veces: 'autocuidado' no compite con la categoría, la resume.
   */
  ayuda: string
}

export const TIPO_BLOQUE: Record<TipoBloque, TipoBloqueConfig> = {
  top_goal: {
    label: 'Top Goal',
    icon: Target,
    color: '#8A63D2',
    ayuda: 'Lo más importante del día. Uno solo, y va primero.',
  },
  trabajo_profundo: {
    label: 'Trabajo profundo',
    icon: BrainCircuit,
    color: '#2AA9B5',
    ayuda: 'Concentración sostenida, sin interrupciones.',
  },
  reactivo: {
    label: 'Reactivo',
    icon: Flame,
    color: '#C77D3A',
    ayuda: 'Llegó de afuera y no estaba planeado.',
  },
  reunion: {
    label: 'Reunión',
    icon: Users,
    color: '#6B8E9E',
    ayuda: 'Con otras personas, en la agenda de alguien más.',
  },
  autocuidado: {
    label: 'Autocuidado',
    icon: HeartPulse,
    color: '#5C8A4A',
    ayuda: 'Tiempo que no le debes a nadie. Si es comida, ejercicio o traslado lo dice la iniciativa.',
  },
  sueno: {
    label: 'Sueño',
    icon: Moon,
    color: '#46506B',
    ayuda: 'Espacio bloqueado para dormir. Fuera del techo de 40 h.',
  },
}

export const TIPOS_BLOQUE = Object.keys(TIPO_BLOQUE) as TipoBloque[]
