import { useEffect, useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
  Cell,
} from 'recharts'
import type { Area, Bloque, EstadoRag, Iniciativa } from '../types/database'
import { mondayISO, addDays } from '../lib/date'
import { TECHO_HORAS } from '../lib/metricas'
import {
  type SemanaSerie,
  type AreaBalance,
  type IniciativaBalance,
  serieSemanal,
  balanceAreas,
  tiempoPorIniciativa,
  tallyRag,
} from '../lib/dashboard'
import { listBloquesDesde } from '../data/bloques'
import { listAreas } from '../data/areas'
import { listIniciativas } from '../data/iniciativas'
import { listTareaAreas, listTareaIniciativas } from '../data/tareas'

const TINTA = '#181818'
const ROJO = '#FB4D3D'
const TEAL = '#2AA9B5'
const MANILA = '#C77D3A'
const SEMANAS = 8

const RAG_COLOR: Record<EstadoRag, string> = {
  rojo: '#FB4D3D',
  ambar: '#FFC53D',
  verde: '#2ECC71',
}

const ejeTick = { fontSize: 11, fill: TINTA, fontFamily: "'IBM Plex Mono', monospace" }
const tooltipStyle = {
  background: '#EFEDE4',
  border: '2px solid #181818',
  borderRadius: 4,
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 12,
}

function Tarjeta({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: '1rem', marginBottom: '1.25rem' }}>
      <p className="mono-tag" style={{ color: 'var(--sello)', marginBottom: '0.8rem' }}>
        {titulo}
      </p>
      {children}
    </div>
  )
}

export function DashboardModule() {
  const [serie, setSerie] = useState<SemanaSerie[]>([])
  const [balance, setBalance] = useState<AreaBalance[]>([])
  const [iniBalance, setIniBalance] = useState<IniciativaBalance[]>([])
  const [rag, setRag] = useState<Record<EstadoRag, number>>({ rojo: 0, ambar: 0, verde: 0 })
  const [hayDatos, setHayDatos] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const desde = addDays(mondayISO(), -7 * (SEMANAS - 1))
      const [bloques, areas, tareaAreas, iniciativas, tareaIni]: [
        Bloque[],
        Area[],
        { tarea_id: string; area_id: string }[],
        Iniciativa[],
        { id: string; iniciativa_id: string | null }[],
      ] = await Promise.all([
        listBloquesDesde(desde),
        listAreas(),
        listTareaAreas(),
        listIniciativas(),
        listTareaIniciativas(),
      ])
      setHayDatos(bloques.length > 0 || iniciativas.length > 0)
      setSerie(serieSemanal(bloques, SEMANAS))
      const ultimas4 = addDays(mondayISO(), -21)
      const recientes = bloques.filter((b) => b.inicio >= ultimas4)
      setBalance(balanceAreas(recientes, areas, tareaAreas))
      setIniBalance(tiempoPorIniciativa(recientes, iniciativas, tareaIni))
      setRag(tallyRag(iniciativas))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude cargar el panel.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [])

  return (
    <section>
      <h1 style={{ fontSize: 'clamp(1.8rem, 6vw, 2.6rem)', marginBottom: '1rem' }}>Panel</h1>

      {error && (
        <p
          className="card"
          style={{ padding: '0.75rem 1rem', color: 'var(--rag-rojo)', fontWeight: 600, marginBottom: '1rem' }}
        >
          {error}
        </p>
      )}

      {loading ? (
        <p className="mono-tag">Sacando cuentas…</p>
      ) : !hayDatos ? (
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <p style={{ fontWeight: 600, marginBottom: '0.4rem' }}>Todavía no hay qué graficar.</p>
          <p style={{ opacity: 0.8 }}>
            Agenda bloques en el calendario y marca tus tiempos reales. En cuanto haya
            un par de semanas, aquí aparecen tus tendencias.
          </p>
        </div>
      ) : (
        <>
          <Tarjeta titulo={`Horas de trabajo por semana · techo ${TECHO_HORAS} h`}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={serie} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D8D5C9" vertical={false} />
                <XAxis dataKey="label" tick={ejeTick} stroke={TINTA} />
                <YAxis tick={ejeTick} stroke={TINTA} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} h`, 'Trabajo']} />
                <ReferenceLine y={TECHO_HORAS} stroke={ROJO} strokeDasharray="5 4" />
                <Bar dataKey="horas" radius={[3, 3, 0, 0]}>
                  {serie.map((s) => (
                    <Cell key={s.semanaISO} fill={s.horas > TECHO_HORAS ? ROJO : TINTA} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Tarjeta>

          <Tarjeta titulo="Trabajo profundo vs. reactivo">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={serie} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D8D5C9" vertical={false} />
                <XAxis dataKey="label" tick={ejeTick} stroke={TINTA} />
                <YAxis tick={ejeTick} stroke={TINTA} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [`${v} h`, n]} />
                <Legend wrapperStyle={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }} />
                <Bar dataKey="profundoH" stackId="t" fill={TEAL} name="Profundo" radius={[0, 0, 0, 0]} />
                <Bar dataKey="reactivoH" stackId="t" fill={MANILA} name="Reactivo" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Tarjeta>

          <Tarjeta titulo="Balance por área · últimas 4 semanas">
            {balance.length === 0 ? (
              <p className="mono-tag" style={{ opacity: 0.7 }}>
                Sin bloques con área en este período.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(140, balance.length * 42)}>
                <BarChart
                  data={balance}
                  layout="vertical"
                  margin={{ top: 4, right: 12, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#D8D5C9" horizontal={false} />
                  <XAxis type="number" tick={ejeTick} stroke={TINTA} />
                  <YAxis type="category" dataKey="nombre" tick={ejeTick} stroke={TINTA} width={84} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} h`, 'Tiempo']} />
                  <Bar dataKey="horas" radius={[0, 3, 3, 0]}>
                    {balance.map((b) => (
                      <Cell key={b.nombre} fill={b.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Tarjeta>

          <Tarjeta titulo="Iniciativas · estado RAG">
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              {(['rojo', 'ambar', 'verde'] as EstadoRag[]).map((r) => (
                <span
                  key={r}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.3rem 0.6rem',
                    border: 'var(--borde)',
                    borderRadius: 'var(--radio)',
                  }}
                >
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 3,
                      border: '2px solid var(--tinta)',
                      background: RAG_COLOR[r],
                    }}
                  />
                  <strong>{rag[r]}</strong>
                </span>
              ))}
            </div>
          </Tarjeta>

          <Tarjeta titulo="Tiempo por iniciativa · últimas 4 semanas">
            {iniBalance.length === 0 ? (
              <p className="mono-tag" style={{ opacity: 0.7 }}>
                Sin bloques vinculados a iniciativas en este período. Asigna una
                iniciativa a tus tareas para verlo aquí.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(140, iniBalance.length * 42)}>
                <BarChart
                  data={iniBalance}
                  layout="vertical"
                  margin={{ top: 4, right: 12, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#D8D5C9" horizontal={false} />
                  <XAxis type="number" tick={ejeTick} stroke={TINTA} />
                  <YAxis type="category" dataKey="nombre" tick={ejeTick} stroke={TINTA} width={84} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} h`, 'Tiempo']} />
                  <Bar dataKey="horas" radius={[0, 3, 3, 0]}>
                    {iniBalance.map((b) => (
                      <Cell key={b.nombre} fill={RAG_COLOR[b.rag]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Tarjeta>
        </>
      )}
    </section>
  )
}
