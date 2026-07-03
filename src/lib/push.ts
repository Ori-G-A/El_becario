import { guardarSubscripcion, borrarSubscripcion } from '../data/push'

const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY

export function pushSoportado(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

/** True si la suscripción del navegador está firmada con la clave VAPID actual. */
function firmadaConClaveActual(sub: PushSubscription, esperada: Uint8Array): boolean {
  const actual = sub.options.applicationServerKey
  if (!actual) return false
  const actualBytes = new Uint8Array(actual)
  return actualBytes.length === esperada.length && actualBytes.every((b, i) => b === esperada[i])
}

/**
 * Suscripción vigente del navegador, o null si no hay ninguna o quedó de una
 * clave VAPID vieja (p. ej. tras rotarla): esa ya no sirve para nada.
 */
export async function getSubscripcion(): Promise<PushSubscription | null> {
  if (!pushSoportado()) return null
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (sub && VAPID && !firmadaConClaveActual(sub, urlBase64ToUint8Array(VAPID))) return null
  return sub
}

/** Pide permiso, se suscribe y guarda la subscripción en Supabase. */
export async function activarPush(): Promise<void> {
  if (!pushSoportado()) throw new Error('Tu navegador no soporta notificaciones.')
  if (!VAPID) throw new Error('Falta la clave VAPID pública (VITE_VAPID_PUBLIC_KEY).')

  const permiso = await Notification.requestPermission()
  if (permiso !== 'granted') {
    throw new Error('No diste permiso para notificaciones.')
  }

  const reg = await navigator.serviceWorker.ready
  const vapidBytes = urlBase64ToUint8Array(VAPID)
  let sub = await reg.pushManager.getSubscription()
  // Suscripción de una clave VAPID vieja: inservible, hay que descartarla antes
  // de crear una nueva (el navegador no deja tener dos a la vez).
  if (sub && !firmadaConClaveActual(sub, vapidBytes)) {
    await sub.unsubscribe()
    sub = null
  }
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidBytes as BufferSource,
    })
  }
  await guardarSubscripcion(sub)
}

export async function desactivarPush(): Promise<void> {
  if (!pushSoportado()) return
  const reg = await navigator.serviceWorker.getRegistration()
  if (!reg) return
  const sub = await reg.pushManager.getSubscription()
  if (sub) {
    let primerError: unknown = null
    try {
      await borrarSubscripcion(sub.endpoint)
    } catch (e) {
      primerError = e
    }

    try {
      await sub.unsubscribe()
    } catch (e) {
      primerError ??= e
    }

    if (primerError) throw primerError
  }
}
