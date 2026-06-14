import { useAuth } from './auth/useAuth'
import { useLock } from './lock/useLock'
import { isSupabaseConfigured } from './lib/supabase'
import { LoginScreen } from './screens/LoginScreen'
import { LockScreen } from './screens/LockScreen'
import { ConfigScreen } from './screens/ConfigScreen'
import { AppShell } from './components/AppShell'
import { AreasModule } from './areas/AreasModule'

function LoadingScreen() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <p className="mono-tag">Abriendo el escritorio…</p>
    </main>
  )
}

function App() {
  const { session, loading: authLoading } = useAuth()
  const { locked, loading: lockLoading } = useLock()

  if (!isSupabaseConfigured) return <ConfigScreen />
  if (authLoading || lockLoading) return <LoadingScreen />
  if (!session) return <LoginScreen />
  if (locked) return <LockScreen />

  return (
    <AppShell>
      <AreasModule />
    </AppShell>
  )
}

export default App
