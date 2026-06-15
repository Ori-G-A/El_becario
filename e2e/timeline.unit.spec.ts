import { test, expect } from '@playwright/test'
import { layoutSolapamiento, topYAltoEnDia, PX_POR_MIN } from '../src/lib/timeline'

test('solapes: dos bloques que se pisan quedan en columnas distintas', () => {
  const m = layoutSolapamiento([
    { id: 'a', ini: 0, fin: 60 },
    { id: 'b', ini: 30, fin: 90 },
  ])
  expect(m.get('a')!.cols).toBe(2)
  expect(m.get('b')!.cols).toBe(2)
  expect(m.get('a')!.col).not.toBe(m.get('b')!.col)
})

test('sin solape: una sola columna cada uno', () => {
  const m = layoutSolapamiento([
    { id: 'a', ini: 0, fin: 60 },
    { id: 'b', ini: 60, fin: 120 },
  ])
  expect(m.get('a')!.cols).toBe(1)
  expect(m.get('b')!.cols).toBe(1)
})

test('recorte por día: sueño 23:00→07:00 se corta a medianoche en el día de inicio', () => {
  const diaMs = new Date(2026, 5, 14, 0, 0).getTime()
  const ini = new Date(2026, 5, 14, 23, 0).toISOString()
  const fin = new Date(2026, 5, 15, 7, 0).toISOString() // día siguiente
  const { top, alto } = topYAltoEnDia(ini, fin, diaMs)
  expect(Math.round(top)).toBe(Math.round(23 * 60 * PX_POR_MIN)) // arranca 23:00
  expect(Math.round(alto)).toBe(Math.round(60 * PX_POR_MIN)) // solo 23:00→24:00 (1 h)
})

test('recorte por día: la mañana del sueño aparece en el día siguiente', () => {
  const diaMs = new Date(2026, 5, 15, 0, 0).getTime()
  const ini = new Date(2026, 5, 14, 23, 0).toISOString() // empezó el día anterior
  const fin = new Date(2026, 5, 15, 7, 0).toISOString()
  const { top, alto } = topYAltoEnDia(ini, fin, diaMs)
  expect(Math.round(top)).toBe(0) // arranca a las 00:00
  expect(Math.round(alto)).toBe(Math.round(7 * 60 * PX_POR_MIN)) // 00:00→07:00 (7 h)
})
