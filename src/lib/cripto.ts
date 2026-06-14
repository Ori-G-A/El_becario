import { ensureSalt } from '../data/crypto'

/**
 * Cifrado client-side (Capa 2 del spec §8).
 * Clave = PBKDF2(PIN, salt del usuario) → AES-GCM 256.
 * La clave vive SOLO en memoria mientras la app está desbloqueada.
 */

const PREFIJO = 'enc:v1:'
const ITERACIONES = 210_000

let claveActual: CryptoKey | null = null

export function tieneClave(): boolean {
  return claveActual !== null
}

export function limpiarClave(): void {
  claveActual = null
}

function b64encode(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}

function b64decode(str: string): Uint8Array {
  const raw = atob(str)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

async function deriveKey(pin: string, saltB64: string): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: b64decode(saltB64) as BufferSource,
      iterations: ITERACIONES,
      hash: 'SHA-256',
    },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/** Deriva y guarda la clave en memoria a partir del PIN. */
export async function activarCripto(pin: string): Promise<void> {
  const salt = await ensureSalt()
  claveActual = await deriveKey(pin, salt)
}

export function estaCifrado(valor: string | null | undefined): boolean {
  return typeof valor === 'string' && valor.startsWith(PREFIJO)
}

export async function cifrarCampo(texto: string): Promise<string> {
  if (!claveActual) {
    throw new Error('Desbloquea con tu PIN para guardar contenido confidencial.')
  }
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      claveActual,
      new TextEncoder().encode(texto),
    ),
  )
  const combinado = new Uint8Array(iv.length + ct.length)
  combinado.set(iv)
  combinado.set(ct, iv.length)
  return PREFIJO + b64encode(combinado)
}

/** Descifra si corresponde; si está cifrado y no hay clave, devuelve un marcador. */
export async function descifrarCampo(valor: string): Promise<string> {
  if (!estaCifrado(valor)) return valor
  if (!claveActual) return '🔒 confidencial'
  try {
    const datos = b64decode(valor.slice(PREFIJO.length))
    const iv = datos.slice(0, 12)
    const ct = datos.slice(12)
    const plano = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      claveActual,
      ct as BufferSource,
    )
    return new TextDecoder().decode(plano)
  } catch {
    return '🔒 (no se pudo descifrar)'
  }
}
