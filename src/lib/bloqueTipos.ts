import { Target, BrainCircuit, Flame, Users, HeartPulse, Moon, type LucideIcon } from 'lucide-react'
import type { TipoBloque } from '../types/database'

export interface TipoBloqueConfig {
  label: string
  icon: LucideIcon
  /** Tono apagado de "oficina" — ni RAG ni acción. */
  color: string
}

export const TIPO_BLOQUE: Record<TipoBloque, TipoBloqueConfig> = {
  top_goal: { label: 'Top Goal', icon: Target, color: '#8A63D2' },
  trabajo_profundo: { label: 'Trabajo profundo', icon: BrainCircuit, color: '#2AA9B5' },
  reactivo: { label: 'Reactivo', icon: Flame, color: '#C77D3A' },
  reunion: { label: 'Reunión', icon: Users, color: '#6B8E9E' },
  autocuidado: { label: 'Autocuidado', icon: HeartPulse, color: '#5C8A4A' },
  sueno: { label: 'Sueño', icon: Moon, color: '#46506B' },
}

export const TIPOS_BLOQUE = Object.keys(TIPO_BLOQUE) as TipoBloque[]
