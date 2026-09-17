import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart2, TrendingUp, Users, MousePointerClick, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getAppAnalytics,
  type AnalyticsPeriod,
  type DailyAccessItem,
} from '@/services/admin/admin-analytics.service'

// ─── Period selector ──────────────────────────────────────────────────────────
const PERIODS: { value: AnalyticsPeriod; label: string; days: number }[] = [
  { value: '7d',  label: '7 dias',   days: 7   },
  { value: '30d', label: '30 dias',  days: 30  },
  { value: '90d', label: '90 dias',  days: 90  },
  { value: '1y',  label: '12 meses', days: 365 },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  // dateStr may come as a Date object serialized differently — normalize to string first
  const s = String(dateStr)
  // Accepts YYYY-MM-DD or ISO datetime
  const parts = s.slice(0, 10).split('-')
  if (parts.length !== 3) return s
  return `${parts[2]}/${parts[1]}`   // DD/MM
}

function formatDateFull(dateStr: string): string {
  if (!dateStr) return ''
  const s = String(dateStr).slice(0, 10)
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

// ─── Area chart ───────────────────────────────────────────────────────────────
function DailyChart({ data }: { data: DailyAccessItem[] }) {
  const W   = 560
  const H   = 110
  const PAD = { top: 12, right: 12, bottom: 32, left: 36 }

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-28 text-sm text-muted-foreground">
        Nenhum acesso registrado no período.
      </div>
    )
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1)
  const innerW   = W - PAD.left - PAD.right
  const innerH   = H - PAD.top  - PAD.bottom
  const step     = data.length > 1 ? innerW / (data.length - 1) : innerW

  const pts = data.map((d, i) => ({
    x: PAD.left + (data.length > 1 ? i * step : innerW / 2),
    y: PAD.top  + innerH - (d.count / maxCount) * innerH,
    d,
  }))

  const pathD = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ')

  const areaD = [
    `M${pts[0].x.toFixed(1)},${(PAD.top + innerH).toFixed(1)}`,
    ...pts.map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`),
    `L${pts[pts.length - 1].x.toFixed(1)},${(PAD.top + innerH).toFixed(1)}`,
    'Z',
  ].join(' ')

  // Y-axis: 3 grid lines
  const yTicks = [0, Math.round(maxCount / 2), maxCount]

  // X-axis labels: up to 7 evenly spaced
  const maxLabels = Math.min(7, data.length)
  const labelIdxs = Array.from({ length: maxLabels }, (_, i) =>
    Math.round((i / (maxLabels - 1)) * (data.length - 1))
  )
  const uniqueIdxs = [...new Set(labelIdxs)]

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full overflow-visible"
      style={{ height: 110 }}
      aria-label="Gráfico de acessos por dia"
    >
      <defs>
        <linearGradient id="analytics-area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="hsl(var(--primary))" stopOpacity="0.18" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {/* Grid lines + Y labels */}
      {yTicks.map((v) => {
        const y = PAD.top + innerH - (v / maxCount) * innerH
        return (
          <g key={v}>
            <line
              x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
              stroke="hsl(var(--border))" strokeWidth="0.75" strokeDasharray="3 3"
            />
            <text
              x={PAD.left - 6} y={y + 3.5}
              textAnchor="end" fontSize="8.5"
              fill="hsl(var(--muted-foreground))"
            >
              {v}
            </text>
          </g>
        )
      })}

      {/* Area fill */}
      <path d={areaD} fill="url(#analytics-area-grad)" />

      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Data point dots — only when few points */}
      {data.length <= 20 && pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.5"
          fill="hsl(var(--primary))"
          stroke="hsl(var(--background))"
          strokeWidth="1.5"
        >
          <title>{`${formatDateFull(p.d.date)}: ${p.d.count} acessos`}</title>
        </circle>
      ))}

      {/* X-axis labels */}
      {uniqueIdxs.map((idx) => {
        const p = pts[idx]
        if (!p) return null
        return (
          <text
            key={idx}
            x={p.x} y={H - 4}
            textAnchor="middle" fontSize="8.5"
            fill="hsl(var(--muted-foreground))"
          >
            {formatDate(p.d.date)}
          </text>
        )
      })}
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
          <div className="h-6 w-14 bg-muted rounded animate-pulse mt-0.5" />
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
      <span className="text-xs text-foreground w-32 shrink-0 truncate" title={label}>
        {label}
      </span>
      <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
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

// ─── Skeleton rows ────────────────────────────────────────────────────────────
function SkeletonRows({ n = 5 }: { n?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-4 h-2.5 bg-muted rounded animate-pulse shrink-0" />
          <div className="w-28 h-2.5 bg-muted rounded animate-pulse shrink-0" />
          <div className="flex-1 h-1.5 bg-muted rounded-full animate-pulse" />
          <div className="w-6 h-2.5 bg-muted rounded animate-pulse shrink-0" />
        </div>
      ))}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function Empty() {
  return (
    <p className="text-sm text-muted-foreground py-6 text-center">
      Nenhum acesso registrado no período.
    </p>
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
    setMounted(false)
    const id = setTimeout(() => setMounted(true), 80)
    return () => clearTimeout(id)
  }, [data])

  const topApps  = data?.topApps  ?? []
  const topUsers = data?.topUsers ?? []
  const maxApps  = topApps[0]?.openCount  ?? 1
  const maxUsers = topUsers[0]?.openCount ?? 1

  const peakDay = data?.dailyAccesses.reduce<DailyAccessItem | null>(
    (best, d) => (d.count > (best?.count ?? 0) ? d : best),
    null,
  )

  const periodDays = PERIODS.find((p) => p.value === period)?.days ?? 30
  const avgPerDay  = data ? Math.round(data.totalAccesses / periodDays) : 0

  const periodLabel = PERIODS.find((p) => p.value === period)?.label ?? ''

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2.5">
          <BarChart2 className="h-5 w-5 text-primary" aria-hidden />
          <h1 className="text-2xl font-bold text-foreground">Analytics de Acessos</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Period tabs */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
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

          {/* Refresh */}
          <button
            onClick={() => refetch()}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Atualizar"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
          </button>
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
          label="Apps acessados"
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
      <section className="rounded-xl border border-border bg-card shadow-sm p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            Acessos por dia
            <span className="text-xs font-normal text-muted-foreground ml-2">({periodLabel})</span>
          </h2>
          {peakDay && !isLoading && (
            <span className="text-[11px] text-muted-foreground">
              Pico:{' '}
              <span className="font-medium text-foreground">{formatDateFull(peakDay.date)}</span>
              {' '}({peakDay.count} acessos)
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="h-28 bg-muted rounded-lg animate-pulse" />
        ) : isError ? (
          <div className="h-28 flex flex-col items-center justify-center gap-2 text-sm text-destructive">
            <span>Erro ao carregar dados.</span>
            <button
              className="text-xs underline text-muted-foreground hover:text-foreground"
              onClick={() => refetch()}
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <DailyChart data={data?.dailyAccesses ?? []} />
        )}
      </section>

      {/* Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Top apps */}
        <section className="rounded-xl border border-border bg-card shadow-sm p-5">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Apps mais acessados</h2>
            <span className="text-[11px] text-muted-foreground">{periodLabel}</span>
          </div>
          {isLoading ? (
            <SkeletonRows />
          ) : topApps.length === 0 ? (
            <Empty />
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
        <section className="rounded-xl border border-border bg-card shadow-sm p-5">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Usuários mais ativos</h2>
            <span className="text-[11px] text-muted-foreground">por acessos a apps</span>
          </div>
          {isLoading ? (
            <SkeletonRows />
          ) : topUsers.length === 0 ? (
            <Empty />
          ) : (
            <div className="flex flex-col gap-3" role="list">
              {topUsers.map((u, i) => (
                <BarRow
                  key={u.userId}
                  rank={i + 1}
                  label={u.userName || u.userId.slice(0, 12)}
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
