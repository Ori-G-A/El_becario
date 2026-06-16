import { test, expect } from '@playwright/test'
import {
  cuadranteDe,
  seleccionarTop12,
  TOP12_MAX,
  type TareaEisenhower,
} from '../src/lib/eisenhower'

function tarea(
  id: string,
  patch: Partial<TareaEisenhower> = {},
): TareaEisenhower {
  return {
    id,
    importante: false,
    urgente: false,
    estado: 'pendiente',
    top12_override: null,
    orden_top12: null,
    creada_en: `2026-01-${String(Number(id.replace(/\D/g, '')) || 1).padStart(2, '0')}`,
    ...patch,
  }
}

test('cuadranteDe clasifica los cuatro cuadrantes', () => {
  expect(cuadranteDe({ importante: true, urgente: true })).toBe('q1')
  expect(cuadranteDe({ importante: true, urgente: false })).toBe('q2')
  expect(cuadranteDe({ importante: false, urgente: true })).toBe('q3')
  expect(cuadranteDe({ importante: false, urgente: false })).toBe('q4')
})

test('seleccionarTop12 prioriza Q1, luego Q2, Q3 y Q4', () => {
  const ids = seleccionarTop12([
    tarea('q4-a'),
    tarea('q3-a', { urgente: true }),
    tarea('q2-a', { importante: true }),
    tarea('q1-a', { importante: true, urgente: true }),
  ])

  expect(ids).toEqual(['q1-a', 'q2-a', 'q3-a', 'q4-a'])
})

test('seleccionarTop12 respeta fijar, excluir y tareas hechas', () => {
  const ids = seleccionarTop12([
    tarea('normal-q1', { importante: true, urgente: true }),
    tarea('fijada-q4', { top12_override: 'fijar' }),
    tarea('excluida-q1', { importante: true, urgente: true, top12_override: 'excluir' }),
    tarea('hecha-q1', { importante: true, urgente: true, estado: 'hecha' }),
  ])

  expect(ids).toEqual(['fijada-q4', 'normal-q1'])
})

test('seleccionarTop12 limita a doce y usa orden manual como desempate', () => {
  const tareas = Array.from({ length: TOP12_MAX + 3 }, (_, i) =>
    tarea(`t${i + 1}`, {
      importante: true,
      urgente: true,
      orden_top12: i === 2 ? 0 : null,
    }),
  )

  const ids = seleccionarTop12(tareas)

  expect(ids).toHaveLength(TOP12_MAX)
  expect(ids[0]).toBe('t3')
  expect(ids).not.toContain('t13')
  expect(ids).not.toContain('t14')
  expect(ids).not.toContain('t15')
})
