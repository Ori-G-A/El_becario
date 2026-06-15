import { supabase } from '../lib/supabase'

export async function guardarSubscripcion(sub: PushSubscription): Promise<void> {
  const json = sub.toJSON()
  const keys = json.keys ?? {}
  const p256dh = keys.p256dh
  const auth = keys.auth
  if (!p256dh || !auth) throw new Error('La suscripción push no devolvió claves válidas.')

  const { error } = await supabase.rpc('registrar_push_subscription', {
    p_endpoint: sub.endpoint,
    p_p256dh: p256dh,
    p_auth: auth,
  })
  if (error) throw new Error(error.message)
}

export async function borrarSubscripcion(endpoint: string): Promise<void> {
  const { error } = await supabase.from('push_subscription').delete().eq('endpoint', endpoint)
  if (error) throw new Error(error.message)
}
