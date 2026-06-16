import { supabase } from '../lib/supabase'
import { todayISO } from '../lib/date'
import type { Database } from '../types/database'

const BACKUP_VERSION = 2

const TABLAS = [
  'area',
  'iniciativa',
  'tarea',
  'tarea_area',
  'revision_semanal',
  'bloque',
  'user_crypto',
] as const

const TABLAS_RESTAURABLES = [
  'area',
  'iniciativa',
  'tarea',
  'tarea_area',
  'revision_semanal',
  'bloque',
] as const

type Tabla = (typeof TABLAS)[number]
type TablaRestaurable = (typeof TABLAS_RESTAURABLES)[number]
type BackupData = Partial<Record<Tabla, unknown[]>>
type Tables = Database['public']['Tables']
type AreaInsert = Tables['area']['Insert']
type IniciativaInsert = Tables['iniciativa']['Insert']
type TareaInsert = Tables['tarea']['Insert']
type TareaAreaInsert = Tables['tarea_area']['Insert']
type RevisionInsert = Tables['revision_semanal']['Insert']
type BloqueInsert = Tables['bloque']['Insert']
type UserCryptoInsert = Tables['user_crypto']['Insert']

export interface RestoreResult {
  restored: Record<TablaRestaurable | 'user_crypto', number>
}

const COLUMNAS_PERMITIDAS: Record<TablaRestaurable, readonly string[]> = {
  area: ['id', 'user_id', 'nombre', 'color', 'icono', 'orden', 'creada_en'],
  iniciativa: [
    'id',
    'user_id',
    'nombre',
    'descripcion',
    'stl_responsable',
    'es_equipo',
    'estado_rag',
    'orden_prioridad',
    'activa',
    'creada_en',
    'actualizada_en',
  ],
  tarea: [
    'id',
    'user_id',
    'iniciativa_id',
    'titulo',
    'responsable',
    'estimacion_min',
    'estado',
    'importante',
    'urgente',
    'top12_override',
    'es_top12',
    'es_top_goal',
    'orden_top12',
    'confidencial',
    'fecha',
    'creada_en',
    'actualizada_en',
  ],
  tarea_area: ['tarea_id', 'area_id', 'user_id'],
  revision_semanal: [
    'id',
    'user_id',
    'semana',
    'rag_global',
    'notas',
    'creada_en',
    'actualizada_en',
  ],
  bloque: [
    'id',
    'user_id',
    'tarea_id',
    'titulo',
    'inicio',
    'fin',
    'real_inicio',
    'real_fin',
    'tipo',
    'protegido',
    'importante',
    'aviso_min_antes',
    'aviso_enviado',
    'creada_en',
    'actualizada_en',
  ],
}

const COLUMNAS_REQUERIDAS: Record<TablaRestaurable, readonly string[]> = {
  area: ['id', 'nombre', 'color'],
  iniciativa: ['id', 'nombre'],
  tarea: ['id', 'titulo'],
  tarea_area: ['tarea_id', 'area_id'],
  revision_semanal: ['semana'],
  bloque: ['id', 'titulo', 'inicio', 'fin'],
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asRows(data: BackupData, tabla: Tabla): Record<string, unknown>[] {
  const rows = data[tabla]
  if (rows === undefined) return []
  if (!Array.isArray(rows)) {
    throw new Error(`Backup invalido: data.${tabla} debe ser una lista.`)
  }
  if (!rows.every(isRecord)) {
    throw new Error(`Backup invalido: data.${tabla} contiene filas invalidas.`)
  }
  return rows
}

function parseBackup(texto: string): BackupData {
  let parsed: unknown
  try {
    parsed = JSON.parse(texto)
  } catch {
    throw new Error('El archivo no es un JSON valido.')
  }

  if (!isRecord(parsed) || parsed.app !== 'El Becario') {
    throw new Error('Este archivo no parece ser un backup de El Becario.')
  }
  if (parsed.schema_version !== 1 && parsed.schema_version !== BACKUP_VERSION) {
    throw new Error(`Version de backup no soportada: ${String(parsed.schema_version)}.`)
  }
  if (!isRecord(parsed.data)) {
    throw new Error('Backup invalido: falta el bloque data.')
  }

  return parsed.data as BackupData
}

async function getUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw new Error(error.message)
  const userId = data.user?.id
  if (!userId) throw new Error('Se requiere una sesion activa para restaurar.')
  return userId
}

