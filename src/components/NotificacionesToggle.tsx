import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { pushSoportado, getSubscripcion, activarPush, desactivarPush } from '../lib/push'

export function NotificacionesToggle() {
  const [soportado] = useState(pushSoportado())
  const [activo, setActivo] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!soportado) return
    getSubscripcion().then((s) => setActivo(Boolean(s)))
  }, [soportado])

  if (!soportado) return null

  async function toggle() {
    setBusy(true)
    try {
      if (activo) {
        await desactivarPush()
        setActivo(false)
      } else {
        await activarPush()
        setActivo(true)
      }
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'No pude cambiar las notificaciones.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      className="btn"
      onClick={toggle}
      disabled={busy}
      title={activo ? 'Notificaciones activadas' : 'Activar notificaciones'}
      aria-pressed={activo}
      style={{
        padding: '0.4rem 0.55rem',
        background: activo ? 'var(--sello)' : 'var(--papel)',
        color: activo ? '#fff' : 'var(--tinta)',
      }}
    >
      {activo ? <Bell size={16} aria-hidden /> : <BellOff size={16} aria-hidden />}
    </button>
  )
}
