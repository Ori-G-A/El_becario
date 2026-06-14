import { useEffect, useState } from 'react'
import { Bell, X, BatteryWarning } from 'lucide-react'
import { type Alertas, cargarAlertas, faltaTexto } from '../lib/alertas'

export function AlertasBanner() {
  const [alertas, setAlertas] = useState<Alertas | null>(null)
  const [descartadas, setDescartadas] = useState<Set<string>>(new Set())

  useEffect(() => {
    let activo = true
    cargarAlertas()
      .then((a) => {
        if (activo) setAlertas(a)
      })
      .catch(() => {
        /* las alertas no deben romper la app; silencioso */
      })
    return () => {
      activo = false
    }
  }, [])

  function descartar(id: string) {
    setDescartadas((prev) => new Set(prev).add(id))
  }

  if (!alertas) return null

  const mostrarBurnout = alertas.burnoutRojos >= 2 && !descartadas.has('burnout')
  const avisos = alertas.avisos.filter((a) => !descartadas.has(a.id))

  if (!mostrarBurnout && avisos.length === 0) return null

  const notaBase: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.6rem',
    padding: '0.7rem 0.9rem',
    border: 'var(--borde)',
    borderRadius: 'var(--radio)',
    boxShadow: 'var(--sombra-dura-sm)',
    marginBottom: '0.6rem',
  }

  return (
    <div style={{ marginBottom: '0.5rem' }}>
      {mostrarBurnout && (
        <div style={{ ...notaBase, background: 'var(--papel)', borderLeft: '6px solid var(--rag-rojo)' }}>
          <BatteryWarning size={18} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <strong>{alertas.burnoutRojos} métricas en rojo esta semana.</strong>{' '}
            No te pago tan bien como para que te enfermes. Cierra la laptop y descansa.
          </div>
          <button
            type="button"
            onClick={() => descartar('burnout')}
            aria-label="Descartar"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tinta)', padding: 2 }}
          >
            <X size={16} aria-hidden />
          </button>
        </div>
      )}

      {avisos.map((a) => (
        <div key={a.id} style={{ ...notaBase, background: 'var(--papel)' }}>
          <Bell size={18} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            Ojo: <strong>{a.titulo}</strong> {faltaTexto(a.minutosFalta)}. No me hagas
            quedar mal.
          </div>
          <button
            type="button"
            onClick={() => descartar(a.id)}
            aria-label="Descartar"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tinta)', padding: 2 }}
          >
            <X size={16} aria-hidden />
          </button>
        </div>
      ))}
    </div>
  )
}
