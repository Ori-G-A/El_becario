import type { EstadoRag } from '../types/database'

const OPCIONES: { valor: EstadoRag; label: string; varName: string }[] = [
  { valor: 'rojo', label: 'R', varName: '--rag-rojo' },
  { valor: 'ambar', label: 'A', varName: '--rag-ambar' },
  { valor: 'verde', label: 'V', varName: '--rag-verde' },
]

/** Semáforo RAG como tres marcadores; el activo queda sellado. */
export function RagSelector({
  value,
  onChange,
  disabled,
}: {
  value: EstadoRag | null
  onChange: (valor: EstadoRag) => void
  disabled?: boolean
}) {
  return (
    <div role="radiogroup" aria-label="Estado RAG" style={{ display: 'inline-flex', gap: '0.3rem' }}>
      {OPCIONES.map((op) => {
        const activo = value === op.valor
        return (
          <button
            key={op.valor}
            type="button"
            role="radio"
            aria-checked={activo}
            aria-label={op.valor}
            disabled={disabled}
            onClick={() => onChange(op.valor)}
            style={{
              width: 30,
              height: 30,
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              background: `var(${op.varName})`,
              color: 'var(--tinta)',
              border: activo ? '3px solid var(--tinta)' : '2px solid var(--tinta)',
              borderRadius: 'var(--radio)',
              boxShadow: activo ? 'var(--sombra-dura-sm)' : 'none',
              opacity: activo ? 1 : 0.45,
              cursor: disabled ? 'default' : 'pointer',
            }}
          >
            {op.label}
          </button>
        )
      })}
    </div>
  )
}
