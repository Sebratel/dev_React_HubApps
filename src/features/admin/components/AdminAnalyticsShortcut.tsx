import { Link } from 'react-router-dom'
import { BarChart2, ArrowRight, MousePointerClick, TrendingUp } from 'lucide-react'
import type { TopAppItem } from '@/services/admin/admin-stats.service'

interface AdminAnalyticsShortcutProps {
  topApps:   TopAppItem[]
  isLoading: boolean
}

export function AdminAnalyticsShortcut({ topApps, isLoading }: AdminAnalyticsShortcutProps) {
  const totalAccesses = topApps.reduce((sum, a) => sum + a.openCount, 0)
  const topApp        = topApps[0] ?? null

  return (
    <section
      className="rounded-xl border border-border bg-card shadow-sm p-4 flex flex-col"
      aria-label="Atalho para Analytics"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 className="h-4 w-4 text-primary" aria-hidden />
        <h2 className="text-sm font-semibold text-foreground">Analytics de Acessos</h2>
        <span className="ml-auto text-[11px] text-muted-foreground">Últimos 30 dias</span>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="flex flex-col gap-3 flex-1">
          <div className="h-10 bg-muted rounded-lg animate-pulse" />
          <div className="h-10 bg-muted rounded-lg animate-pulse" />
        </div>
      ) : (
        <div className="flex flex-col gap-3 flex-1">
          {/* Total acessos */}
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
            <MousePointerClick className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-muted-foreground leading-none mb-0.5">Total de acessos</p>
              <p className="text-lg font-bold text-foreground tabular-nums leading-none">
                {totalAccesses > 0 ? totalAccesses : '—'}
              </p>
            </div>
          </div>

          {/* App mais acessado */}
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
            <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-muted-foreground leading-none mb-0.5">Mais acessado</p>
              {topApp ? (
                <p className="text-sm font-semibold text-foreground truncate leading-none">
                  {topApp.appName}
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground tabular-nums">
                    ({topApp.openCount}×)
                  </span>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground leading-none">Sem dados</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="mt-4 pt-3 border-t border-border">
        <Link
          to="/admin/analytics"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group"
        >
          Ver relatório completo
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </div>
    </section>
  )
}
