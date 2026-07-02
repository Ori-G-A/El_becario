// Emisor de avisos push de El Becario.
// Corre como Supabase Edge Function, invocado por pg_cron cada 5 minutos
// (puntual, a diferencia del cron de GitHub Actions que se atrasaba ~2 h).
// Hace tres cosas:
//   1. Avisos de bloques importantes próximos (con el título real).
//   2. Resumen de la mañana (~7:00): Top Goal, bloques y pendientes del día.
//   3. Cierre de la jornada (~20:00): cómo te fue con el plan.
import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2'

// ponytail: Bogotá es UTC-5 fijo (sin DST); zona configurable si algún día hay más usuarios.
const OFFSET_MS = -5 * 3600_000
const HORA_RESUMEN = 7
// Después del mediodía ya no tiene sentido un "Buenos días": se omite ese día.
const HORA_RESUMEN_LIMITE = 12
const HORA_CIERRE = 20
const AVISO_DEFAULT_MIN = 10
const AVISO_MAX_MIN = 7 * 24 * 60
// Con cron puntual ya no hace falta tolerar 2 horas de atraso.
const GRACIA_MIN = 15
const PREFIJO_CIFRADO = 'enc:v1:'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? 'mailto:avisos@elbecario.app',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
)

/** Partes de fecha/hora en hora local de Bogotá. */
function ahoraLocal() {
  const d = new Date(Date.now() + OFFSET_MS)
  return {
    fecha: d.toISOString().slice(0, 10),
    hora: d.getUTCHours(),
  }
}

/** Rango UTC [inicio, fin) del día local `fecha` (YYYY-MM-DD). */
function rangoDiaLocal(fecha: string): [string, string] {
  const inicio = new Date(`${fecha}T00:00:00-05:00`)
  const fin = new Date(inicio.getTime() + 24 * 3600_000)
  return [inicio.toISOString(), fin.toISOString()]
}

function horaLocalDe(iso: string): string {
  const d = new Date(new Date(iso).getTime() + OFFSET_MS)
  return d.toISOString().slice(11, 16)
}

function tituloLegible(titulo: string | null | undefined, generico: string): string {
  if (!titulo || titulo.startsWith(PREFIJO_CIFRADO)) return generico
  return titulo
}

type Resultado = { enviados: number; fallos: number }

/** Envía un payload a todos los dispositivos de un usuario. Poda suscripciones muertas. */
async function enviarA(userId: string, payload: Record<string, string>): Promise<Resultado> {
  const { data: subs, error } = await supabase
    .from('push_subscription')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId)
  if (error) {
    console.error('Error leyendo suscripciones:', error.message)
    return { enviados: 0, fallos: 1 }
  }
  const body = JSON.stringify(payload)
  let enviados = 0
  let fallos = 0
  for (const sub of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        body,
      )
      enviados++
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) {
        await supabase.from('push_subscription').delete().eq('endpoint', sub.endpoint)
      } else {
        console.error('Error enviando push:', status, (e as { body?: string }).body)
        fallos++
      }
    }
  }
  return { enviados, fallos }
}

/** 1. Avisos de bloques importantes próximos (misma lógica del emisor viejo, con título real). */
async function avisosDeBloques(): Promise<Resultado> {
  const ahora = Date.now()
  const { data: bloques, error } = await supabase
    .from('bloque')
    .select('id, user_id, titulo, inicio, aviso_min_antes')
    .eq('importante', true)
    .eq('aviso_enviado', false)
    .gte('inicio', new Date(ahora - GRACIA_MIN * 60_000).toISOString())
    .lte('inicio', new Date(ahora + AVISO_MAX_MIN * 60_000).toISOString())
  if (error) {
    console.error('Error leyendo bloques:', error.message)
    return { enviados: 0, fallos: 1 }
  }

  const debidos = (bloques ?? []).filter((b) => {
    const ventanaMs = (b.aviso_min_antes ?? AVISO_DEFAULT_MIN) * 60_000
    return new Date(b.inicio).getTime() - ahora <= ventanaMs
  })

  let enviados = 0
  let fallos = 0
  for (const bloque of debidos) {
    const titulo = tituloLegible(bloque.titulo, 'Un bloque confidencial')
    const resultado = await enviarA(bloque.user_id, {
      title: 'El Becario',
      body: `${titulo} empieza a las ${horaLocalDe(bloque.inicio)}.`,
      url: '/',
      tag: `bloque-${bloque.id}`,
    })
    enviados += resultado.enviados
    fallos += resultado.fallos
    if (resultado.fallos === 0) {
      await supabase
        .from('bloque')
        .update({ aviso_enviado: true })
        .eq('id', bloque.id)
        .eq('aviso_enviado', false)
    }
  }
  return { enviados, fallos }
}

/** Usuarios con al menos un dispositivo suscrito. */
async function usuariosSuscritos(): Promise<string[]> {
  const { data, error } = await supabase.from('push_subscription').select('user_id')
  if (error) {
    console.error('Error listando usuarios:', error.message)
    return []
  }
  return [...new Set((data ?? []).map((r) => r.user_id as string))]
}

