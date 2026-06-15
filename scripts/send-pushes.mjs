// Emisor de avisos push de El Becario.
// Corre en GitHub Actions y usa service role exclusivamente desde Node.
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const {
  SUPABASE_URL,
  SUPABASE_PROJECT_REF,
  SUPABASE_SERVICE_ROLE_KEY,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
  VAPID_SUBJECT = 'mailto:avisos@elbecario.app',
} = process.env

const faltantes = Object.entries({
  SUPABASE_URL,
  SUPABASE_PROJECT_REF,
  SUPABASE_SERVICE_ROLE_KEY,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
})
  .filter(([, value]) => !value)
  .map(([key]) => key)

if (faltantes.length > 0) {
  console.error(`Faltan secretos obligatorios: ${faltantes.join(', ')}`)
  process.exit(1)
}

const parsedUrl = new URL(SUPABASE_URL)
const actualRef = parsedUrl.hostname.match(/^([a-z0-9-]+)\.supabase\.co$/i)?.[1]
if (!actualRef || actualRef !== SUPABASE_PROJECT_REF) {
  console.error(
    `Destino bloqueado: SUPABASE_URL apunta a "${actualRef ?? parsedUrl.hostname}" ` +
      `pero SUPABASE_PROJECT_REF confirma "${SUPABASE_PROJECT_REF}".`,
  )
  process.exit(1)
}

function esServiceRole(key) {
  if (key.startsWith('sb_secret_')) return true
  if (key.startsWith('sb_publishable_')) return false
  try {
    const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8'))
    return payload.role === 'service_role'
  } catch {
    return false
  }
}

if (!esServiceRole(SUPABASE_SERVICE_ROLE_KEY)) {
  console.error('SUPABASE_SERVICE_ROLE_KEY no parece una clave service_role valida.')
  process.exit(1)
}

const vapidSubject = VAPID_SUBJECT?.trim() || 'mailto:avisos@elbecario.app'
if (!/^(mailto:|https:\/\/)/i.test(vapidSubject)) {
  console.error('VAPID_SUBJECT debe comenzar por mailto: o https://.')
  process.exit(1)
}

webpush.setVapidDetails(vapidSubject, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const AVISO_DEFAULT_MIN = 10
const AVISO_MAX_MIN = 7 * 24 * 60
const ahora = Date.now()
const horizonte = ahora + AVISO_MAX_MIN * 60_000

const { data: bloques, error } = await supabase
  .from('bloque')
  .select('id, user_id, inicio, aviso_min_antes')
  .eq('importante', true)
  .eq('aviso_enviado', false)
  .gte('inicio', new Date(ahora).toISOString())
  .lte('inicio', new Date(horizonte).toISOString())
if (error) {
  console.error('Error leyendo bloques:', error.message)
  process.exit(1)
}

const debidos = (bloques ?? []).filter((bloque) => {
  const inicio = new Date(bloque.inicio).getTime()
  const ventanaMs = (bloque.aviso_min_antes ?? AVISO_DEFAULT_MIN) * 60_000
  return inicio - ahora <= ventanaMs
})

let enviados = 0
let fallos = 0
for (const bloque of debidos) {
  const { data: subs, error: subsError } = await supabase
    .from('push_subscription')
    .select('endpoint, p256dh, auth')
    .eq('user_id', bloque.user_id)
  if (subsError) {
    console.error(`Error leyendo suscripciones del bloque ${bloque.id}:`, subsError.message)
    fallos++
    continue
  }

  const payload = JSON.stringify({
    title: 'El Becario',
    // Texto generico: puede mostrarse sobre la pantalla bloqueada.
    body: 'Tienes un bloque importante proximo.',
    url: '/',
    tag: `bloque-${bloque.id}`,
  })

  let pendientes = 0
  for (const sub of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      )
      enviados++
    } catch (errorEnvio) {
      if (errorEnvio.statusCode === 404 || errorEnvio.statusCode === 410) {
        const { error: deleteError } = await supabase
          .from('push_subscription')
          .delete()
          .eq('endpoint', sub.endpoint)
        if (deleteError) {
          console.error('No se pudo borrar una suscripcion muerta:', deleteError.message)
          pendientes++
        }
      } else {
        console.error('Error enviando push:', errorEnvio.statusCode, errorEnvio.body)
        pendientes++
      }
    }
  }

  // Solo cerramos el aviso cuando todos los dispositivos quedaron resueltos.
  if (pendientes === 0) {
    const { error: updateError } = await supabase
      .from('bloque')
      .update({ aviso_enviado: true })
      .eq('id', bloque.id)
      .eq('aviso_enviado', false)
    if (updateError) {
      console.error(`No se pudo cerrar el aviso ${bloque.id}:`, updateError.message)
      fallos++
    }
  } else {
    fallos += pendientes
  }
}

console.log(
  `Bloques debidos: ${debidos.length}. Pushes enviados: ${enviados}. Fallos: ${fallos}.`,
)
if (fallos > 0) process.exitCode = 1
