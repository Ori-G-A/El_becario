import { useState, type FormEvent } from 'react'
import { Plus, Check, X } from 'lucide-react'
import type { Iniciativa } from '../types/database'
import { inputStyle } from '../components/styles'

/** Alta rápida de trabajo reactivo: solo título y, si quieres, la iniciativa. */
export function PendienteRapidoForm({
  iniciativas,
  busy,
  onCrear,
}: {
  iniciativas: Iniciativa[]
  busy: boolean
  onCrear: (titulo: string, iniciativaId: string | null) => Promise<void>
}) {
  const [abierto, setAbierto] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [iniciativaId, setIniciativaId] = useState('')

  function cerrar() {
    setAbierto(false)
    setTitulo('')
    setIniciativaId('')
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const limpio = titulo.trim()
    if (!limpio) return
    await onCrear(limpio, iniciativaId || null)
    cerrar()
  }

  if (!abierto) {
    return (
      <button
        type="button"
        className="btn"
        onClick={() => setAbierto(true)}
        style={{ marginBottom: '0.6rem' }}
      >
        <Plus size={16} aria-hidden />
        Pendiente rápido
      </button>
    )
  }

  return (
    <form
      onSubmit={submit}
      className="card"
      style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', padding: '0.6rem', marginBottom: '0.6rem' }}
    >
      <input
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="¿Qué surgió?"
        maxLength={200}
        autoFocus
        style={{ ...inputStyle, flex: '2 1 180px' }}
      />
      <select
        value={iniciativaId}
        onChange={(e) => setIniciativaId(e.target.value)}
        style={{ ...inputStyle, flex: '1 1 140px' }}
      >
        <option value="">Sin iniciativa</option>
        {iniciativas.map((ini) => (
          <option key={ini.id} value={ini.id}>
            {ini.nombre}
          </option>
        ))}
      </select>
      <button type="submit" className="btn" disabled={busy}>
        <Check size={16} aria-hidden />
      </button>
      <button
        type="button"
        className="btn"
        onClick={cerrar}
        disabled={busy}
        style={{ background: 'var(--papel)', color: 'var(--tinta)' }}
      >
        <X size={16} aria-hidden />
      </button>
    </form>
  )
}
