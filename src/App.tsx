import { CheckSquare, Square, Stamp } from 'lucide-react'

/**
 * Shell de arranque (Fase 1 — paso 1).
 * Placeholder on-brand para verificar el sistema de diseño y la PWA.
 * El auth con magic link + app-lock con PIN llegan en el próximo paso.
 */

type Hito = { texto: string; hecho: boolean }

const HITOS: Hito[] = [
  { texto: 'Proyecto Vite + React + TypeScript', hecho: true },
  { texto: 'PWA instalable (manifest + service worker)', hecho: true },
  { texto: 'Sistema de diseño: papel, tinta, sello, RAG', hecho: true },
  { texto: 'Cliente de Supabase + variables de entorno', hecho: true },
  { texto: 'Esquema SQL con RLS (a revisar antes de aplicar)', hecho: true },
  { texto: 'Auth magic link + app-lock con PIN', hecho: false },
  { texto: 'Áreas, Top 12, Top Goal, revisión semanal', hecho: false },
]

function App() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '1.5rem',
      }}
    >
      <section
        className="card"
        style={{ maxWidth: 560, width: '100%', padding: '1.75rem' }}
      >
        <p className="mono-tag" style={{ color: 'var(--sello)' }}>
          Memo interno · Fase 1
        </p>

        <h1 style={{ fontSize: 'clamp(2.4rem, 8vw, 3.5rem)', margin: '0.4rem 0 0.2rem' }}>
          El Becario
        </h1>
        <p style={{ fontSize: '1.05rem', maxWidth: '40ch' }}>
          El pasante no remunerado que te ordena la vida. Todavía me estoy
          poniendo el saco — el escritorio ya está armado.
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
            <Stamp
              size={16}
              style={{ verticalAlign: '-2px', marginRight: 4 }}
              aria-hidden
            />
            En obra
          </span>
          <span className="rag rag--ambar">RAG: ámbar</span>
        </div>
      </section>
    </main>
  )
}

export default App
