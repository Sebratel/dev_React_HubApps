import { Skeleton } from '@/components/ui/skeleton'
import type { AppItemModel } from '@/types/models'
import { AppStatusBadge } from './AppStatusBadge'
import { AppAccessSummary } from './AppAccessSummary'
import { AppActionsMenu } from './AppActionsMenu'

// ─── Props ────────────────────────────────────────────────────────────────────

interface AppsTableProps {
  apps: AppItemModel[]
  onEdit: (app: AppItemModel) => void
  onDeactivate: (app: AppItemModel) => void
  onReactivate: (app: AppItemModel) => void
}

// ─── Main Table ───────────────────────────────────────────────────────────────

export function AppsTable({ apps, onEdit, onDeactivate, onReactivate }: AppsTableProps) {
  return (
    <div role="table" className="rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div
        role="row"
        className="hidden lg:grid grid-cols-[2fr_2fr_1fr_2fr_auto] gap-4 px-4 py-2.5 bg-muted/40 text-xs font-medium text-muted-foreground uppercase tracking-wide"
      >
        <span>Aplicativo</span>
        <span>URL</span>
        <span>Status</span>
        <span>Acesso</span>
        <span className="text-right">Ações</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border">
        {apps.map(app => (
          <div
            key={app.id}
            role="row"
            className="grid grid-cols-1 lg:grid-cols-[2fr_2fr_1fr_2fr_auto] gap-2 lg:gap-4 px-4 py-3 items-center hover:bg-muted/30 transition-colors"
          >
            {/* Name + icon */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xl shrink-0" aria-hidden>
                {app.icon}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{app.name}</p>
                {app.description && (
                  <p className="text-xs text-muted-foreground truncate">{app.description}</p>
                )}
              </div>
            </div>

            {/* URL */}
            <div className="hidden lg:block min-w-0">
              <p className="text-xs text-muted-foreground truncate">{app.url}</p>
            </div>

            {/* Status */}
            <div className="hidden lg:block">
              <AppStatusBadge status={app.status} />
            </div>

            {/* Access summary */}
            <div className="hidden lg:block">
              <AppAccessSummary app={app} />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end">
              <AppActionsMenu
                app={app}
                onEdit={() => onEdit(app)}
                onDeactivate={() => onDeactivate(app)}
                onReactivate={() => onReactivate(app)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function AppsTableSkeleton() {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-2.5 bg-muted/40">
        <Skeleton className="h-3 w-48" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex items-center gap-4">
            <Skeleton className="h-8 w-8 rounded-md shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-36" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full hidden lg:block" />
            <Skeleton className="h-3 w-24 hidden lg:block" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

export function AppsTableEmpty({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="rounded-xl border border-border px-6 py-12 text-center">
      <p className="text-sm font-medium text-foreground">
        {hasFilters ? 'Nenhum aplicativo corresponde aos filtros.' : 'Nenhum aplicativo cadastrado.'}
      </p>
      {hasFilters && (
        <p className="text-xs text-muted-foreground mt-1">
          Tente ajustar ou limpar os filtros.
        </p>
      )}
    </div>
  )
}
