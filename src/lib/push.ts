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

export async function getSubscripcion(): Promise<PushSubscription | null> {
  if (!pushSoportado()) return null
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
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
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID) as BufferSource,
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
