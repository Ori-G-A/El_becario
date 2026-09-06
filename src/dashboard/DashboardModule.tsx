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
  type AvanceTop12,
  type TareasPorIni,
  type RagSemana,
  type CruceAreaIni,
  serieSemanal,
  balanceAreas,
  tiempoPorIniciativa,
  tallyRag,
  avanceTop12,
  tareasPorIniciativa,
  ragTrend,
  cruceAreaIniciativa,
} from '../lib/dashboard'
import { listBloquesDesde } from '../data/bloques'
import { listAreas } from '../data/areas'
import { listIniciativas } from '../data/iniciativas'
import { listTareaAreas, listTareasResumen, type TareaResumen } from '../data/tareas'
import { listRevisiones } from '../data/revisiones'

// Recharts pinta atributos SVG de presentación, y var() se resuelve ahí igual
// que en CSS: las gráficas cambian con el tema sin re-renderizar nada.
const TINTA = 'var(--tinta)'
const ROJO = 'var(--rojo)'
const TEAL = 'var(--teal)'
const MANILA = 'var(--manila)'
const REJILLA = 'var(--borde2)'
const SEMANAS = 8

const RAG_COLOR: Record<EstadoRag, string> = {
  rojo: 'var(--rojo)',
  ambar: 'var(--ambar)',
  verde: 'var(--verde)',
}

const ejeTick = { fontSize: 11, fill: TINTA, fontFamily: 'var(--font-mono)' }
const leyenda = { fontFamily: 'var(--font-mono)', fontSize: 12 }
const tooltipStyle = {
  background: 'var(--sup)',
  color: 'var(--tinta)',
  border: '1px solid var(--borde)',
  borderRadius: 10,
  boxShadow: 'var(--sombra)',
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
}

type Subvista = 'tiempo' | 'iniciativas' | 'avance'
const SUBTABS: { id: Subvista; label: string }[] = [
  { id: 'tiempo', label: 'Tiempo' },
  { id: 'iniciativas', label: 'Iniciativas' },
  { id: 'avance', label: 'Avance' },
]

