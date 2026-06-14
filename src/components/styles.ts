import type { CSSProperties } from 'react'

/** Input de texto con el lenguaje neo-brutalista (borde + sombra dura). */
export const inputStyle: CSSProperties = {
  width: '100%',
  padding: '0.65rem 0.8rem',
  fontFamily: 'var(--font-body)',
  fontSize: '1rem',
  color: 'var(--tinta)',
  background: 'var(--papel)',
  border: 'var(--borde)',
  borderRadius: 'var(--radio)',
  boxShadow: 'var(--sombra-dura-sm)',
  outline: 'none',
}
