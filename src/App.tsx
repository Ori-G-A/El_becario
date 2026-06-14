import { lazy, Suspense, useState, type ComponentType } from 'react'
import { useAuth } from './auth/useAuth'
import { useLock } from './lock/useLock'
import { isSupabaseConfigured } from './lib/supabase'
import { LoginScreen } from './screens/LoginScreen'
import { LockScreen } from './screens/LockScreen'
import { ConfigScreen } from './screens/ConfigScreen'
import { AppShell, type View } from './components/AppShell'
import { ErrorBoundary } from './components/ErrorBoundary'

const RELOAD_KEY = 'chunk-reload'

/**
 * lazy() resiliente: si un chunk falla al cargar (típico tras un deploy nuevo
 * con la pestaña vieja abierta), recarga una vez para tomar la versión nueva.
 */
function lazyConRecarga<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      const mod = await factory()
      sessionStorage.removeItem(RELOAD_KEY)
      return mod
    } catch (e) {
      if (!sessionStorage.getItem(RELOAD_KEY)) {
        sessionStorage.setItem(RELOAD_KEY, '1')
        window.location.reload()
        return new Promise<{ default: T }>(() => {}) // queda suspendido hasta recargar
      }
      throw e
    }
  })
}

// Cada módulo se carga al abrir su pestaña (split de dnd-kit, recharts, etc.).
const CalendarioModule = lazyConRecarga(() =>
  import('./calendario/CalendarioModule').then((m) => ({ default: m.CalendarioModule })),
)
const Top12Module = lazyConRecarga(() =>
  import('./tareas/Top12Module').then((m) => ({ default: m.Top12Module })),
)
const IniciativasModule = lazyConRecarga(() =>
  import('./iniciativas/IniciativasModule').then((m) => ({ default: m.IniciativasModule })),
)
const AreasModule = lazyConRecarga(() =>
  import('./areas/AreasModule').then((m) => ({ default: m.AreasModule })),
)
const RevisionModule = lazyConRecarga(() =>
  import('./revision/RevisionModule').then((m) => ({ default: m.RevisionModule })),
)
const DashboardModule = lazyConRecarga(() =>
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
      <ErrorBoundary>
        <Suspense fallback={<p className="mono-tag" style={{ padding: '1rem 0' }}>Cargando…</p>}>
          {view === 'calendario' && <CalendarioModule />}
          {view === 'top12' && <Top12Module />}
          {view === 'iniciativas' && <IniciativasModule />}
          {view === 'areas' && <AreasModule />}
          {view === 'revision' && <RevisionModule />}
          {view === 'panel' && <DashboardModule />}
        </Suspense>
      </ErrorBoundary>
    </AppShell>
  )
}

export default App
