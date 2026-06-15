import { useEffect, useState, type FormEvent } from 'react'
import { Lock, Unlock } from 'lucide-react'
import { useLock } from '../lock/useLock'
import { PIN_MAX_LENGTH, PIN_MIN_LENGTH } from '../lib/pinStore'
import { AuthShell } from '../components/AuthShell'
import { inputStyle } from '../components/styles'

const onlyDigits = (v: string) => v.replace(/\D/g, '').slice(0, PIN_MAX_LENGTH)

export function LockScreen() {
  const { hasPin, createPin, unlock } = useLock()
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!lockedUntil || lockedUntil <= now) return
    const id = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(id)
  }, [lockedUntil, now])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    setBusy(true)
    try {
      if (!hasPin) {
        // El mínimo solo aplica al CREAR un PIN nuevo.
        if (pin.length < PIN_MIN_LENGTH) {
          setError(`El PIN necesita al menos ${PIN_MIN_LENGTH} dígitos.`)
          return
        }
        if (pin !== confirm) {
          setError('Los dos PIN no coinciden. Prueba otra vez.')
          return
        }
        await createPin(pin)
      } else {
        const result = await unlock(pin)
        if (!result.ok) {
          setLockedUntil(result.lockedUntil)
          if (result.lockedUntil && result.lockedUntil > Date.now()) {
            setError('Demasiados intentos. Espera un momento antes de probar otra vez.')
          } else if (result.attemptsLeft > 0) {
            setError(`PIN incorrecto. Te quedan ${result.attemptsLeft} intentos antes de una pausa.`)
          } else {
            setError('PIN incorrecto. No dejo entrar a cualquiera.')
          }
          setPin('')
        }
      }
    } finally {
      setBusy(false)
    }
  }

  const creating = !hasPin
  const remainingMs = lockedUntil ? Math.max(0, lockedUntil - now) : 0
  const remainingSeconds = Math.ceil(remainingMs / 1000)
  const lockedByAttempts = !creating && remainingMs > 0

  return (
    <AuthShell
      badge={creating ? 'App-lock · nuevo PIN' : 'App-lock'}
      title={creating ? 'Crea tu PIN' : 'Tu PIN, por favor'}
      subtitle={
        creating
          ? 'Es la cerradura de tu escritorio, solo en este dispositivo. Nunca viaja a ningún servidor.'
          : 'Solo para abrir el escritorio en este equipo.'
      }
    >
      <form onSubmit={onSubmit}>
        <label
          className="mono-tag"
          htmlFor="pin"
          style={{ display: 'block', marginBottom: '0.4rem' }}
        >
          PIN ({PIN_MIN_LENGTH}–{PIN_MAX_LENGTH} dígitos)
        </label>
        <input
          id="pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          value={pin}
          onChange={(e) => setPin(onlyDigits(e.target.value))}
          placeholder="••••"
          style={{ ...inputStyle, letterSpacing: '0.3em', marginBottom: creating ? '0.9rem' : '0.9rem' }}
        />

        {creating && (
          <>
            <label
              className="mono-tag"
              htmlFor="pin-confirm"
              style={{ display: 'block', marginBottom: '0.4rem' }}
            >
              Repite el PIN
            </label>
            <input
              id="pin-confirm"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={confirm}
              onChange={(e) => setConfirm(onlyDigits(e.target.value))}
              placeholder="••••"
              style={{ ...inputStyle, letterSpacing: '0.3em', marginBottom: '0.9rem' }}
            />
          </>
        )}

        {error && (
          <p style={{ color: 'var(--rag-rojo)', fontWeight: 600, marginBottom: '0.75rem' }}>
            {lockedByAttempts ? `${error} (${remainingSeconds}s)` : error}
          </p>
        )}

        <button
          type="submit"
          className="btn"
          disabled={busy || lockedByAttempts}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          {creating ? <Lock size={18} aria-hidden /> : <Unlock size={18} aria-hidden />}
          {creating ? 'Crear PIN y entrar' : 'Abrir'}
        </button>
      </form>
    </AuthShell>
  )
}
