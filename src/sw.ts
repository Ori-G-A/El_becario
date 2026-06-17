/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: unknown[] }

// --- Precache del shell (lo inyecta vite-plugin-pwa) ---
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// El SW nuevo toma el control de inmediato: skipWaiting lo activa sin esperar a
// que se cierren las pestañas, y clients.claim() reclama la PWA ya abierta. Eso
// dispara 'controllerchange' en registerSW.js, que recarga a la versión nueva.
// Sin el claim, una PWA instalada se queda pegada al bundle viejo para siempre.
self.skipWaiting()
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

interface PushData {
  title?: string
  body?: string
  url?: string
  tag?: string
}

function urlInterna(valor: string | undefined): string {
  try {
    const url = new URL(valor ?? '/', self.location.origin)
    if (url.origin !== self.location.origin) return '/'
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return '/'
  }
}

function leerPushData(event: PushEvent): PushData {
  try {
    return event.data?.json() ?? {}
  } catch {
    return { body: event.data?.text() }
  }
}

// --- Notificaciones push (app cerrada) ---
self.addEventListener('push', (event) => {
  const data = leerPushData(event)
  const title = data.title ?? 'El Becario'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body ?? '',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: data.tag,
      data: urlInterna(data.url),
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data as string) || '/'
  event.waitUntil(
    (async () => {
      const clientes = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const abierto = clientes.find((c) => 'focus' in c) as WindowClient | undefined
      if (abierto) await abierto.focus()
      else await self.clients.openWindow(url)
    })(),
  )
})
