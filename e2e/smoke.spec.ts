import { test, expect, type ConsoleMessage } from '@playwright/test'

/** Ruido esperable en dev que no indica un bug real. */
function esRuido(texto: string): boolean {
  return /service worker|workbox|manifest|favicon|sw\.js|\[vite\]/i.test(texto)
}

test('la pantalla de acceso carga sin errores ni pantalla en blanco', async ({ page }) => {
  const errores: string[] = []
  page.on('pageerror', (e) => errores.push(`pageerror: ${e.message}`))
  page.on('console', (m: ConsoleMessage) => {
    if (m.type() === 'error' && !esRuido(m.text())) errores.push(`console: ${m.text()}`)
  })

  await page.goto('/')

  // No debe quedar en blanco: el shell de acceso tiene que renderizar.
  await expect(page.getByRole('heading', { name: 'El Becario' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Envíame el enlace/ })).toBeVisible()

  await page.screenshot({ path: 'e2e/screenshots/login.png' })

  expect(errores, errores.join('\n')).toEqual([])
})
