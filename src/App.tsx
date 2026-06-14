import { useState } from 'react'
import { useAuth } from './auth/useAuth'
import { useLock } from './lock/useLock'
import { isSupabaseConfigured } from './lib/supabase'
import { LoginScreen } from './screens/LoginScreen'
import { LockScreen } from './screens/LockScreen'
import { ConfigScreen } from './screens/ConfigScreen'
import { AppShell, type View } from './components/AppShell'
import { AreasModule } from './areas/AreasModule'
import { Top12Module } from './tareas/Top12Module'
import { IniciativasModule } from './iniciativas/IniciativasModule'
import { RevisionModule } from './revision/RevisionModule'
import { CalendarioModule } from './calendario/CalendarioModule'

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
  const [view, setView] = useState<View>('calendario')

  if (!isSupabaseConfigured) return <ConfigScreen />
  if (authLoading || lockLoading) return <LoadingScreen />
  if (!session) return <LoginScreen />
  if (locked) return <LockScreen />

  return (
    <AppShell view={view} onNavigate={setView}>
      {view === 'calendario' && <CalendarioModule />}
      {view === 'top12' && <Top12Module />}
      {view === 'iniciativas' && <IniciativasModule />}
      {view === 'areas' && <AreasModule />}
      {view === 'revision' && <RevisionModule />}
    </AppShell>
  )
}

export default App