function Tarjeta({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: '1rem' }}>
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
  const [avance, setAvance] = useState<AvanceTop12>({ hechas: 0, total: 0 })
  const [tareasIni, setTareasIni] = useState<TareasPorIni[]>([])
  const [ragSerie, setRagSerie] = useState<RagSemana[]>([])
  const [cruce, setCruce] = useState<CruceAreaIni>({ filas: [], areas: [] })
  const [sub, setSub] = useState<Subvista>('tiempo')
  const [hayDatos, setHayDatos] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const desde = addDays(mondayISO(), -7 * (SEMANAS - 1))
      const [bloques, areas, tareaAreas, iniciativas, tareas, revisiones]: [
        Bloque[],
        Area[],
        { tarea_id: string; area_id: string }[],
        Iniciativa[],
        TareaResumen[],
        Awaited<ReturnType<typeof listRevisiones>>,
      ] = await Promise.all([
        listBloquesDesde(desde),
        listAreas(),
        listTareaAreas(),
        listIniciativas(),
        listTareasResumen(),
        listRevisiones(),
      ])
      setHayDatos(bloques.length > 0 || iniciativas.length > 0 || tareas.length > 0)
      setSerie(serieSemanal(bloques, SEMANAS))
      const ultimas4 = addDays(mondayISO(), -21)
      const recientes = bloques.filter((b) => b.inicio >= ultimas4)
      setBalance(balanceAreas(recientes, areas, tareaAreas))
      setIniBalance(tiempoPorIniciativa(recientes, iniciativas, tareas))
      setRag(tallyRag(iniciativas))
      setAvance(avanceTop12(tareas))
      setTareasIni(tareasPorIniciativa(iniciativas, tareas))
      setRagSerie(ragTrend(revisiones))
      setCruce(cruceAreaIniciativa(recientes, iniciativas, areas, tareas, tareaAreas))
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

  const cardHoras = (
    <Tarjeta titulo={`Horas de trabajo por semana · techo ${TECHO_HORAS} h`}>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={serie} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={REJILLA} vertical={false} />
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
  )

  const cardProfundo = (
    <Tarjeta titulo="Trabajo profundo vs. reactivo">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={serie} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={REJILLA} vertical={false} />
          <XAxis dataKey="label" tick={ejeTick} stroke={TINTA} />
          <YAxis tick={ejeTick} stroke={TINTA} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [`${v} h`, n]} />
          <Legend wrapperStyle={leyenda} />
          <Bar dataKey="profundoH" stackId="t" fill={TEAL} name="Profundo" radius={[0, 0, 0, 0]} />
          <Bar dataKey="reactivoH" stackId="t" fill={MANILA} name="Reactivo" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Tarjeta>
  )

  const cardBalanceArea = (
    <Tarjeta titulo="Balance por área · últimas 4 semanas">
      {balance.length === 0 ? (
        <p className="mono-tag" style={{ opacity: 0.7 }}>Sin bloques con área en este período.</p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(140, balance.length * 42)}>
          <BarChart data={balance} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={REJILLA} horizontal={false} />
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
  )

  const cardRagTally = (
    <Tarjeta titulo="Iniciativas · estado RAG">
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
        {(['rojo', 'ambar', 'verde'] as EstadoRag[]).map((r) => (
          <span
            key={r}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.4rem 0.7rem',
              borderRadius: 10,
              background: 'var(--suave)',
            }}
          >
            <span
              style={{
                width: 13,
                height: 13,
                borderRadius: 4,
                background: RAG_COLOR[r],
              }}
            />
            <strong>{rag[r]}</strong>
          </span>
        ))}
      </div>
    </Tarjeta>
  )

  const cardTiempoIni = (
    <Tarjeta titulo="Tiempo por iniciativa · últimas 4 semanas">
      {iniBalance.length === 0 ? (
        <p className="mono-tag" style={{ opacity: 0.7 }}>
          Sin bloques vinculados a iniciativas en este período. Asigna una iniciativa a tus
          tareas para verlo aquí.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(140, iniBalance.length * 42)}>
          <BarChart data={iniBalance} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={REJILLA} horizontal={false} />
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
  )

  const cardTareasIni = (
    <Tarjeta titulo="Tareas por iniciativa">
      {tareasIni.length === 0 ? (
        <p className="mono-tag" style={{ opacity: 0.7 }}>Aún no hay tareas asignadas a iniciativas.</p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(140, tareasIni.length * 42)}>
          <BarChart data={tareasIni} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={REJILLA} horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={ejeTick} stroke={TINTA} />
            <YAxis type="category" dataKey="nombre" tick={ejeTick} stroke={TINTA} width={84} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={leyenda} />
            <Bar dataKey="hechas" stackId="t" fill={RAG_COLOR.verde} name="Hechas" radius={[0, 0, 0, 0]} />
            <Bar dataKey="pendientes" stackId="t" fill="var(--pizarra)" name="Pendientes" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Tarjeta>
  )

  const cardCruce = (
    <Tarjeta titulo="Área × iniciativa · últimas 4 semanas">
      {cruce.filas.length === 0 ? (
        <p className="mono-tag" style={{ opacity: 0.7 }}>
          Hace falta tiempo en bloques de tareas que tengan iniciativa y área.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(160, cruce.filas.length * 46)}>
          <BarChart data={cruce.filas} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={REJILLA} horizontal={false} />
            <XAxis type="number" tick={ejeTick} stroke={TINTA} />
            <YAxis type="category" dataKey="nombre" tick={ejeTick} stroke={TINTA} width={84} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [`${v} h`, n]} />
            <Legend wrapperStyle={{ ...leyenda, fontSize: 11 }} />
            {cruce.areas.map((a, i) => (
              <Bar
                key={a.nombre}
                dataKey={a.nombre}
                stackId="ai"
                fill={a.color}
                radius={i === cruce.areas.length - 1 ? [0, 3, 3, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </Tarjeta>
  )

  const cardAvance = (
    <Tarjeta titulo="Avance del Top 12">
      {avance.total === 0 ? (
        <p className="mono-tag" style={{ opacity: 0.7 }}>Sin tareas en el Top 12.</p>
      ) : (
        <>
          <p style={{ marginBottom: '0.6rem' }}>
            <strong style={{ fontSize: '1.6rem', letterSpacing: '-0.03em' }}>
              {avance.hechas}/{avance.total}
            </strong>{' '}
            <span className="mono-tag" style={{ opacity: 0.7 }}>hechas</span>
          </p>
          <div
            style={{
              height: 16,
              borderRadius: 8,
              overflow: 'hidden',
              background: 'var(--suave)',
            }}
          >
            <div
              style={{
                width: `${Math.round((avance.hechas / avance.total) * 100)}%`,
                height: '100%',
                background: RAG_COLOR.verde,
              }}
            />
          </div>
        </>
      )}
    </Tarjeta>
  )

  const cardRagPersonal = (
    <Tarjeta titulo="RAG personal · semanas recientes">
      {ragSerie.length === 0 ? (
        <p className="mono-tag" style={{ opacity: 0.7 }}>
          Cierra revisiones semanales para ver la tendencia.
        </p>
      ) : (
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {ragSerie.map((s, i) => (
            <div key={`${s.label}-${i}`} style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: s.rag ? RAG_COLOR[s.rag] : 'var(--suave)',
                }}
              />
              <span className="mono-tag" style={{ fontSize: '0.62rem', opacity: 0.6 }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </Tarjeta>
  )

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)' }}>Panel</h1>

      {error && (
        <p
          className="card"
          style={{ padding: '0.75rem 1rem', color: 'var(--rojo)', fontWeight: 600 }}
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
            Agenda bloques en el calendario y marca tus tiempos reales. En cuanto haya un par
            de semanas, aquí aparecen tus tendencias.
          </p>
        </div>
      ) : (
        <>
          <nav className="pills" style={{ alignSelf: 'flex-start' }}>
            {SUBTABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSub(t.id)}
                aria-pressed={sub === t.id}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {sub === 'tiempo' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {cardHoras}
              {cardProfundo}
              {cardBalanceArea}
            </div>
          )}
          {sub === 'iniciativas' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {cardRagTally}
              {cardTiempoIni}
              {cardTareasIni}
              {cardCruce}
            </div>
          )}
          {sub === 'avance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {cardAvance}
              {cardRagPersonal}
            </div>
          )}
        </>
      )}
    </section>
  )
}
