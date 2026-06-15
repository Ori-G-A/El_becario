import { test, expect } from '@playwright/test'

const PIN = '135790'

/** Entra: crea el PIN (IndexedDB arranca vacío en cada contexto) y espera el Día. */
async function entrar(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.locator('#pin').fill(PIN)
  await page.locator('#pin-confirm').fill(PIN)
  await page.getByRole('button', { name: /Crear PIN y entrar/ }).click()
  await expect(page.getByRole('button', { name: 'Nuevo bloque' })).toBeVisible({ timeout: 15_000 })
}

test('el sueño que cruza la medianoche se puede agendar', async ({ page }) => {
  page.on('dialog', (d) => d.accept()) // aceptar el confirm de borrado
  await entrar(page)

  const titulo = `Sueño E2E ${Date.now()}`

  await page.getByRole('button', { name: 'Nuevo bloque' }).click()
  await page.locator('#bloque-titulo').fill(titulo)
  await page.locator('#bloque-ini').fill('23:00')
  await page.locator('#bloque-fin').fill('07:00')

  // El form debe entender que cruza la medianoche (antes lo rechazaba).
  await expect(page.getByText(/Termina al día siguiente/)).toBeVisible()
  await page.getByRole('button', { name: 'Sueño', exact: true }).click()
  await page.getByRole('button', { name: 'Agendar' }).click()

  // El bloque aparece en el timeline.
  const bloque = page.getByRole('button', { name: new RegExp(titulo) })
  await expect(bloque).toBeVisible({ timeout: 10_000 })

  await page.screenshot({ path: 'e2e/screenshots/calendario-sueno.png', fullPage: true })

  // Limpieza: borrar el bloque creado.
  await bloque.click()
  await page.getByRole('button', { name: /Borrar bloque/ }).click()
  await expect(page.getByRole('button', { name: new RegExp(titulo) })).toHaveCount(0)
})
