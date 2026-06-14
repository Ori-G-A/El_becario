import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. ' +
      'Copiá .env.example a .env.local y completá los valores del proyecto Supabase.',
  )
}

/**
 * Cliente único de Supabase. La anon key es pública por diseño;
 * la protección real de los datos es el RLS (ver supabase/schema.sql).
 */
export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    // Magic link (passwordless). Persistimos la sesión para no pedir login
    // en cada apertura; el app-lock con PIN es la capa de acceso local.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
