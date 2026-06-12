import { useEffect, useState } from 'react'
import type { TopAppItem } from '@/services/admin/admin-stats.service'

interface AdminTopAppsCardProps {
  data: TopAppItem[]
  isLoading: boolean
}

export function AdminTopAppsCard({ data, isLoading }: AdminTopAppsCardProps) {
  const max = data[0]?.openCount ?? 1

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setMounted(true), 60)
    return () => clearTimeout(id)
  }, [])

  return (
    <section className="rounded-xl border border-border bg-card p-4" aria-label="Apps mais acessados">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground">Top Apps</h2>
        <span className="text-[11px] text-muted-foreground">Últimos 30 dias</span>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-3 h-3 bg-muted rounded animate-pulse shrink-0" />
              <div className="w-20 h-3 bg-muted rounded animate-pulse shrink-0" />
              <div className="flex-1 h-2.5 bg-muted rounded-full animate-pulse" />
              <div className="w-6 h-3 bg-muted rounded animate-pulse shrink-0" />
            </div>
          ))}
        </div>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Nenhum acesso registrado nos últimos 30 dias.
        </p>
      ) : (
        <div className="flex flex-col gap-3" role="list" aria-label="Apps por acesso">
          {data.map((item, i) => {
            const pct = Math.round((item.openCount / max) * 100)
            return (
              <div key={item.appName} className="flex items-center gap-3" role="listitem">
                <span className="text-[11px] text-muted-foreground/50 w-3 shrink-0 text-right tabular-nums">
                  {i + 1}
                </span>
                <span
                  className="text-xs text-muted-foreground w-20 shrink-0 truncate"
                  title={item.appName}
                >
                  {item.appName}
                </span>
                <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary/70 transition-all duration-700 ease-out"
                    style={{ width: mounted ? `${pct}%` : '0%' }}
                    role="meter"
                    aria-valuenow={item.openCount}
                    aria-valuemax={max}
                    aria-label={`${item.appName}: ${item.openCount} acessos`}
                  />
                </div>
                <span className="text-xs font-semibold text-foreground tabular-nums w-6 text-right shrink-0">
                  {item.openCount}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
