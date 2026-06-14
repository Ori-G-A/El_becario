// Emisor de avisos push de El Becario.
// Corre en GitHub Actions cada pocos minutos: busca bloques importantes cuya
// ventana de aviso ya llegó y manda el push a los dispositivos del usuario.
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
  VAPID_SUBJECT = 'mailto:avisos@elbecario.app',
} = process.env

const faltantes = Object.entries({
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
})
  .filter(([, v]) => !v)
  .map(([k]) => k)

if (faltantes.length > 0) {
  // Salida suave (exit 0) para no marcar el workflow en rojo mientras todavía
  // no cargaste los secretos en GitHub.
  console.warn(`Faltan secretos (${faltantes.join(', ')}). No hago nada por ahora.`)
  process.exit(0)
}

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const AVISO_DEFAULT_MIN = 10
const ahora = Date.now()

const { data: bloques, error } = await supabase
  .from('bloque')
  .select('*')
  .eq('importante', true)
  .eq('aviso_enviado', false)
  .gte('inicio', new Date(ahora).toISOString())
if (error) {
  console.error('Error leyendo bloques:', error.message)
  process.exit(1)
}

const debidos = (bloques ?? []).filter((b) => {
  const inicio = new Date(b.inicio).getTime()
  const ventanaMs = (b.aviso_min_antes ?? AVISO_DEFAULT_MIN) * 60_000
  return inicio - ahora <= ventanaMs
})

let enviados = 0
for (const b of debidos) {
  const { data: subs } = await supabase
    .from('push_subscription')
    .select('*')
    .eq('user_id', b.user_id)

  const hora = new Date(b.inicio).toLocaleTimeString('es', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const payload = JSON.stringify({
    title: 'El Becario',
    body: `${b.titulo} a las ${hora}. No me hagas quedar mal.`,
    url: '/',
    tag: `bloque-${b.id}`,
  })

  let algunoOk = false
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
      )
      algunoOk = true
      enviados++
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) {
        // Suscripción muerta: la borramos.
        await supabase.from('push_subscription').delete().eq('endpoint', s.endpoint)
      } else {
        console.error('Error enviando push:', e.statusCode, e.body)
      }
    }
  }

  // Marcamos como avisado si se envió a alguien o si no hay dispositivos
  // (para no reprocesarlo indefinidamente).
  if (algunoOk || (subs ?? []).length === 0) {
    await supabase.from('bloque').update({ aviso_enviado: true }).eq('id', b.id)
  }
}

console.log(`Bloques debidos: ${debidos.length}. Pushes enviados: ${enviados}.`)
