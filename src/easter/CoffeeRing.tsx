import { useEffect, useState } from 'react'
import { CAFE_UMBRAL, getCafes } from './cafe'

/**
 * Mancha de café permanente, ganada con esfuerzo: aparece al juntar
 * CAFE_UMBRAL Top Goals completados. Decorativa, no interfiere con clics.
 */
export function CoffeeRing() {
  const [cafes, setCafes] = useState(0)

  useEffect(() => {
    getCafes().then(setCafes)
  }, [])

  if (cafes < CAFE_UMBRAL) return null

  return (
    <div
      aria-hidden
      title={`${cafes} cafés — el becario estuvo ocupado`}
      style={{
        position: 'fixed',
        right: 18,
        bottom: 18,
        width: 84,
        height: 84,
        opacity: 0.22,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <svg viewBox="0 0 100 100" width="84" height="84">
        <circle
          cx="50"
          cy="50"
          r="38"
          fill="none"
          stroke="#6B4B2F"
          strokeWidth="7"
          strokeDasharray="2 6 14 4 9 5"
        />
        <circle cx="50" cy="50" r="38" fill="#6B4B2F" opacity="0.08" />
      </svg>
    </div>
  )
}
