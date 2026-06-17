import type { Area } from '../types/database'
import type { TareaConAreas } from '../data/tareas'
import { CUADRANTES, type Cuadrante } from '../lib/eisenhower'
import { TareaMini } from './TareaMini'

/** Las cuatro celdas de la matriz, cada una con sus tareas pendientes. */
export function MatrizEisenhower({
  porCuadrante,
  areasById,
  seleccion,
  rangoPorId,
  busy,
  onToggleHecha,
  onEdit,
  onDelete,
  onSetOverride,
}: {
  porCuadrante: Record<Cuadrante, TareaConAreas[]>
  areasById: Map<string, Area>
  seleccion: Set<string>
  rangoPorId: Map<string, number>
  busy: boolean
  onToggleHecha: (t: TareaConAreas) => void
  onEdit: (t: TareaConAreas) => void
  onDelete: (t: TareaConAreas) => void
  onSetOverride: (t: TareaConAreas, override: 'fijar' | 'excluir' | null) => void
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '0.8rem',
      }}
    >
      {CUADRANTES.map((meta) => {
        const tareas = porCuadrante[meta.id]
        return (
          <section
            key={meta.id}
            className="card"
            style={{ padding: '0.8rem', borderTop: `5px solid ${meta.color}`, minWidth: 0 }}
          >
            <header style={{ marginBottom: '0.6rem' }}>
              <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem' }}>
                {meta.titulo}{' '}
                <span className="mono-tag" style={{ opacity: 0.6 }}>
                  {tareas.length}
                </span>
              </strong>
              <p className="mono-tag" style={{ opacity: 0.7, marginTop: '0.1rem' }}>
                {meta.pista}
              </p>
            </header>
            {tareas.length === 0 ? (
              <p style={{ opacity: 0.5, fontSize: '0.85rem' }}>Vacío, por ahora.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.4rem' }}>
                {tareas.map((t) => (
                  <TareaMini
                    key={t.id}
                    tarea={t}
                    areasById={areasById}
                    enTop12={seleccion.has(t.id)}
                    rango={rangoPorId.get(t.id)}
                    busy={busy}
                    onToggleHecha={() => onToggleHecha(t)}
                    onEdit={() => onEdit(t)}
                    onDelete={() => onDelete(t)}
                    onSetOverride={(o) => onSetOverride(t, o)}
                  />
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
