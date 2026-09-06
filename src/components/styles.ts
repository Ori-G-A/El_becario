import type { CSSProperties } from 'react'

/** Input de texto con el lenguaje neo-brutalista (borde + sombra dura). */
export const inputStyle: CSSProperties = {
  width: '100%',
  padding: '0.7rem 0.8rem',
  fontFamily: 'var(--font-body)',
  fontSize: '0.95rem',
  color: 'var(--tinta)',
  background: 'var(--suave)',
  border: '1px solid var(--borde)',
  borderRadius: 10,
  outline: 'none',
}
