import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  hasPin as hasPinStored,
  setPin as persistPin,
  verifyPin,
} from '../lib/pinStore'
import { activarCripto, limpiarClave } from '../lib/cripto'
import { useAuth } from '../auth/useAuth'
import { LockContext, type LockContextValue } from './lock-context'

/** Minutos de inactividad antes del auto-lock. */
const AUTO_LOCK_MS = 5 * 60 * 1000

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'pointerdown'] as const

export function LockProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const userId = user?.id ?? null
  // Arranca siempre bloqueada: abrir la app exige el PIN.
  const [locked, setLocked] = useState(true)
  const [hasPin, setHasPin] = useState(false)
  const [loading, setLoading] = useState(true)
  const timerRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    let active = true
    limpiarClave()
    // Un cambio de identidad debe cerrar la UI antes de cualquier carga asíncrona.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocked(true)

    if (authLoading) {
      setLoading(true)
      return () => {
        active = false
      }
    }

    if (!userId) {
      setHasPin(false)
      setLoading(false)
      return () => {
        active = false
      }
    }

    setLoading(true)
    hasPinStored(userId)
      .then((exists) => {
        if (active) setHasPin(exists)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [authLoading, userId])

  const lock = useCallback(() => {
    limpiarClave()
    setLocked(true)
  }, [])

  const createPin = useCallback(async (pin: string) => {
    if (!userId) throw new Error('No hay una sesión activa para crear el PIN.')
    await persistPin(userId, pin)
    setHasPin(true)
    // Derivar la clave de cifrado no debe bloquear el ingreso si falla.
    await activarCripto(pin).catch(() => {})
    setLocked(false)
  }, [userId])

  const unlock = useCallback(async (pin: string) => {
    if (!userId) return { ok: false, lockedUntil: null, attemptsLeft: 0 }
    const result = await verifyPin(userId, pin)
    if (result.ok) {
      await activarCripto(pin).catch(() => {})
      setLocked(false)
    }
    return result
  }, [userId])

  // Auto-lock por inactividad: solo activo cuando está desbloqueada.
  useEffect(() => {
    if (locked) return

    const reset = () => {
      window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => {
        limpiarClave()
        setLocked(true)
      }, AUTO_LOCK_MS)
    }

    reset()
    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, reset, { passive: true })
    }

    return () => {
      window.clearTimeout(timerRef.current)
      for (const ev of ACTIVITY_EVENTS) {
        window.removeEventListener(ev, reset)
      }
    }
  }, [locked])

  const value = useMemo<LockContextValue>(
    () => ({ locked, hasPin, loading, createPin, unlock, lock }),
    [locked, hasPin, loading, createPin, unlock, lock],
  )

  return <LockContext.Provider value={value}>{children}</LockContext.Provider>
}
