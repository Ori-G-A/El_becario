/**
 * App-lock con PIN — almacenamiento device-local.
 *
 * Guardamos solo { salt, hash } en IndexedDB. El PIN en claro nunca se persiste
 * ni viaja al servidor. En Fase 3, la clave de cifrado de campos Nivel 1 se
 * derivará del PIN (por eso vive client-side).
 */

import { hashPin, randomSaltHex } from './crypto'
import { kvGet, kvSet, kvDelete } from './kvStore'

const LEGACY_PIN_KEY = 'app-lock-pin'
const pinKey = (userId: string) => `${LEGACY_PIN_KEY}:${userId}`
export const PIN_MIN_LENGTH = 6
export const PIN_MAX_LENGTH = 10

interface StoredPin {
  salt: string
  hash: string
}

/** ¿Ya hay un PIN configurado para este usuario en este dispositivo? */
export async function hasPin(userId: string): Promise<boolean> {
  const key = pinKey(userId)
  let stored = await kvGet<StoredPin>(key)

  // Migración transparente desde la versión que compartía un único PIN local.
  if (!stored) {
    const legacy = await kvGet<StoredPin>(LEGACY_PIN_KEY)
    if (legacy) {
      await kvSet(key, legacy)
      await kvDelete(LEGACY_PIN_KEY)
      stored = legacy
    }
  }

  return Boolean(stored?.hash)
}

/** Crea o reemplaza el PIN local de un usuario. */
export async function setPin(userId: string, pin: string): Promise<void> {
  const salt = randomSaltHex()
  const hash = await hashPin(pin, salt)
  await kvSet<StoredPin>(pinKey(userId), { salt, hash })
}

/** Verifica un PIN contra el hash guardado. */
export async function verifyPin(userId: string, pin: string): Promise<boolean> {
  const stored = await kvGet<StoredPin>(pinKey(userId))
  if (!stored) return false
  const hash = await hashPin(pin, stored.salt)
  return hash === stored.hash
}

/** Elimina el PIN del dispositivo (p. ej. al cerrar sesión y olvidar equipo). */
export async function clearPin(userId: string): Promise<void> {
  await kvDelete(pinKey(userId))
}
