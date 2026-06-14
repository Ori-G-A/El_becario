/**
 * Utilidades de hashing para el app-lock (PIN).
 * SHA-256 vía Web Crypto. El PIN nunca sale del dispositivo.
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
