import { test, expect } from '@playwright/test'
import { calcularMetricas } from '../src/lib/metricas'
import type { Bloque } from '../src/types/database'

const AHORA = new Date('2026-07-02T15:00:00')

function bloque(parcial: Partial<Bloque>): Bloque {
  return {
    id: 'x',
    user_id: 'u',
    tarea_id: null,
    iniciativa_id: null,
    titulo: 't',
    inicio: '2026-07-02T09:00:00',
    fin: '2026-07-02T10:00:00',
    real_inicio: null,
    real_fin: null,
    tipo: 'trabajo_profundo',
    protegido: false,
    importante: false,
    confidencial: false,
    no_cumplido: false,
    aviso_min_antes: null,
    aviso_enviado: false,
    serie_id: null,
    creada_en: '',
    actualizada_en: '',
    ...parcial,
  }
}

test('autocuidado pasado sin registro cuenta como respetado', () => {
  const m = calcularMetricas(
    [bloque({ tipo: 'autocuidado', inicio: '2026-07-02T12:00:00', fin: '2026-07-02T13:00:00' })],
    AHORA,
  )
  expect(m.autoRespetados).toBe(1)
  expect(m.pctAutocuidado).toBe(1)
})

test('autocuidado futuro sin registro aun no cuenta', () => {
  const m = calcularMetricas(
    [bloque({ tipo: 'autocuidado', inicio: '2026-07-02T18:00:00', fin: '2026-07-02T19:00:00' })],
    AHORA,
  )
  expect(m.autoRespetados).toBe(0)
})

test('horas trabajadas usan el plan cuando no hay registro', () => {
  const m = calcularMetricas([bloque({})], AHORA)
  expect(m.horasTrabajadas).toBe(1)
})

test('un bloque reportado como no cumplido no suma horas', () => {
  const m = calcularMetricas([bloque({ no_cumplido: true })], AHORA)
  expect(m.horasTrabajadas).toBe(0)
})

test('autocuidado pasado pero no cumplido no cuenta como respetado', () => {
  const m = calcularMetricas(
    [
      bloque({
        tipo: 'autocuidado',
        inicio: '2026-07-02T12:00:00',
        fin: '2026-07-02T13:00:00',
        no_cumplido: true,
      }),
    ],
    AHORA,
  )
  expect(m.autoRespetados).toBe(0)
  expect(m.pctAutocuidado).toBe(0)
})
