/**
 * App-lock con PIN — almacenamiento device-local.
 *
 * Guardamos solo { salt, hash } en IndexedDB. El PIN en claro nunca se persiste
 * ni viaja al servidor. En Fase 3, la clave de cifrado de campos Nivel 1 se
 * derivará del PIN (por eso vive client-side).
 */

import { hashPin, randomSaltHex } from './crypto'
import { kvGet, kvSet, kvDelete } from './kvStore'

const PIN_KEY = 'app-lock-pin'
export const PIN_MIN_LENGTH = 6
export const PIN_MAX_LENGTH = 10

interface StoredPin {
  salt: string
  hash: string
}

/** ¿Ya hay un PIN configurado en este dispositivo? */
export async function hasPin(): Promise<boolean> {
  const stored = await kvGet<StoredPin>(PIN_KEY)
  return Boolean(stored?.hash)
}

/** Crea o reemplaza el PIN del dispositivo. */
export async function setPin(pin: string): Promise<void> {
  const salt = randomSaltHex()
  const hash = await hashPin(pin, salt)
  await kvSet<StoredPin>(PIN_KEY, { salt, hash })
}

/** Verifica un PIN contra el hash guardado. */
export async function verifyPin(pin: string): Promise<boolean> {
  const stored = await kvGet<StoredPin>(PIN_KEY)
  if (!stored) return false
  const hash = await hashPin(pin, stored.salt)
  return hash === stored.hash
}

/** Elimina el PIN del dispositivo (p. ej. al cerrar sesión y olvidar equipo). */
export async function clearPin(): Promise<void> {
  await kvDelete(PIN_KEY)
}
