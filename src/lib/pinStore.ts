/**
 * App-lock con PIN — almacenamiento device-local.
 *
 * Guardamos solo { salt, hash } en IndexedDB. El PIN en claro nunca se persiste
 * ni viaja al servidor. El hash local usa PBKDF2; si existe un hash antiguo
 * SHA-256, se migra al desbloquear correctamente.
 */

import { hashPin, pbkdf2PinHex, randomSaltHex } from './crypto'
import { kvGet, kvSet, kvDelete } from './kvStore'

const LEGACY_PIN_KEY = 'app-lock-pin'
const pinKey = (userId: string) => `${LEGACY_PIN_KEY}:${userId}`
const attemptsKey = (userId: string) => `${LEGACY_PIN_KEY}:attempts:${userId}`
const PIN_HASH_VERSION = 2
const PIN_HASH_ITERATIONS = 310_000
const MAX_ATTEMPTS_BEFORE_COOLDOWN = 5
const BASE_COOLDOWN_MS = 30_000
const MAX_COOLDOWN_MS = 5 * 60_000
export const PIN_MIN_LENGTH = 6
export const PIN_MAX_LENGTH = 10

interface StoredPinV1 {
  salt: string
  hash: string
}

interface StoredPinV2 extends StoredPinV1 {
  version: typeof PIN_HASH_VERSION
  iterations: number
}

type StoredPin = StoredPinV1 | StoredPinV2
interface PinAttemptState {
  failed: number
  lockedUntil: number
}

export interface VerifyPinResult {
  ok: boolean
  lockedUntil: number | null
  attemptsLeft: number
}

function isStoredPinV2(stored: StoredPin): stored is StoredPinV2 {
  return 'version' in stored && stored.version === PIN_HASH_VERSION
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
  const hash = await pbkdf2PinHex(pin, salt, PIN_HASH_ITERATIONS)
  await kvSet<StoredPinV2>(pinKey(userId), {
    version: PIN_HASH_VERSION,
    iterations: PIN_HASH_ITERATIONS,
    salt,
    hash,
  })
  await clearAttempts(userId)
}

async function clearAttempts(userId: string): Promise<void> {
  await kvDelete(attemptsKey(userId))
}

function cooldownMs(failed: number): number {
  const escalon = Math.max(0, failed - MAX_ATTEMPTS_BEFORE_COOLDOWN)
  return Math.min(BASE_COOLDOWN_MS * 2 ** escalon, MAX_COOLDOWN_MS)
}

async function registerFailedAttempt(userId: string): Promise<VerifyPinResult> {
  const key = attemptsKey(userId)
  const prev = await kvGet<PinAttemptState>(key)
  const failed = (prev?.failed ?? 0) + 1
  const attemptsLeft = Math.max(0, MAX_ATTEMPTS_BEFORE_COOLDOWN - failed)
  const lockedUntil =
    failed >= MAX_ATTEMPTS_BEFORE_COOLDOWN ? Date.now() + cooldownMs(failed) : 0
  await kvSet<PinAttemptState>(key, { failed, lockedUntil })
  return { ok: false, lockedUntil: lockedUntil || null, attemptsLeft }
}

/** Verifica un PIN contra el hash guardado y aplica cooldown por fallos. */
export async function verifyPin(userId: string, pin: string): Promise<VerifyPinResult> {
  const attempts = await kvGet<PinAttemptState>(attemptsKey(userId))
  if (attempts?.lockedUntil && attempts.lockedUntil > Date.now()) {
    return { ok: false, lockedUntil: attempts.lockedUntil, attemptsLeft: 0 }
  }

  const stored = await kvGet<StoredPin>(pinKey(userId))
  if (!stored) return { ok: false, lockedUntil: null, attemptsLeft: 0 }

  if (isStoredPinV2(stored)) {
    const hash = await pbkdf2PinHex(pin, stored.salt, stored.iterations)
    if (hash === stored.hash) {
      await clearAttempts(userId)
      return { ok: true, lockedUntil: null, attemptsLeft: MAX_ATTEMPTS_BEFORE_COOLDOWN }
    }
    return registerFailedAttempt(userId)
  }

  const legacyHash = await hashPin(pin, stored.salt)
  const ok = legacyHash === stored.hash
  if (ok) {
    await setPin(userId, pin)
    return { ok: true, lockedUntil: null, attemptsLeft: MAX_ATTEMPTS_BEFORE_COOLDOWN }
  }
  return registerFailedAttempt(userId)
}

/** Elimina el PIN del dispositivo (p. ej. al cerrar sesión y olvidar equipo). */
export async function clearPin(userId: string): Promise<void> {
  await kvDelete(pinKey(userId))
  await clearAttempts(userId)
}
