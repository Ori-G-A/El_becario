import { defineConfig, devices } from '@playwright/test'
import { loadEnv } from 'vite'

// Usa el parser de Vite para respetar comillas, escapes y precedencia dotenv.
for (const [key, value] of Object.entries(loadEnv('test', process.cwd(), ''))) {
  process.env[key] ??= value
}

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
    { name: 'setup', testMatch: /auth\.setup\.ts/, use: { ...devices['Desktop Chrome'] } },
    {
      name: 'authed',
      testMatch: /\.authed\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/state.json' },
    },
  ],
  webServer: {
    command: 'pnpm dev --port 5099 --strictPort',
    url: 'http://localhost:5099',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
