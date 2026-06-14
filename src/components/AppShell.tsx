import { useState, type ReactNode } from 'react'
import {
  Lock,
  LogOut,
  ListChecks,
  Tags,
  FolderKanban,
  CalendarCheck,
  CalendarDays,
  Download,
} from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { useLock } from '../lock/useLock'
import { exportarBackup } from '../data/backup'
import { AlertasBanner } from './AlertasBanner'

export type View = 'calendario' | 'top12' | 'iniciativas' | 'areas' | 'revision'

const TABS: { id: View; label: string; icon: typeof ListChecks }[] = [
  { id: 'calendario', label: 'Día', icon: CalendarDays },
  { id: 'top12', label: 'Top 12', icon: ListChecks },
  { id: 'iniciativas', label: 'Iniciativas', icon: FolderKanban },
  { id: 'areas', label: 'Áreas', icon: Tags },
  { id: 'revision', label: 'Revisión', icon: CalendarCheck },
]

/** Marco principal de la app: barra superior + navegación + contenido. */
export function AppShell({
  view,
  onNavigate,
  children,
}: {
  view: View
  onNavigate: (view: View) => void
  children: ReactNode
}) {
  const { signOut } = useAuth()
  const { lock } = useLock()
  const [exportando, setExportando] = useState(false)

  async function respaldar() {
    setExportando(true)
    try {
      await exportarBackup()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'No pude generar el respaldo.')
    } finally {
      setExportando(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          padding: '0.75rem 1rem',
          borderBottom: 'var(--borde)',
          background: 'var(--papel)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span
            aria-hidden
            style={{
              display: 'grid',
              placeItems: 'center',
              width: 34,
              height: 34,
              border: '2.5px solid var(--sello)',
              borderRadius: 6,
              transform: 'rotate(-8deg)',
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              color: 'var(--sello)',
            }}
          >
            B
          </span>
          <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem' }}>
            El Becario
          </strong>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn"
            onClick={respaldar}
            disabled={exportando}
            title="Descargar respaldo (JSON)"
            style={{ padding: '0.4rem 0.55rem' }}
          >
            <Download size={16} aria-hidden />
          </button>
          <button
            type="button"
            className="btn"
            onClick={lock}
            title="Bloquear"
            style={{ padding: '0.4rem 0.55rem' }}
          >
            <Lock size={16} aria-hidden />
          </button>
          <button
            type="button"
            className="btn"
            onClick={signOut}
            title="Cerrar sesión"
            style={{ padding: '0.4rem 0.55rem' }}
          >
            <LogOut size={16} aria-hidden />
          </button>
        </div>
      </header>

      <nav
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          padding: '0.6rem 1rem',
          maxWidth: 760,
          margin: '0 auto',
        }}
      >
        {TABS.map((tab) => {
          const active = view === tab.id
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onNavigate(tab.id)}
              aria-current={active ? 'page' : undefined}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.9rem',
                fontWeight: 600,
                border: 'var(--borde)',
                borderRadius: 'var(--radio)',
                background: active ? 'var(--tinta)' : 'var(--papel)',
                color: active ? 'var(--papel)' : 'var(--tinta)',
                boxShadow: active ? 'var(--sombra-dura-sm)' : 'none',
                cursor: 'pointer',
              }}
            >
              <Icon size={16} aria-hidden />
              {tab.label}
            </button>
          )
        })}
      </nav>

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '0.5rem 1rem 4rem' }}>
        <AlertasBanner />
        {children}
      </main>
    </div>
  )
}
