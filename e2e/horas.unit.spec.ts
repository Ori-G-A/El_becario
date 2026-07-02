import { test, expect } from '@playwright/test'
import { proximaMediaHora, masUnaHora } from '../src/lib/date'

test.describe('proximaMediaHora', () => {
  const casos: Array<[string, string]> = [
    ['2026-07-02T14:12:00', '14:30'],
    ['2026-07-02T14:30:00', '14:30'],
    ['2026-07-02T14:40:00', '15:00'],
    ['2026-07-02T00:00:00', '00:00'],
    ['2026-07-02T23:45:00', '00:00'],
  ]
  for (const [ahora, esperado] of casos) {
    test(`${ahora.slice(11, 16)} → ${esperado}`, () => {
      expect(proximaMediaHora(new Date(ahora))).toBe(esperado)
    })
  }
})

test.describe('masUnaHora', () => {
  test('suma una hora y da la vuelta a medianoche', () => {
    expect(masUnaHora('09:15')).toBe('10:15')
    expect(masUnaHora('23:30')).toBe('00:30')
  })
})