function sanearFila(
  tabla: TablaRestaurable,
  row: Record<string, unknown>,
  userId: string,
): Record<string, unknown> {
  for (const columna of COLUMNAS_REQUERIDAS[tabla]) {
    if (row[columna] === undefined || row[columna] === null || row[columna] === '') {
      throw new Error(`Backup invalido: ${tabla} tiene una fila sin ${columna}.`)
    }
  }

  const permitido = new Set(COLUMNAS_PERMITIDAS[tabla])
  const limpia: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    if (permitido.has(key)) limpia[key] = value
  }
  limpia.user_id = userId
  return limpia
}

async function validarSalt(data: BackupData, userId: string): Promise<number> {
  const rows = asRows(data, 'user_crypto')
  const salt = rows.find((row) => typeof row.salt === 'string')?.salt
  if (typeof salt !== 'string') return 0

  const actual = await supabase.from('user_crypto').select('salt').maybeSingle()
  if (actual.error) throw new Error(`user_crypto: ${actual.error.message}`)

  if (actual.data?.salt) {
    if (actual.data.salt !== salt) {
      throw new Error(
        'El backup usa otro salt de cifrado. Restaurarlo aqui dejaria datos ilegibles con este PIN.',
      )
    }
    return 0
  }

  const ins = await supabase
    .from('user_crypto')
    .insert({ user_id: userId, salt } as UserCryptoInsert)
  if (ins.error) throw new Error(`user_crypto: ${ins.error.message}`)
  return 1
}

async function upsertTabla(
  tabla: TablaRestaurable,
  rows: Record<string, unknown>[],
): Promise<number> {
  if (rows.length === 0) return 0

  switch (tabla) {
    case 'area': {
      const { error } = await supabase.from('area').upsert(rows as AreaInsert[], { onConflict: 'id' })
      if (error) throw new Error(`area: ${error.message}`)
      return rows.length
    }
    case 'iniciativa': {
      const { error } = await supabase
        .from('iniciativa')
        .upsert(rows as IniciativaInsert[], { onConflict: 'id' })
      if (error) throw new Error(`iniciativa: ${error.message}`)
      return rows.length
    }
    case 'tarea': {
      const { error } = await supabase.from('tarea').upsert(rows as TareaInsert[], { onConflict: 'id' })
      if (error) throw new Error(`tarea: ${error.message}`)
      return rows.length
    }
    case 'tarea_area': {
      const { error } = await supabase
        .from('tarea_area')
        .upsert(rows as TareaAreaInsert[], {
          ignoreDuplicates: true,
          onConflict: 'tarea_id,area_id',
        })
      if (error) throw new Error(`tarea_area: ${error.message}`)
      return rows.length
    }
    case 'revision_semanal': {
      const { error } = await supabase
        .from('revision_semanal')
        .upsert(rows as RevisionInsert[], { onConflict: 'user_id,semana' })
      if (error) throw new Error(`revision_semanal: ${error.message}`)
      return rows.length
    }
    case 'bloque': {
      const { error } = await supabase.from('bloque').upsert(rows as BloqueInsert[], { onConflict: 'id' })
      if (error) throw new Error(`bloque: ${error.message}`)
      return rows.length
    }
  }
}

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
    schema_version: BACKUP_VERSION,
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

/**
 * Restaura de forma incremental: no borra datos actuales. Las filas se
 * reasignan al usuario activo, siempre que el salt de cifrado sea compatible.
 */
export async function restaurarBackupDesdeTexto(texto: string): Promise<RestoreResult> {
  const data = parseBackup(texto)
  const userId = await getUserId()
  const restored: RestoreResult['restored'] = {
    area: 0,
    iniciativa: 0,
    tarea: 0,
    tarea_area: 0,
    revision_semanal: 0,
    bloque: 0,
    user_crypto: await validarSalt(data, userId),
  }

  for (const tabla of TABLAS_RESTAURABLES) {
    const rows = asRows(data, tabla).map((row) => sanearFila(tabla, row, userId))
    restored[tabla] = await upsertTabla(tabla, rows)
  }

  return { restored }
}
