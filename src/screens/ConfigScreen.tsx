import { AuthShell } from '../components/AuthShell'

/** Se muestra cuando faltan las env vars de Supabase. */
export function ConfigScreen() {
  return (
    <AuthShell
      badge="Configuración pendiente"
      title="Me falta el archivero"
      subtitle="No encuentro las llaves de Supabase. Sin eso no puedo guardar nada."
    >
      <ol style={{ paddingLeft: '1.1rem', margin: 0, lineHeight: 1.6 }}>
        <li>
          Creá un proyecto en{' '}
          <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">
            supabase.com
          </a>
          .
        </li>
        <li>
          Copiá <code className="mono-tag">.env.example</code> a{' '}
          <code className="mono-tag">.env.local</code>.
        </li>
        <li>
          Completá <code className="mono-tag">VITE_SUPABASE_URL</code> y{' '}
          <code className="mono-tag">VITE_SUPABASE_ANON_KEY</code> (Settings → API).
        </li>
        <li>Reiniciá el servidor de desarrollo.</li>
      </ol>
    </AuthShell>
  )
}
