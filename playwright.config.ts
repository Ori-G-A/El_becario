import { defineConfig, devices } from '@playwright/test'
import { readFileSync, existsSync } from 'node:fs'

// Carga simple de .env.local y .env.test en process.env (sin dependencias).
function loadEnv(file: string) {
  if (!existsSync(file)) return
  for (const linea of readFileSync(file, 'utf8').split('\n')) {
    const t = linea.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    const k = t.slice(0, i).trim()
    if (!process.env[k]) process.env[k] = t.slice(i + 1).trim()
  }
}
loadEnv('.env.local')
loadEnv('.env.test')

const hayAuth = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.E2E_EMAIL)

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5099',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'pub',
      testMatch: /(smoke|unit)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    ...(hayAuth
      ? [
          { name: 'setup', testMatch: /auth\.setup\.ts/, use: { ...devices['Desktop Chrome'] } },
          {
            name: 'authed',
            testMatch: /\.authed\.spec\.ts/,
            dependencies: ['setup'],
            use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/state.json' },
          },
        ]
      : []),
  ],
  webServer: {
    command: 'pnpm dev --port 5099 --strictPort',
    url: 'http://localhost:5099',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
