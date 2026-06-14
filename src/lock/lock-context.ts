import { createContext } from 'react'

export interface LockContextValue {
  /** ¿Está la app bloqueada y esperando el PIN? */
  locked: boolean
  /** ¿Hay un PIN configurado en este dispositivo? */
  hasPin: boolean
  /** Cargando el estado inicial del lock. */
  loading: boolean
  /** Crea el PIN por primera vez y desbloquea. */
  createPin: (pin: string) => Promise<void>
  /** Intenta desbloquear; devuelve true si el PIN es correcto. */
  unlock: (pin: string) => Promise<boolean>
  /** Bloquea manualmente. */
  lock: () => void
}

export const LockContext = createContext<LockContextValue | null>(null)
