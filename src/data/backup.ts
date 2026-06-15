import { supabase } from '../lib/supabase'
import { todayISO } from '../lib/date'

const TABLAS = [
  'area',
  'iniciativa',
  'tarea',
  'tarea_area',
  'revision_semanal',
  'bloque',
  'user_crypto',
] as const

/**
 * Descarga TODOS tus datos como un JSON. Innegociable: el plan Free de Supabase
 * no tiene backups automáticos, así que esta es tu red de seguridad.
 */
export async function exportarBackup(): Promise<void> {
  const data: Record<string, unknown[]> = {}
  for (const tabla of TABLAS) {
    const { data: rows, error } = await supabase.from(tabla).select('*')
    if (error) throw new Error(`${tabla}: ${error.message}`)
    data[tabla] = rows ?? []
  }

  const backup = {
    app: 'El Becario',
    schema_version: 2,
    exported_at: new Date().toISOString(),
    data,
  }

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `el-becario-backup-${todayISO()}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
