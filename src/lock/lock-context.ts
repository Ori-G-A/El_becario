import { createContext } from 'react'
import type { VerifyPinResult } from '../lib/pinStore'

export interface LockContextValue {
  /** ¿Está la app bloqueada y esperando el PIN? */
  locked: boolean
  /** ¿Hay un PIN configurado en este dispositivo? */
  hasPin: boolean
  /** Cargando el estado inicial del lock. */
  loading: boolean
  /** Crea el PIN por primera vez y desbloquea. */
  createPin: (pin: string) => Promise<void>
  /** Intenta desbloquear; devuelve estado de éxito/cooldown. */
  unlock: (pin: string) => Promise<VerifyPinResult>
  /** Bloquea manualmente. */
  lock: () => void
}

export const LockContext = createContext<LockContextValue | null>(null)
