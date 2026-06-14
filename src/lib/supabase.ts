import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** ¿Están cargadas las env vars de Supabase? */
export const isSupabaseConfigured = Boolean(url && anonKey)

if (!isSupabaseConfigured) {
  // No tiramos error (rompería el render): la app muestra una pantalla de
  // configuración. Pero avisamos claro en consola.
  console.warn(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. ' +
      'Copiá .env.example a .env.local y completá los valores del proyecto Supabase.',
  )
}

/**
 * Cliente único de Supabase. La anon key es pública por diseño;
 * la protección real de los datos es el RLS (ver supabase/schema.sql).
 *
 * Si falta configuración, usamos un placeholder válido para no romper el
 * import; ninguna llamada real se hace hasta que la app esté configurada.
 */
export const supabase = createClient<Database>(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)
