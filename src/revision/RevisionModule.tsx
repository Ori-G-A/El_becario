import { useEffect, useState } from 'react'
import { Check, History } from 'lucide-react'
import type { EstadoRag, RevisionSemanal } from '../types/database'
import { mondayISO, formatFechaLarga } from '../lib/date'
import { listRevisiones, getRevision, upsertRevision } from '../data/revisiones'
import { RagSelector } from '../components/RagSelector'
import { inputStyle } from '../components/styles'

const RAG_LABEL: Record<EstadoRag, string> = {
  rojo: 'Rojo',
  ambar: 'Ámbar',
  verde: 'Verde',
}
const RAG_VAR: Record<EstadoRag, string> = {
  rojo: '--rag-rojo',
  ambar: '--rag-ambar',
  verde: '--rag-verde',
}

export function RevisionModule() {
  const semana = mondayISO()
  const [rag, setRag] = useState<EstadoRag | null>(null)
  const [notas, setNotas] = useState('')
  const [historial, setHistorial] = useState<RevisionSemanal[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guardado, setGuardado] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [actual, todas] = await Promise.all([getRevision(semana), listRevisiones()])
      setRag(actual?.rag_global ?? null)
      setNotas(actual?.notas ?? '')
      setHistorial(todas)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude cargar la revisión.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function guardar() {
    setBusy(true)
    setError(null)
    setGuardado(false)
    try {
      await upsertRevision(semana, rag, notas.trim() || null)
      setGuardado(true)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude guardar la revisión.')
    } finally {
      setBusy(false)
    }
  }

  const pasadas = historial.filter((r) => r.semana !== semana)

  return (
    <section>
      <h1 style={{ fontSize: 'clamp(1.8rem, 6vw, 2.6rem)', marginBottom: '0.3rem' }}>
        Revisión
      </h1>
      <p className="mono-tag" style={{ opacity: 0.7, marginBottom: '1.25rem' }}>
        Semana del {formatFechaLarga(semana)}
      </p>

      {error && (
        <p
          className="card"
          style={{ padding: '0.75rem 1rem', color: 'var(--rag-rojo)', fontWeight: 600, marginBottom: '1rem' }}
        >
          {error}
        </p>
      )}

      {loading ? (
        <p className="mono-tag">Juntando la semana…</p>
      ) : (
        <>
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
            <p style={{ marginBottom: '1rem', opacity: 0.85 }}>
              ¿Cómo te fue? El semáforo es a criterio tuyo; el automático llega en la
              próxima fase.
            </p>

            <p className="mono-tag" style={{ marginBottom: '0.45rem' }}>RAG global</p>
            <div style={{ marginBottom: '1.1rem' }}>
              <RagSelector value={rag} onChange={setRag} />
            </div>

            <label className="mono-tag" htmlFor="notas" style={{ display: 'block', marginBottom: '0.4rem' }}>
              Notas de la semana
            </label>
            <textarea
              id="notas"
              value={notas}
              onChange={(e) => {
                setNotas(e.target.value)
                setGuardado(false)
              }}
              placeholder="Qué salió, qué no, qué cambias la próxima…"
              rows={5}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--font-body)', marginBottom: '1rem' }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
              <button type="button" className="btn" onClick={guardar} disabled={busy}>
                <Check size={16} aria-hidden />
                Guardar revisión
              </button>
              {guardado && (
                <span className="mono-tag" style={{ color: 'var(--rag-verde)', fontWeight: 600 }}>
                  Guardado ✓
                </span>
              )}
            </div>
          </div>

          {pasadas.length > 0 && (
            <>
              <p
                className="mono-tag"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.7rem', opacity: 0.7 }}
              >
                <History size={14} aria-hidden />
                Semanas anteriores
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.6rem' }}>
                {pasadas.map((r) => (
                  <li key={r.id} className="card" style={{ padding: '0.7rem 0.9rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      {r.rag_global && (
                        <span
                          className="rag"
                          style={{ background: `var(${RAG_VAR[r.rag_global]})` }}
                        >
                          {RAG_LABEL[r.rag_global]}
                        </span>
                      )}
                      <strong>{formatFechaLarga(r.semana)}</strong>
                    </div>
                    {r.notas && (
                      <p style={{ opacity: 0.8, margin: '0.4rem 0 0', whiteSpace: 'pre-wrap' }}>
                        {r.notas}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </section>
  )
}
