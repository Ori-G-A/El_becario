import { test as setup } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const URL = process.env.VITE_SUPABASE_URL!
const ANON = process.env.VITE_SUPABASE_ANON_KEY!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!
const EMAIL = process.env.E2E_EMAIL!
const STATE = 'e2e/.auth/state.json'

setup('autenticar con service role', async ({ page }) => {
  const ref = URL.match(/https:\/\/([^.]+)\./)![1]

  // 1) Generar un OTP de magic link con la service role key (sin correo).
  const admin = createClient(URL, SERVICE, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: link, error: e1 } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: EMAIL,
  })
  if (e1) throw e1
  const otp = link.properties?.email_otp
  if (!otp) throw new Error('No vino email_otp del generateLink')

  // 2) Canjear el OTP por una sesión real con la anon key.
  const anon = createClient(URL, ANON, { auth: { persistSession: false } })
  const { data: sess, error: e2 } = await anon.auth.verifyOtp({
    email: EMAIL,
    token: otp,
    type: 'email',
  })
  if (e2) throw e2
  if (!sess.session) throw new Error('verifyOtp no devolvió sesión')

  // 3) Inyectar la sesión en localStorage del origen y guardar el storageState.
  await page.goto('/')
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value),
    [`sb-${ref}-auth-token`, JSON.stringify(sess.session)] as const,
  )

  mkdirSync(dirname(STATE), { recursive: true })
  await page.context().storageState({ path: STATE })
})
