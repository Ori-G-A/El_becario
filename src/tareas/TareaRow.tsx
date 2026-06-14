import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Pencil, Trash2, Target, ShieldAlert } from 'lucide-react'
import type { Area } from '../types/database'
import type { TareaConAreas } from '../data/tareas'
import { AreaIcon } from '../components/AreaIcon'

export function TareaRow({
  tarea,
  posicion,
  areasById,
  isTopGoal,
  busy,
  onEdit,
  onDelete,
  onToggleTopGoal,
}: {
  tarea: TareaConAreas
  posicion: number
  areasById: Map<string, Area>
  isTopGoal: boolean
  busy: boolean
  onEdit: () => void
  onDelete: () => void
  onToggleTopGoal: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: tarea.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    padding: '0.6rem 0.7rem',
    opacity: isDragging ? 0.6 : 1,
    position: 'relative',
    zIndex: isDragging ? 5 : 'auto',
  }

  const iconBtn: React.CSSProperties = {
    padding: '0.3rem 0.4rem',
    background: 'var(--papel)',
    color: 'var(--tinta)',
  }

  return (
    <li ref={setNodeRef} style={style} className="card">
      <button
        type="button"
        aria-label="Reordenar"
        {...attributes}
        {...listeners}
        style={{
          cursor: 'grab',
          background: 'transparent',
          border: 'none',
          padding: 2,
          color: 'var(--tinta)',
          touchAction: 'none',
        }}
      >
        <GripVertical size={18} aria-hidden />
      </button>

      <span
        className="mono-tag"
        aria-hidden
        style={{ width: '1.4rem', textAlign: 'right', opacity: 0.6 }}
      >
        {posicion}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {isTopGoal && <span className="rag" style={{ background: 'var(--rag-ambar)' }}>Top Goal</span>}
          {tarea.confidencial && <ShieldAlert size={14} aria-label="Confidencial" />}
          <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {tarea.titulo}
          </strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
          <span className="mono-tag" style={{ opacity: 0.7 }}>
            {tarea.responsable}
          </span>
          <span style={{ display: 'inline-flex', gap: '0.25rem' }}>
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
                    width: 18,
                    height: 18,
                    background: area.color,
                    border: '1.5px solid var(--tinta)',
                    borderRadius: 3,
                  }}
                >
                  <AreaIcon name={area.icono} size={11} color="#fff" />
                </span>
              )
            })}
          </span>
        </div>
      </div>

      <button
        type="button"
        className="btn"
        onClick={onToggleTopGoal}
        disabled={busy}
        aria-pressed={isTopGoal}
        title={isTopGoal ? 'Quitar de Top Goal' : 'Marcar como Top Goal de hoy'}
        style={{
          padding: '0.3rem 0.4rem',
          background: isTopGoal ? 'var(--sello)' : 'var(--papel)',
          color: isTopGoal ? '#fff' : 'var(--tinta)',
        }}
      >
        <Target size={15} aria-hidden />
      </button>
      <button type="button" className="btn" onClick={onEdit} title="Editar" style={iconBtn}>
        <Pencil size={15} aria-hidden />
      </button>
      <button
        type="button"
        className="btn"
        onClick={onDelete}
        disabled={busy}
        title="Borrar"
        style={iconBtn}
      >
        <Trash2 size={15} aria-hidden />
      </button>
    </li>
  )
}
