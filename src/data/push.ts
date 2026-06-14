import { supabase } from '../lib/supabase'

export async function guardarSubscripcion(sub: PushSubscription): Promise<void> {
  const json = sub.toJSON()
  const keys = json.keys ?? {}
  const { error } = await supabase
    .from('push_subscription')
    .upsert(
      { endpoint: sub.endpoint, p256dh: keys.p256dh ?? '', auth: keys.auth ?? '' },
      { onConflict: 'endpoint' },
    )
  if (error) throw new Error(error.message)
}

export async function borrarSubscripcion(endpoint: string): Promise<void> {
  const { error } = await supabase.from('push_subscription').delete().eq('endpoint', endpoint)
  if (error) throw new Error(error.message)
}
