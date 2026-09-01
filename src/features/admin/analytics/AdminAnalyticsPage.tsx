import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart2, TrendingUp, Users, MousePointerClick } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getAppAnalytics,
  type AnalyticsPeriod,
  type DailyAccessItem,
} from '@/services/admin/admin-analytics.service'

// ─── Period selector ──────────────────────────────────────────────────────────
const PERIODS: { value: AnalyticsPeriod; label: string }[] = [
  { value: '7d',  label: '7 dias'   },
  { value: '30d', label: '30 dias'  },
  { value: '90d', label: '90 dias'  },
  { value: '1y',  label: '12 meses' },
]

// ─── Sparkline SVG ────────────────────────────────────────────────────────────
function DailyChart({ data }: { data: DailyAccessItem[] }) {
  const W = 600
  const H = 120
  const PAD = { top: 8, right: 8, bottom: 28, left: 32 }

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        Nenhum dado no período.
      </div>
    )
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1)
  const innerW   = W - PAD.left - PAD.right
  const innerH   = H - PAD.top  - PAD.bottom
  const step     = innerW / Math.max(data.length - 1, 1)

  const pts = data.map((d, i) => ({
    x: PAD.left + i * step,
    y: PAD.top  + innerH - (d.count / maxCount) * innerH,
    d,
  }))

  const polyline = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const area     = [
    `M${pts[0].x.toFixed(1)},${(PAD.top + innerH).toFixed(1)}`,
    ...pts.map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`),
    `L${pts[pts.length - 1].x.toFixed(1)},${(PAD.top + innerH).toFixed(1)}`,
    'Z',
  ].join(' ')

  // Y-axis labels
  const yLabels = [0, Math.round(maxCount / 2), maxCount]

  // X-axis: show first, middle, last
  const xLabels =
    data.length <= 8
      ? pts
      : [pts[0], pts[Math.floor(pts.length / 2)], pts[pts.length - 1]]

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height: 120 }}
      aria-label="Gráfico de acessos por dia"
    >
      <defs>
        <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="hsl(var(--primary))" stopOpacity="0.25" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {yLabels.map((v) => {
        const y = PAD.top + innerH - (v / maxCount) * innerH
        return (
          <g key={v}>
            <line
              x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
              stroke="hsl(var(--border))" strokeWidth="1"
            />
            <text
              x={PAD.left - 4} y={y + 4}
              textAnchor="end" fontSize="9"
              fill="hsl(var(--muted-foreground))"
            >
              {v}
            </text>
          </g>
        )
      })}

      {/* Area fill */}
      <path d={area} fill="url(#area-grad)" />

      {/* Line */}
      <polyline
        points={polyline}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Data points */}
      {pts.map((p, i) => (
        <circle
          key={i}
          cx={p.x} cy={p.y} r="2.5"
          fill="hsl(var(--primary))"
          stroke="hsl(var(--background))"
          strokeWidth="1.5"
        >
          <title>{`${p.d.date}: ${p.d.count} acessos`}</title>
        </circle>
      ))}

      {/* X labels */}
      {xLabels.map((p) => (
        <text
          key={p.d.date}
          x={p.x} y={H - 4}
          textAnchor="middle" fontSize="9"
          fill="hsl(var(--muted-foreground))"
        >
          {p.d.date.slice(5)} {/* MM-DD */}
        </text>
      ))}
    </svg>
  )
}

// ─── Metric card ──────────────────────────────────────────────────────────────
function MetricCard({
  label, value, icon, isLoading,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  isLoading: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm p-4 flex items-center gap-3">
      <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        {isLoading ? (
          <div className="h-5 w-12 bg-muted rounded animate-pulse mt-0.5" />
        ) : (
          <p className="text-xl font-bold text-foreground tabular-nums">{value}</p>
        )}
      </div>
    </div>
  )
}

// ─── Bar row ──────────────────────────────────────────────────────────────────
function BarRow({
  rank, label, value, max, mounted,
}: {
  rank: number; label: string; value: number; max: number; mounted: boolean
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3" role="listitem">
      <span className="text-[11px] text-muted-foreground/50 w-4 shrink-0 text-right tabular-nums">
        {rank}
      </span>
      <span className="text-xs text-muted-foreground w-28 shrink-0 truncate" title={label}>
        {label}
      </span>
      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary/70 transition-all duration-700 ease-out"
          style={{ width: mounted ? `${pct}%` : '0%' }}
        />
      </div>
      <span className="text-xs font-semibold text-foreground tabular-nums w-8 text-right shrink-0">
        {value}
      </span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function AdminAnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d')
  const [mounted, setMounted] = useState(false)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'analytics', period],
    queryFn:  () => getAppAnalytics(period),
    staleTime: 60_000,
  })

  useEffect(() => {
    const id = setTimeout(() => setMounted(true), 80)
    return () => clearTimeout(id)
  }, [data])

  const topApps  = data?.topApps  ?? []
  const topUsers = data?.topUsers  ?? []
  const maxApps  = topApps[0]?.openCount  ?? 1
  const maxUsers = topUsers[0]?.openCount ?? 1

  // Peak day
  const peakDay = data?.dailyAccesses.reduce(
    (best, d) => (d.count > (best?.count ?? 0) ? d : best),
    null as typeof data.dailyAccesses[0] | null,
  )

  // Average per day
  const avgPerDay = data && data.dailyAccesses.length > 0
    ? Math.round(data.totalAccesses / data.dailyAccesses.length)
    : 0

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <BarChart2 className="h-5 w-5 text-primary" aria-hidden />
          <h1 className="text-2xl font-bold text-foreground">Analytics de Acessos</h1>
        </div>

        {/* Period tabs */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => { setPeriod(p.value); setMounted(false) }}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150',
                period === p.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="Total de acessos"
          value={data?.totalAccesses ?? 0}
          icon={<MousePointerClick className="h-4 w-4" />}
          isLoading={isLoading}
        />
        <MetricCard
          label="Apps diferentes"
          value={topApps.length}
          icon={<BarChart2 className="h-4 w-4" />}
          isLoading={isLoading}
        />
        <MetricCard
          label="Média por dia"
          value={avgPerDay}
          icon={<TrendingUp className="h-4 w-4" />}
          isLoading={isLoading}
        />
        <MetricCard
          label="Usuários ativos"
          value={topUsers.length}
          icon={<Users className="h-4 w-4" />}
          isLoading={isLoading}
        />
      </div>

      {/* Chart */}
      <section className="rounded-xl border border-border bg-card shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">Acessos por dia</h2>
          {peakDay && !isLoading && (
            <span className="text-[11px] text-muted-foreground">
              Pico: <span className="font-medium text-foreground">{peakDay.date}</span>
              {' '}({peakDay.count} acessos)
            </span>
          )}
        </div>
        {isLoading ? (
          <div className="h-32 bg-muted rounded-lg animate-pulse" />
        ) : isError ? (
          <div className="h-32 flex items-center justify-center text-sm text-destructive">
            Erro ao carregar dados.{' '}
            <button className="underline ml-1" onClick={() => refetch()}>Tentar novamente</button>
          </div>
        ) : (
          <DailyChart data={data?.dailyAccesses ?? []} />
        )}
      </section>

      {/* Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top apps */}
        <section className="rounded-xl border border-border bg-card shadow-sm p-4">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Apps mais acessados</h2>
            <span className="text-[11px] text-muted-foreground">
              {PERIODS.find((p) => p.value === period)?.label}
            </span>
          </div>
          {isLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-4 h-3 bg-muted rounded animate-pulse shrink-0" />
                  <div className="w-24 h-3 bg-muted rounded animate-pulse shrink-0" />
                  <div className="flex-1 h-2 bg-muted rounded-full animate-pulse" />
                  <div className="w-6 h-3 bg-muted rounded animate-pulse shrink-0" />
                </div>
              ))}
            </div>
          ) : topApps.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhum acesso registrado no período.
            </p>
          ) : (
            <div className="flex flex-col gap-3" role="list">
              {topApps.map((app, i) => (
                <BarRow
                  key={app.appId ?? app.appName}
                  rank={i + 1}
                  label={app.appName}
                  value={app.openCount}
                  max={maxApps}
                  mounted={mounted}
                />
              ))}
            </div>
          )}
        </section>

        {/* Top users */}
        <section className="rounded-xl border border-border bg-card shadow-sm p-4">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Usuários mais ativos</h2>
            <span className="text-[11px] text-muted-foreground">por acessos a apps</span>
          </div>
          {isLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-4 h-3 bg-muted rounded animate-pulse shrink-0" />
                  <div className="w-24 h-3 bg-muted rounded animate-pulse shrink-0" />
                  <div className="flex-1 h-2 bg-muted rounded-full animate-pulse" />
                  <div className="w-6 h-3 bg-muted rounded animate-pulse shrink-0" />
                </div>
              ))}
            </div>
          ) : topUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhum acesso registrado no período.
            </p>
          ) : (
            <div className="flex flex-col gap-3" role="list">
              {topUsers.map((u, i) => (
                <BarRow
                  key={u.userId}
                  rank={i + 1}
                  label={u.userName}
                  value={u.openCount}
                  max={maxUsers}
                  mounted={mounted}
                />
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  )
}
