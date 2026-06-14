import { kvGet, kvSet } from '../lib/kvStore'

const KEY = 'cafe-top-goals'

/** A partir de cuántos cafés aparece la mancha permanente. */
export const CAFE_UMBRAL = 5

/** Cafés acumulados (un Top Goal completado = una taza). Device-local. */
export async function getCafes(): Promise<number> {
  return (await kvGet<number>(KEY)) ?? 0
}

export async function sumarCafe(): Promise<number> {
  const n = (await getCafes()) + 1
  await kvSet(KEY, n)
  return n
}
