import { CheckSquare, Square, Stamp, Lock, LogOut } from 'lucide-react'
import { useAuth } from './auth/useAuth'
import { useLock } from './lock/useLock'
import { isSupabaseConfigured } from './lib/supabase'
import { LoginScreen } from './screens/LoginScreen'
import { LockScreen } from './screens/LockScreen'
import { ConfigScreen } from './screens/ConfigScreen'

type Hito = { texto: string; hecho: boolean }

const HITOS: Hito[] = [
  { texto: 'Proyecto Vite + React + TypeScript', hecho: true },
  { texto: 'PWA instalable (manifest + service worker)', hecho: true },
  { texto: 'Sistema de diseño: papel, tinta, sello, RAG', hecho: true },
  { texto: 'Esquema SQL con RLS', hecho: true },
  { texto: 'Auth magic link + app-lock con PIN', hecho: true },
  { texto: 'Áreas, Top 12, Top Goal, revisión semanal', hecho: false },
  { texto: 'Export / backup JSON', hecho: false },
]

function LoadingScreen() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <p className="mono-tag">Abriendo el escritorio…</p>
    </main>
  )
}

function Home() {
  const { user, signOut } = useAuth()
  const { lock } = useLock()

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '1.5rem' }}>
      <section className="card" style={{ maxWidth: 560, width: '100%', padding: '1.75rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '1rem',
            marginBottom: '0.5rem',
          }}
        >
          <p className="mono-tag" style={{ color: 'var(--sello)' }}>
            Memo interno · Fase 1
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn"
              onClick={lock}
              title="Bloquear"
              style={{ padding: '0.4rem 0.6rem' }}
            >
              <Lock size={16} aria-hidden />
            </button>
            <button
              type="button"
              className="btn"
              onClick={signOut}
              title="Cerrar sesión"
              style={{ padding: '0.4rem 0.6rem' }}
            >
              <LogOut size={16} aria-hidden />
            </button>
          </div>
        </div>

        <h1 style={{ fontSize: 'clamp(2.4rem, 8vw, 3.5rem)', margin: '0.2rem 0' }}>El Becario</h1>
        <p style={{ fontSize: '1.05rem', maxWidth: '40ch' }}>
          Adentro, {user?.email ?? 'jefe'}. El escritorio ya abre con llave; ahora
          falta llenarlo de trabajo.
        </p>

        <ul style={{ listStyle: 'none', padding: 0, margin: '1.5rem 0 0' }}>
          {HITOS.map((h) => (
            <li
              key={h.texto}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.35rem 0',
                opacity: h.hecho ? 1 : 0.55,
              }}
            >
              {h.hecho ? (
                <CheckSquare size={20} color="var(--sello)" aria-hidden />
              ) : (
                <Square size={20} aria-hidden />
              )}
              <span>{h.texto}</span>
            </li>
          ))}
        </ul>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginTop: '1.75rem',
            flexWrap: 'wrap',
          }}
        >
          <span className="sello-goma">
            <Stamp size={16} style={{ verticalAlign: '-2px', marginRight: 4 }} aria-hidden />
            En obra
          </span>
          <span className="rag rag--ambar">RAG: ámbar</span>
        </div>
      </section>
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
  return <Home />
}

export default App
