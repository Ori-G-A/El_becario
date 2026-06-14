import { useEffect, useRef } from 'react'

/** Detecta long-press (touch o mouse). Devuelve handlers para el elemento. */
export function useLongPress(onLongPress: () => void, ms = 600) {
  const timer = useRef<number | undefined>(undefined)

  const start = () => {
    timer.current = window.setTimeout(onLongPress, ms)
  }
  const cancel = () => window.clearTimeout(timer.current)

  return {
    onPointerDown: start,
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onContextMenu: (e: React.MouseEvent) => {
      // En desktop, el clic derecho también abre el huevo de pascua.
      e.preventDefault()
      onLongPress()
    },
  }
}

const KONAMI = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
]

/** Dispara `onUnlock` cuando se teclea el código Konami. */
export function useKonami(onUnlock: () => void) {
  const pos = useRef(0)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tecla = e.key.length === 1 ? e.key.toLowerCase() : e.key
      if (tecla === KONAMI[pos.current]) {
        pos.current += 1
        if (pos.current === KONAMI.length) {
          pos.current = 0
          onUnlock()
        }
      } else {
        pos.current = tecla === KONAMI[0] ? 1 : 0
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onUnlock])
}
