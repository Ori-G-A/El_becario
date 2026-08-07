import { useState, type FormEvent } from 'react'
import { Check, X, Users, User } from 'lucide-react'
import type { Area, CategoriaIniciativa, EstadoRag, Iniciativa } from '../types/database'
import type { IniciativaInput } from '../data/iniciativas'
import { RagSelector } from '../components/RagSelector'
import { inputStyle } from '../components/styles'
import { CATEGORIA_INICIATIVA, CATEGORIAS_INICIATIVA } from '../lib/categorias'

export function IniciativaForm({
  initial,
  areas,
  busy,
  onSave,
  onCancel,
}: {
  initial: Iniciativa | null
  areas: Area[]
  busy: boolean
  onSave: (input: IniciativaInput) => void
  onCancel: () => void
}) {
  const [nombre, setNombre] = useState(initial?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(initial?.descripcion ?? '')
  const [stl, setStl] = useState(initial?.stl_responsable ?? 'yo')
  const [esEquipo, setEsEquipo] = useState(initial?.es_equipo ?? false)
  const [rag, setRag] = useState<EstadoRag>(initial?.estado_rag ?? 'ambar')
  const [categoria, setCategoria] = useState<CategoriaIniciativa | ''>(initial?.categoria ?? '')
  const [areaId, setAreaId] = useState(initial?.area_id ?? '')
  const [error, setError] = useState<string | null>(null)

  function submit(e: FormEvent) {
    e.preventDefault()
    const limpio = nombre.trim()
    if (!limpio) {
      setError('Ponle un nombre a la iniciativa.')
      return
    }
    if (!categoria) {
      setError('Elige una categoría: es la etiqueta que lee amiga y no debería cambiar después.')
      return
    }
    if (!areaId) {
      setError('Elige un área: es lo que hace que amiga sepa de qué parte de tu vida es este tiempo.')
      return
    }
    onSave({
      nombre: limpio,
      descripcion: descripcion.trim() || null,
      stl_responsable: stl.trim() || 'yo',
      es_equipo: esEquipo,
      estado_rag: rag,
      categoria,
      area_id: areaId,
    })
  }

  return (
    <form onSubmit={submit} className="card" style={{ padding: '1.1rem', marginBottom: '1rem' }}>
      <p className="mono-tag" style={{ color: 'var(--sello)', marginBottom: '0.6rem' }}>
        {initial ? 'Editar iniciativa' : 'Nueva iniciativa'}
      </p>

      <label className="mono-tag" htmlFor="ini-nombre" style={{ display: 'block', marginBottom: '0.35rem' }}>
        Nombre
      </label>
      <input
        id="ini-nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Ej: Oulad"
        maxLength={120}
        autoFocus
        style={{ ...inputStyle, marginBottom: '0.9rem' }}
      />

      <label className="mono-tag" htmlFor="ini-desc" style={{ display: 'block', marginBottom: '0.35rem' }}>
        Descripción
      </label>
      <textarea
        id="ini-desc"
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        placeholder="Opcional"
        rows={2}
        style={{ ...inputStyle, marginBottom: '0.9rem', resize: 'vertical', fontFamily: 'var(--font-body)' }}
      />

      <label className="mono-tag" htmlFor="ini-area" style={{ display: 'block', marginBottom: '0.35rem' }}>
        Área de vida
      </label>
      <select
        id="ini-area"
        value={areaId}
        onChange={(e) => setAreaId(e.target.value)}
        style={{ ...inputStyle, marginBottom: '0.35rem' }}
      >
        <option value="">Elegir…</option>
        {areas.map((a) => (
          <option key={a.id} value={a.id}>
            {a.nombre}
          </option>
        ))}
      </select>
      <p style={{ opacity: 0.75, fontSize: '0.85rem', margin: '0 0 0.9rem' }}>
        Baja sola a las tareas y bloques de esta iniciativa. Una tarea puede llevar
        otra área si hace falta, pero esta es la de casa.
      </p>

      <label className="mono-tag" htmlFor="ini-categoria" style={{ display: 'block', marginBottom: '0.35rem' }}>
        Categoría (fija)
      </label>
      <select
        id="ini-categoria"
        value={categoria}
        onChange={(e) => setCategoria(e.target.value as CategoriaIniciativa | '')}
        style={{ ...inputStyle, marginBottom: '0.35rem' }}
      >
        <option value="">Elegir…</option>
        {CATEGORIAS_INICIATIVA.map((c) => (
          <option key={c} value={c}>
            {CATEGORIA_INICIATIVA[c].label}
          </option>
        ))}
      </select>
      <p style={{ opacity: 0.75, fontSize: '0.85rem', margin: '0 0 0.9rem' }}>
        {categoria
          ? CATEGORIA_INICIATIVA[categoria].ayuda
          : 'Define cómo cuenta el tiempo de esta iniciativa. Elígela una vez y no la muevas.'}
      </p>

      <label className="mono-tag" htmlFor="ini-stl" style={{ display: 'block', marginBottom: '0.35rem' }}>
        STL (encargado)
      </label>
      <input
        id="ini-stl"
        value={stl}
        onChange={(e) => setStl(e.target.value)}
        placeholder="yo"
        maxLength={80}
        style={{ ...inputStyle, marginBottom: '0.9rem' }}
      />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <p className="mono-tag" style={{ marginBottom: '0.4rem' }}>Tipo</p>
          <button
            type="button"
            onClick={() => setEsEquipo((v) => !v)}
            className="btn"
            style={{ background: 'var(--papel)', color: 'var(--tinta)' }}
          >
            {esEquipo ? <Users size={16} aria-hidden /> : <User size={16} aria-hidden />}
            {esEquipo ? 'De equipo' : 'Personal'}
          </button>
        </div>
        <div>
          <p className="mono-tag" style={{ marginBottom: '0.4rem' }}>RAG</p>
          <RagSelector value={rag} onChange={setRag} />
        </div>
      </div>

      {error && (
        <p style={{ color: 'var(--rag-rojo)', fontWeight: 600, marginBottom: '0.75rem' }}>{error}</p>
      )}

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="submit" className="btn" disabled={busy}>
          <Check size={16} aria-hidden />
          {initial ? 'Guardar' : 'Crear'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="btn"
          style={{ background: 'var(--papel)', color: 'var(--tinta)' }}
        >
          <X size={16} aria-hidden />
          Cancelar
        </button>
      </div>
    </form>
  )
}
