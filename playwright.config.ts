import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5099',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Puerto dedicado y estricto para no chocar con otros dev servers (Oulad).
    command: 'pnpm dev --port 5099 --strictPort',
    url: 'http://localhost:5099',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
