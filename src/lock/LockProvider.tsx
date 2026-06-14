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
import { LockContext, type LockContextValue } from './lock-context'

/** Minutos de inactividad antes del auto-lock. */
const AUTO_LOCK_MS = 5 * 60 * 1000

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'pointerdown'] as const

export function LockProvider({ children }: { children: ReactNode }) {
  // Arranca siempre bloqueada: abrir la app exige el PIN.
  const [locked, setLocked] = useState(true)
  const [hasPin, setHasPin] = useState(false)
  const [loading, setLoading] = useState(true)
  const timerRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    hasPinStored().then((exists) => {
      setHasPin(exists)
      setLoading(false)
    })
  }, [])

  const lock = useCallback(() => {
    limpiarClave()
    setLocked(true)
  }, [])

  const createPin = useCallback(async (pin: string) => {
    await persistPin(pin)
    setHasPin(true)
    // Derivar la clave de cifrado no debe bloquear el ingreso si falla.
    await activarCripto(pin).catch(() => {})
    setLocked(false)
  }, [])

  const unlock = useCallback(async (pin: string) => {
    const ok = await verifyPin(pin)
    if (ok) {
      await activarCripto(pin).catch(() => {})
      setLocked(false)
    }
    return ok
  }, [])

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
