import { Clock, BrainCircuit, HeartPulse, Gauge, Wand2 } from 'lucide-react'
import type { EstadoRag } from '../types/database'
import {
  type MetricasSemana,
  ragHoras,
  ragRatio,
  ragAutocuidado,
  ragEstimacion,
  ragPersonal,
} from '../lib/metricas'

const RAG_VAR: Record<EstadoRag, string> = {
  rojo: '--rag-rojo',
  ambar: '--rag-ambar',
  verde: '--rag-verde',
}

function RagDot({ rag }: { rag: EstadoRag | null }) {
  if (!rag) {
    return <span className="mono-tag" style={{ opacity: 0.5 }}>—</span>
  }
  return (
    <span
      aria-label={rag}
      style={{
        width: 16,
        height: 16,
        borderRadius: 3,
        border: '2px solid var(--tinta)',
        background: `var(${RAG_VAR[rag]})`,
        flexShrink: 0,
      }}
    />
  )
}

function Fila({
  icon,
  label,
  valor,
  rag,
}: {
  icon: typeof Clock
  label: string
  valor: string
  rag: EstadoRag | null
}) {
  const Icon = icon
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.35rem 0' }}>
      <Icon size={16} aria-hidden style={{ opacity: 0.7, flexShrink: 0 }} />
      <span style={{ flex: 1, minWidth: 0 }}>{label}</span>
      <strong className="mono-tag" style={{ whiteSpace: 'nowrap' }}>{valor}</strong>
      <RagDot rag={rag} />
    </div>
  )
}

function textoEstimacion(sesgo: number | null): string {
  if (sesgo == null) return 'sin datos'
  const pct = Math.round(Math.abs(sesgo - 1) * 100)
  if (pct <= 5) return 'precisa'
  return sesgo > 1 ? `subestimás ${pct}%` : `sobreestimás ${pct}%`
}

export function MetricasPanel({
  metricas,
  onUsarSugerido,
}: {
  metricas: MetricasSemana
  onUsarSugerido: (rag: EstadoRag) => void
}) {
  const sugerido = ragPersonal(metricas)

  return (
    <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
      <p className="mono-tag" style={{ color: 'var(--sello)', marginBottom: '0.6rem' }}>
        Métricas de la semana
      </p>

      <Fila
        icon={Clock}
        label="Horas trabajadas"
        valor={`${metricas.horasTrabajadas.toFixed(1)} / ${metricas.techoHoras} h`}
        rag={ragHoras(metricas.horasTrabajadas, metricas.techoHoras)}
      />
      <Fila
        icon={BrainCircuit}
        label="Trabajo profundo"
        valor={
          metricas.ratioProfundo == null
            ? 'sin datos'
            : `${Math.round(metricas.ratioProfundo * 100)}%`
        }
        rag={ragRatio(metricas.ratioProfundo)}
      />
      <Fila
        icon={HeartPulse}
        label="Autocuidado respetado"
        valor={
          metricas.pctAutocuidado == null
            ? 'sin bloques'
            : `${metricas.autoRespetados}/${metricas.autoPlaneados}`
        }
        rag={ragAutocuidado(metricas.pctAutocuidado)}
      />
      <Fila
        icon={Gauge}
        label="Estimación"
        valor={textoEstimacion(metricas.sesgoEstimacion)}
        rag={ragEstimacion(metricas.sesgoEstimacion)}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          marginTop: '0.9rem',
          paddingTop: '0.9rem',
          borderTop: '1px solid var(--papel-hueco)',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
          <RagDot rag={sugerido} />
          <span style={{ fontWeight: 600 }}>RAG personal sugerido</span>
        </span>
        {sugerido && (
          <button
            type="button"
            className="btn"
            onClick={() => onUsarSugerido(sugerido)}
            style={{ background: 'var(--papel)', color: 'var(--tinta)' }}
          >
            <Wand2 size={15} aria-hidden />
            Usar este
          </button>
        )}
      </div>
    </div>
  )
}
