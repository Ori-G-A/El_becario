import { Pencil, Trash2, ShieldAlert, CheckCircle2, Circle, Pin, Ban } from 'lucide-react'
import type { Area } from '../types/database'
import type { TareaConAreas } from '../data/tareas'
import { AreaIcon } from '../components/AreaIcon'

/** Fila compacta de tarea para la matriz de Eisenhower. */
export function TareaMini({
  tarea,
  areasById,
  enTop12,
  rango,
  busy,
  onToggleHecha,
  onEdit,
  onDelete,
  onSetOverride,
}: {
  tarea: TareaConAreas
  areasById: Map<string, Area>
  enTop12: boolean
  rango?: number
  busy: boolean
  onToggleHecha: () => void
  onEdit: () => void
  onDelete: () => void
  onSetOverride: (override: 'fijar' | 'excluir' | null) => void
}) {
  const hecha = tarea.estado === 'hecha'
  const fijada = tarea.top12_override === 'fijar'
  const excluida = tarea.top12_override === 'excluir'

  const iconBtn = (activo: boolean): React.CSSProperties => ({
    padding: '0.25rem 0.3rem',
    background: activo ? 'var(--sello)' : 'var(--papel)',
    color: activo ? '#fff' : 'var(--tinta)',
  })

  return (
    <li
      className="card"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.45rem',
        padding: '0.45rem 0.55rem',
        minWidth: 0,
        opacity: hecha ? 0.55 : 1,
      }}
    >
      <button
        type="button"
        onClick={onToggleHecha}
        disabled={busy}
        aria-pressed={hecha}
        title={hecha ? 'Marcar como pendiente' : 'Marcar como hecha'}
        style={{
          background: 'transparent',
          border: 'none',
          padding: 2,
          cursor: 'pointer',
          color: hecha ? 'var(--rag-verde)' : 'var(--tinta)',
        }}
      >
        {hecha ? <CheckCircle2 size={18} aria-hidden /> : <Circle size={18} aria-hidden />}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          {enTop12 && (
            <span
              className="mono-tag"
              title="Dentro del Top 12"
              style={{
                background: 'var(--sello)',
                color: '#fff',
                padding: '0 0.3rem',
                borderRadius: 3,
                fontSize: '0.7rem',
              }}
            >
              {rango}
            </span>
          )}
          {tarea.confidencial && <ShieldAlert size={13} aria-label="Confidencial" />}
          <strong
            style={{
              fontSize: '0.92rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textDecoration: hecha ? 'line-through' : 'none',
            }}
          >
            {tarea.titulo}
          </strong>
        </div>
        {tarea.area_ids.length > 0 && (
          <span style={{ display: 'inline-flex', gap: '0.2rem', marginTop: '0.2rem' }}>
            {tarea.area_ids.map((id) => {
              const area = areasById.get(id)
              if (!area) return null
              return (
                <span
                  key={id}
                  title={area.nombre}
                  style={{
                    display: 'inline-grid',
                    placeItems: 'center',
                    width: 15,
                    height: 15,
                    background: area.color,
                    border: '1.5px solid var(--tinta)',
                    borderRadius: 3,
                  }}
                >
                  <AreaIcon name={area.icono} size={9} color="#fff" />
                </span>
              )
            })}
          </span>
        )}
      </div>

      <button
        type="button"
        className="btn"
        onClick={() => onSetOverride(fijada ? null : 'fijar')}
        disabled={busy || excluida}
        aria-pressed={fijada}
        title={fijada ? 'Soltar del Top 12' : 'Fijar siempre en el Top 12'}
        style={iconBtn(fijada)}
      >
        <Pin size={14} aria-hidden />
      </button>
      <button
        type="button"
        className="btn"
        onClick={() => onSetOverride(excluida ? null : 'excluir')}
        disabled={busy || fijada}
        aria-pressed={excluida}
        title={excluida ? 'Volver a considerar para el Top 12' : 'Nunca en el Top 12'}
        style={iconBtn(excluida)}
      >
        <Ban size={14} aria-hidden />
      </button>
      <button
        type="button"
        className="btn"
        onClick={onEdit}
        title="Editar"
        style={{ padding: '0.25rem 0.3rem', background: 'var(--papel)', color: 'var(--tinta)' }}
      >
        <Pencil size={14} aria-hidden />
      </button>
      <button
        type="button"
        className="btn"
        onClick={onDelete}
        disabled={busy}
        title="Borrar"
        style={{ padding: '0.25rem 0.3rem', background: 'var(--papel)', color: 'var(--tinta)' }}
      >
        <Trash2 size={14} aria-hidden />
      </button>
    </li>
  )
}
