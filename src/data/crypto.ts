import { supabase } from '../lib/supabase'

function saltAleatorioB64(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}

/** Devuelve el salt del usuario; lo crea (una vez) si no existe. */
export async function ensureSalt(): Promise<string> {
  const { data, error } = await supabase.from('user_crypto').select('salt').maybeSingle()
  if (error) throw new Error(error.message)
  if (data?.salt) return data.salt

  const salt = saltAleatorioB64()
  const ins = await supabase.from('user_crypto').insert({ salt }).select('salt').single()
  if (ins.error) throw new Error(ins.error.message)
  return ins.data.salt
}
