/**
 * Utilidades de hashing para el app-lock (PIN).
 * El PIN nunca sale del dispositivo.
 */

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Hash SHA-256 (hex) de un string. */
export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return toHex(digest)
}

/** Salt aleatorio (hex) de 16 bytes. */
export function randomSaltHex(): string {
  const salt = new Uint8Array(16)
  crypto.getRandomValues(salt)
  return Array.from(salt)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Hash salado del PIN: SHA-256(salt + pin). */
export function hashPin(pin: string, salt: string): Promise<string> {
  return sha256Hex(`${salt}:${pin}`)
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(hex)) {
    throw new Error('Hex invalido.')
  }
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

/** Hash PBKDF2-SHA-256 del PIN para almacenamiento local resistente a fuerza bruta. */
export async function pbkdf2PinHex(
  pin: string,
  saltHex: string,
  iterations: number,
): Promise<string> {
  const base = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: hexToBytes(saltHex) as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    base,
    256,
  )
  return toHex(bits)
}
