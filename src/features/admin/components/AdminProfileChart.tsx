import { PROFILE_LABEL } from '@/constants/profiles'
import type { ProfileDistributionItem } from '@/services/admin/admin-stats.service'

const BAR_COLORS: Record<string, string> = {
  infraestrutura: 'bg-stone-400',
  tecnica:        'bg-amber-400',
  atendimento:    'bg-green-400',
  comercial:      'bg-orange-400',
  users:          'bg-gray-400',
  'sem perfil':   'bg-muted-foreground/30',
}

interface AdminProfileChartProps {
  data: ProfileDistributionItem[]
  isLoading: boolean
}

export function AdminProfileChart({ data, isLoading }: AdminProfileChartProps) {
  const total = data.reduce((s, d) => s + d.count, 0)
  const max   = data[0]?.count ?? 1

  return (
    <section className="rounded-xl border border-border bg-card p-4" aria-label="Distribuição por perfil">
      <h2 className="text-sm font-semibold text-foreground mb-4">Distribuição por Perfil</h2>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-24 h-3.5 bg-muted rounded animate-pulse shrink-0" />
              <div className="flex-1 h-3 bg-muted rounded-full animate-pulse" />
              <div className="w-6 h-3 bg-muted rounded animate-pulse shrink-0" />
            </div>
          ))}
        </div>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Nenhum usuário ativo.</p>
      ) : (
        <div className="flex flex-col gap-3" role="list" aria-label="Usuários por perfil">
          {data.map((item) => {
            const pct = Math.round((item.count / max) * 100)
            const label = PROFILE_LABEL[item.profile] ?? item.profile
            const barColor = BAR_COLORS[item.profile] ?? 'bg-primary/60'
            return (
              <div key={item.profile} className="flex items-center gap-3" role="listitem">
                <span className="text-xs text-muted-foreground w-24 shrink-0 truncate" title={label}>
                  {label}
                </span>
                <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${pct}%` }}
                    role="meter"
                    aria-valuenow={item.count}
                    aria-valuemax={max}
                    aria-label={`${label}: ${item.count}`}
                  />
                </div>
                <span className="text-xs font-medium text-foreground tabular-nums w-8 text-right shrink-0">
                  {item.count}
                </span>
              </div>
            )
          })}
          <p className="text-xs text-muted-foreground text-right mt-1">{total} usuários ativos</p>
        </div>
      )}
    </section>
  )
}
