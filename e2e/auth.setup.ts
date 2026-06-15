import { test as setup } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const STATE = 'e2e/.auth/state.json'

function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Falta ${name}. Copia .env.test.example a .env.test y completa los valores.`)
  }
  return value
}

function validarDestino(url: string, expectedRef: string, email: string) {
  const parsed = new URL(url)
  const match = parsed.hostname.match(/^([a-z0-9-]+)\.supabase\.co$/i)
  const actualRef = match?.[1]

  if (!actualRef || actualRef !== expectedRef) {
    throw new Error(
      `E2E bloqueado: VITE_SUPABASE_URL apunta a "${actualRef ?? parsed.hostname}", ` +
        `pero E2E_PROJECT_REF confirma "${expectedRef}".`,
    )
  }

  if (!/(e2e|test|qa|playwright)/i.test(email)) {
    throw new Error(
      'E2E bloqueado: E2E_EMAIL debe ser una cuenta dedicada e incluir e2e, test, qa o playwright.',
    )
  }
}

setup('autenticar con service role', async ({ page }) => {
  const url = requireEnv('VITE_SUPABASE_URL')
  const anon = requireEnv('VITE_SUPABASE_ANON_KEY')
  const service = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  const email = requireEnv('E2E_EMAIL')
  const expectedRef = requireEnv('E2E_PROJECT_REF')

  validarDestino(url, expectedRef, email)
  if (service === anon || service.startsWith('sb_publishable_')) {
    throw new Error('E2E bloqueado: SUPABASE_SERVICE_ROLE_KEY no parece una service role key.')
  }

  // 1) Generar un OTP de magic link con la service role key (sin correo).
  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: link, error: e1 } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  if (e1) throw e1
  const otp = link.properties?.email_otp
  if (!otp) throw new Error('No vino email_otp del generateLink')

  // 2) Canjear el OTP por una sesión real con la anon key.
  const client = createClient(url, anon, { auth: { persistSession: false } })
  const { data: sess, error: e2 } = await client.auth.verifyOtp({
    email,
    token: otp,
    type: 'email',
  })
  if (e2) throw e2
  if (!sess.session) throw new Error('verifyOtp no devolvió sesión')

  // 3) Inyectar la sesión en localStorage del origen y guardar el storageState.
  await page.goto('/')
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value),
    [`sb-${expectedRef}-auth-token`, JSON.stringify(sess.session)] as const,
  )

  mkdirSync(dirname(STATE), { recursive: true })
  await page.context().storageState({ path: STATE })
})