/** Reclama el turno del resumen del día: true solo para la primera corrida que lo intente. */
async function reclamarDigest(userId: string, fecha: string, tipo: 'manana' | 'cierre'): Promise<boolean> {
  const { error } = await supabase.from('push_digest').insert({ user_id: userId, fecha, tipo })
  if (error) {
    if (error.code !== '23505') console.error('Error reclamando digest:', error.message)
    return false
  }
  return true
}

/** 2. Resumen de la mañana: siempre llega, haya plan o no. Es el gancho de re-entrada. */
async function resumenManana(fecha: string): Promise<Resultado> {
  const [desde, hasta] = rangoDiaLocal(fecha)
  let enviados = 0
  let fallos = 0
  for (const userId of await usuariosSuscritos()) {
    if (!(await reclamarDigest(userId, fecha, 'manana'))) continue

    const [{ data: topGoal }, { data: bloques }, { data: checklist }] = await Promise.all([
      supabase
        .from('tarea')
        .select('titulo')
        .eq('user_id', userId)
        .eq('es_top_goal', true)
        .eq('fecha', fecha)
        .limit(1)
        .maybeSingle(),
      supabase
        .from('bloque')
        .select('inicio')
        .eq('user_id', userId)
        .neq('tipo', 'sueno')
        .gte('inicio', desde)
        .lt('inicio', hasta)
        .order('inicio'),
      supabase
        .from('tarea')
        .select('id')
        .eq('user_id', userId)
        .eq('agendada_para', fecha)
        .neq('estado', 'hecha'),
    ])

    const partes: string[] = []
    if (topGoal) partes.push(`Top Goal: ${tituloLegible(topGoal.titulo, '(confidencial)')}.`)
    if (bloques && bloques.length > 0) {
      partes.push(`${bloques.length} bloque${bloques.length > 1 ? 's' : ''}, el primero a las ${horaLocalDe(bloques[0].inicio)}.`)
    }
    if (checklist && checklist.length > 0) {
      partes.push(`${checklist.length} pendiente${checklist.length > 1 ? 's' : ''} del día.`)
    }

    const body = partes.length > 0
      ? `Buenos días. ${partes.join(' ')}`
      : 'Buenos días. Hoy no hay nada en la agenda. ¿Armamos el día en dos minutos?'

    const resultado = await enviarA(userId, {
      title: 'El Becario',
      body,
      url: '/',
      tag: `resumen-${fecha}`,
    })
    enviados += resultado.enviados
    fallos += resultado.fallos
  }
  return { enviados, fallos }
}

/** 3. Cierre de la jornada: cómo te fue con el plan de hoy. */
async function cierreJornada(fecha: string): Promise<Resultado> {
  const [desde, hasta] = rangoDiaLocal(fecha)
  let enviados = 0
  let fallos = 0
  for (const userId of await usuariosSuscritos()) {
    if (!(await reclamarDigest(userId, fecha, 'cierre'))) continue

    const [{ data: topGoal }, { data: bloques }] = await Promise.all([
      supabase
        .from('tarea')
        .select('estado')
        .eq('user_id', userId)
        .eq('es_top_goal', true)
        .eq('fecha', fecha)
        .limit(1)
        .maybeSingle(),
      supabase
        .from('bloque')
        .select('real_fin')
        .eq('user_id', userId)
        .neq('tipo', 'sueno')
        .gte('inicio', desde)
        .lt('inicio', hasta),
    ])

    // Sin plan ni Top Goal no hay nada que cerrar: silencio.
    if (!topGoal && (!bloques || bloques.length === 0)) continue

    const partes: string[] = []
    if (topGoal) {
      partes.push(
        topGoal.estado === 'hecha'
          ? 'Top Goal cumplido. Nada mal.'
          : 'El Top Goal quedó pendiente; mañana lo cazamos temprano.',
      )
    }
    if (bloques && bloques.length > 0) {
      const registrados = bloques.filter((b) => b.real_fin != null).length
      partes.push(`Registraste ${registrados} de ${bloques.length} bloques.`)
    }

    const resultado = await enviarA(userId, {
      title: 'El Becario',
      body: `Fin de la jornada. ${partes.join(' ')}`,
      url: '/',
      tag: `cierre-${fecha}`,
    })
    enviados += resultado.enviados
    fallos += resultado.fallos
  }
  return { enviados, fallos }
}

Deno.serve(async () => {
  const { fecha, hora } = ahoraLocal()
  const tareas = [avisosDeBloques()]
  if (hora >= HORA_RESUMEN && hora < HORA_RESUMEN_LIMITE) tareas.push(resumenManana(fecha))
  if (hora >= HORA_CIERRE) tareas.push(cierreJornada(fecha))

  const resultados = await Promise.all(tareas)
  const total = resultados.reduce(
    (acc, r) => ({ enviados: acc.enviados + r.enviados, fallos: acc.fallos + r.fallos }),
    { enviados: 0, fallos: 0 },
  )
  console.log(`Pushes enviados: ${total.enviados}. Fallos: ${total.fallos}.`)
  return new Response(JSON.stringify(total), {
    headers: { 'Content-Type': 'application/json' },
    status: total.fallos > 0 ? 500 : 200,
  })
})
