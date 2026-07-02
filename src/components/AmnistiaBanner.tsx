import { useEffect, useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import { registrarVisita, AUSENCIA_MIN_DIAS } from '../lib/amnistia'
import { todayISO, addDays, diaBounds } from '../lib/date'
import { despejarChecklistVencido } from '../data/tareas'
import { borrarBloquesNoOcurridos } from '../data/bloques'

/**
 * Bienvenida sin culpa tras una ausencia: ofrece archivar los pendientes
 * vencidos y descartar los bloques que quedaron en el papel, para arrancar
 * con el hoy limpio. Solo toca el pasado; el día de hoy no cambia.
 */
export function AmnistiaBanner() {
  const [estado, setEstado] = useState<'oculto' | 'oferta' | 'limpiando' | 'listo'>('oculto')
  const [ausencia, setAusencia] = useState<{ dias: number; desde: string } | null>(null)

  useEffect(() => {
    const { dias, ultimaISO } = registrarVisita()
    if (dias >= AUSENCIA_MIN_DIAS && ultimaISO) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAusencia({ dias, desde: ultimaISO })
      setEstado('oferta')
    }
  }, [])

  async function limpiar() {
    if (!ausencia) return
    setEstado('limpiando')
    try {
      await Promise.all([
        despejarChecklistVencido(),
        // Desde el día siguiente a la última visita hasta ayer inclusive.
        borrarBloquesNoOcurridos(
          diaBounds(addDays(ausencia.desde, 1)).desde,
          diaBounds(todayISO()).desde,
        ),
      ])
      setEstado('listo')
    } catch {
      // Si falla, mejor no insistir: la oferta reaparecerá en la próxima ausencia.
      setEstado('oculto')
    }
  }

  if (estado === 'oculto' || !ausencia) return null

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.6rem',
        padding: '0.7rem 0.9rem',
        marginBottom: '0.6rem',
        borderLeft: '6px solid var(--sello)',
      }}
    >
      <Sparkles size={18} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
      {estado === 'listo' ? (
        <div style={{ flex: 1 }}>
          <strong>Hecho.</strong> Hoy arranca limpio; lo demás nunca pasó.
        </div>
      ) : (
        <div style={{ flex: 1 }}>
          <strong>¡Volviste! Qué gusto.</strong> Estuviste fuera {ausencia.dias} días. ¿Hago
          borrón y cuenta nueva? Archivo los pendientes vencidos y descarto los bloques que
          quedaron en el papel.
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn" onClick={limpiar} disabled={estado === 'limpiando'}>
              {estado === 'limpiando' ? 'Limpiando…' : 'Borrón y cuenta nueva'}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setEstado('oculto')}
              disabled={estado === 'limpiando'}
              style={{ background: 'var(--papel)', color: 'var(--tinta)' }}
            >
              Déjalo como está
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setEstado('oculto')}
        aria-label="Descartar"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tinta)', padding: 2 }}
      >
        <X size={16} aria-hidden />
      </button>
    </div>
  )
}
