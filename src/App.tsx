import { lazy, Suspense, useState } from 'react'
import { useAuth } from './auth/useAuth'
import { useLock } from './lock/useLock'
import { isSupabaseConfigured } from './lib/supabase'
import { LoginScreen } from './screens/LoginScreen'
import { LockScreen } from './screens/LockScreen'
import { ConfigScreen } from './screens/ConfigScreen'
import { AppShell, type View } from './components/AppShell'

// Cada módulo se carga al abrir su pestaña (split de dnd-kit, recharts, etc.).
const CalendarioModule = lazy(() =>
  import('./calendario/CalendarioModule').then((m) => ({ default: m.CalendarioModule })),
)
const Top12Module = lazy(() =>
  import('./tareas/Top12Module').then((m) => ({ default: m.Top12Module })),
)
const IniciativasModule = lazy(() =>
  import('./iniciativas/IniciativasModule').then((m) => ({ default: m.IniciativasModule })),
)
const AreasModule = lazy(() =>
  import('./areas/AreasModule').then((m) => ({ default: m.AreasModule })),
)
const RevisionModule = lazy(() =>
  import('./revision/RevisionModule').then((m) => ({ default: m.RevisionModule })),
)
const DashboardModule = lazy(() =>
  import('./dashboard/DashboardModule').then((m) => ({ default: m.DashboardModule })),
)

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
      <Suspense fallback={<p className="mono-tag" style={{ padding: '1rem 0' }}>Cargando…</p>}>
        {view === 'calendario' && <CalendarioModule />}
        {view === 'top12' && <Top12Module />}
        {view === 'iniciativas' && <IniciativasModule />}
        {view === 'areas' && <AreasModule />}
        {view === 'revision' && <RevisionModule />}
        {view === 'panel' && <DashboardModule />}
      </Suspense>
    </AppShell>
  )
}

export default App
