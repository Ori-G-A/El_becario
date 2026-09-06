import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import {
  Lock,
  LogOut,
  ListChecks,
  Tags,
  FolderKanban,
  CalendarCheck,
  CalendarDays,
  LayoutDashboard,
  Download,
  Upload,
  X,
  Sun,
  Moon,
} from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { temaActual, ponerTema, type Tema } from '../lib/tema'
import { useLock } from '../lock/useLock'
import { exportarBackup, restaurarBackupDesdeTexto } from '../data/backup'
import { AlertasBanner } from './AlertasBanner'
import { AmnistiaBanner } from './AmnistiaBanner'
import { NotificacionesToggle } from './NotificacionesToggle'
import { desactivarPush } from '../lib/push'
import { useKonami, useLongPress } from '../easter/hooks'
import { getCafes } from '../easter/cafe'
import { CurriculumModal } from '../easter/CurriculumModal'
import { RenunciaOverlay } from '../easter/RenunciaOverlay'
import { CoffeeRing } from '../easter/CoffeeRing'

export type View = 'calendario' | 'top12' | 'iniciativas' | 'areas' | 'revision' | 'panel'

const TABS: { id: View; label: string; icon: typeof ListChecks }[] = [
  { id: 'calendario', label: 'Día', icon: CalendarDays },
  { id: 'top12', label: 'Top 12', icon: ListChecks },
  { id: 'iniciativas', label: 'Iniciativas', icon: FolderKanban },
  { id: 'areas', label: 'Áreas', icon: Tags },
  { id: 'revision', label: 'Revisión', icon: CalendarCheck },
  { id: 'panel', label: 'Panel', icon: LayoutDashboard },
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
  const [restaurando, setRestaurando] = useState(false)
  const [saliendo, setSaliendo] = useState(false)
  const [tema, setTema] = useState<Tema>(temaActual)
  const restoreInputRef = useRef<HTMLInputElement | null>(null)

  // Easter eggs
  const [cvAbierto, setCvAbierto] = useState(false)
  const [renuncia, setRenuncia] = useState(false)
  const [cafes, setCafes] = useState(0)
  const [horaRara, setHoraRara] = useState(false)
  const logoLongPress = useLongPress(() => setCvAbierto(true))

  function alternarTema() {
    const siguiente: Tema = tema === 'oscuro' ? 'claro' : 'oscuro'
    ponerTema(siguiente)
    setTema(siguiente)
  }

  useKonami(() => setRenuncia(true))

  useEffect(() => {
    getCafes().then(setCafes)
    const h = new Date().getHours()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (h < 6) setHoraRara(true)
  }, [])

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

  async function restaurar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const ok = window.confirm(
      'Voy a restaurar este backup sobre la cuenta activa. No borro datos actuales, pero puedo actualizar filas que tengan el mismo id. ¿Seguimos?',
    )
    if (!ok) return

    setRestaurando(true)
    try {
      const result = await restaurarBackupDesdeTexto(await file.text())
      const total = Object.values(result.restored).reduce((acc, n) => acc + n, 0)
      window.alert(`Restauracion lista. Filas procesadas: ${total}. Recarga la app si no ves los cambios.`)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No pude restaurar el respaldo.')
    } finally {
      setRestaurando(false)
    }
  }

  async function cerrarSesion() {
    setSaliendo(true)
    lock()

    try {
      await desactivarPush()
    } catch (e) {
      // El cierre debe continuar, pero dejamos una señal diagnóstica.
      console.warn('No se pudo retirar por completo la suscripción push.', e)
    }

    try {
      await signOut()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'No pude cerrar la sesión.')
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
          borderBottom: '1px solid var(--borde)',
          background: 'var(--papel)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span
            {...logoLongPress}
            title="¿Mantén apretado…?"
            style={{
              display: 'grid',
              placeItems: 'center',
              width: 30,
              height: 30,
              borderRadius: 9,
              background: 'var(--sello)',
              fontWeight: 700,
              color: 'var(--sello-ink)',
              cursor: 'pointer',
              userSelect: 'none',
              touchAction: 'none',
            }}
          >
            B
          </span>
          <strong style={{ fontSize: '1.08rem', letterSpacing: '-0.015em' }}>El Becario</strong>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button
            type="button"
            className="btn btn--icono"
            onClick={alternarTema}
            title="Claro / oscuro"
            aria-label="Cambiar tema"
            style={{ fontSize: '0.78rem', fontWeight: 600 }}
          >
            {tema === 'oscuro' ? <Sun size={15} aria-hidden /> : <Moon size={15} aria-hidden />}
            {tema === 'oscuro' ? 'Claro' : 'Oscuro'}
          </button>
          <NotificacionesToggle />
          <button
            type="button"
            className="btn btn--icono"
            onClick={respaldar}
            disabled={exportando}
            title="Descargar respaldo (JSON)"
          >
            <Download size={16} aria-hidden />
          </button>
          <button
            type="button"
            className="btn btn--icono"
            onClick={() => restoreInputRef.current?.click()}
            disabled={restaurando}
            title="Restaurar respaldo (JSON)"
          >
            <Upload size={16} aria-hidden />
          </button>
          <input
            ref={restoreInputRef}
            type="file"
            accept="application/json,.json"
            onChange={restaurar}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            className="btn btn--icono"
            onClick={lock}
            title="Bloquear"
          >
            <Lock size={16} aria-hidden />
          </button>
          <button
            type="button"
            className="btn"
            onClick={cerrarSesion}
            disabled={saliendo}
            title="Cerrar sesión"
            style={{ padding: '0.42rem 0.5rem', borderRadius: 9 }}
          >
            <LogOut size={16} aria-hidden />
          </button>
        </div>
      </header>

      <nav
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.4rem',
          padding: '0.7rem 1rem 0.2rem',
          maxWidth: 820,
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
                padding: '0.42rem 0.85rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                border: 'none',
                borderRadius: 999,
                background: active ? 'var(--tinta)' : 'var(--hueco)',
                color: active ? 'var(--papel)' : 'var(--tinta)',
                cursor: 'pointer',
              }}
            >
              <Icon size={14} aria-hidden />
              {tab.label}
            </button>
          )
        })}
      </nav>

      <main
        style={{
          maxWidth: 820,
          margin: '0 auto',
          padding: '0.6rem 1rem 4rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.9rem',
        }}
      >
        {horaRara && (
          <div
            className="card"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.7rem 0.9rem',
            }}
          >
            <span style={{ flex: 1 }}>
              ¿Otra vez aquí a esta hora? Yo también debería estar durmiendo.
            </span>
            <button
              type="button"
              onClick={() => setHoraRara(false)}
              aria-label="Descartar"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tinta)' }}
            >
              <X size={16} aria-hidden />
            </button>
          </div>
        )}
        <AmnistiaBanner />
        <AlertasBanner />
        {children}
      </main>

      <CoffeeRing />
      {cvAbierto && <CurriculumModal cafes={cafes} onClose={() => setCvAbierto(false)} />}
      {renuncia && <RenunciaOverlay onDone={() => setRenuncia(false)} />}
    </div>
  )
}
