import { test, expect } from '@playwright/test'
import { fechasEntre } from '../src/lib/date'

test('todos los días del rango (dias=null)', () => {
  expect(fechasEntre('2026-06-15', '2026-06-18', null)).toEqual([
    '2026-06-15',
    '2026-06-16',
    '2026-06-17',
    '2026-06-18',
  ])
})

test('solo lunes (1) y miércoles (3) de una semana', () => {
  // 2026-06-15 es lunes.
  expect(fechasEntre('2026-06-15', '2026-06-21', [1, 3])).toEqual([
    '2026-06-15', // lunes
    '2026-06-17', // miércoles
  ])
})

test('rango invertido devuelve vacío', () => {
  expect(fechasEntre('2026-06-18', '2026-06-15', null)).toEqual([])
})

test('mismo día con día de semana que coincide', () => {
  // 2026-06-17 es miércoles (3).
  expect(fechasEntre('2026-06-17', '2026-06-17', [3])).toEqual(['2026-06-17'])
  expect(fechasEntre('2026-06-17', '2026-06-17', [1])).toEqual([])
})

test('tope de seguridad: no pasa de 366 días', () => {
  expect(fechasEntre('2020-01-01', '2030-01-01', null)).toHaveLength(366)
})
