import { AppWindowMac, Globe, Lock } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { AppIcon } from '@/components/app-icon'
import { cn } from '@/lib/utils'
import type { AppItemModel } from '@/types/models'
import { AppStatusBadge } from './AppStatusBadge'
import { AppActionsMenu } from './AppActionsMenu'

// ─── Props ────────────────────────────────────────────────────────────────────

interface AppsTableProps {
  apps: AppItemModel[]
  onEdit: (app: AppItemModel) => void
  onDeactivate: (app: AppItemModel) => void
  onReactivate: (app: AppItemModel) => void
  onDelete: (app: AppItemModel) => void
}

// ─── Card Grid ────────────────────────────────────────────────────────────────

export function AppsTable({ apps, onEdit, onDeactivate, onReactivate, onDelete }: AppsTableProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {apps.map((app) => {
        const isActive = app.status === 'active'
        return (
          <div
            key={app.id}
            className={cn(
              'group relative flex flex-col rounded-xl border border-border bg-card p-4 gap-3',
              'transition-all hover:border-primary/35 hover:shadow-[0_2px_16px_-6px_rgba(0,0,0,0.12)]',
              !isActive && 'opacity-60'
            )}
          >
            {/* Header: icon + name + actions */}
            <div className="flex items-start gap-2.5">
              <AppIcon icon={app.icon} name={app.name} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate leading-snug">{app.name}</p>
                {app.url && (
                  <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5 font-mono">{app.url}</p>
                )}
              </div>
              <div className="shrink-0 -mt-1 -mr-1">
                <AppActionsMenu
                  app={app}
                  onEdit={() => onEdit(app)}
                  onDeactivate={() => onDeactivate(app)}
                  onReactivate={() => onReactivate(app)}
                  onDelete={() => onDelete(app)}
                />
              </div>
            </div>

            {/* Description */}
            {app.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed flex-1">
                {app.description}
              </p>
            )}

            {/* Footer: status + access type */}
            <div className="flex items-center justify-between pt-2.5 mt-auto border-t border-border">
              <AppStatusBadge status={app.status} />
              <span
                className={cn(
                  'flex items-center gap-1 text-[11px] font-medium',
                  app.passToken ? 'text-amber-700' : 'text-muted-foreground'
                )}
              >
                {app.passToken ? (
                  <><Lock className="h-3 w-3" aria-hidden /> Token</>
                ) : (
                  <><Globe className="h-3 w-3" aria-hidden /> Livre</>
                )}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function AppsTableSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
          <div className="flex items-start gap-2.5">
            <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-44" />
            </div>
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

export function AppsTableEmpty({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card px-6 py-16 flex flex-col items-center gap-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <AppWindowMac className="h-6 w-6 text-muted-foreground/40" aria-hidden />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">
          {hasFilters ? 'Nenhum aplicativo corresponde aos filtros.' : 'Nenhum aplicativo cadastrado.'}
        </p>
        {hasFilters && (
          <p className="mt-1 text-xs text-muted-foreground">Tente ajustar ou limpar os filtros.</p>
        )}
      </div>
    </div>
  )
}
