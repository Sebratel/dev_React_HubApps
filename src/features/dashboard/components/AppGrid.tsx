import { PackageOpen } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { AppCard } from './AppCard'
import type { AppItemModel } from '@/types/models'

interface AppGridProps {
  apps: AppItemModel[]
  blockedApps: AppItemModel[]
  favorites: string[]
  pendingAppIds: Set<string>
  isLoading: boolean
  emptyMessage?: string
  onOpen: (app: AppItemModel) => void
  onRequestAccess: (app: AppItemModel) => void
  onToggleFavorite: (appId: string) => void
}

const GRID = 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4'

function LoadingGrid() {
  return (
    <div className={GRID}>
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-[188px] rounded-xl" />
      ))}
    </div>
  )
}

export function AppGrid({
  apps,
  blockedApps,
  favorites,
  pendingAppIds,
  isLoading,
  emptyMessage = 'Nenhum aplicativo encontrado.',
  onOpen,
  onRequestAccess,
  onToggleFavorite,
}: AppGridProps) {
  if (isLoading) return <LoadingGrid />

  if (apps.length === 0 && blockedApps.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 py-20 text-center"
        role="status"
      >
        <PackageOpen className="h-12 w-12 text-muted-foreground/40" aria-hidden />
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {apps.length > 0 && (
        <div className={GRID}>
          {apps.map((app) => (
            <AppCard
              key={app.id}
              app={app}
              hasAccess={true}
              isFavorite={favorites.includes(app.id)}
              onOpen={onOpen}
              onRequestAccess={onRequestAccess}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      )}

      {blockedApps.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between pb-2 border-b border-border">
            <span className="text-sm font-semibold text-foreground">Solicitar acesso</span>
            <span className="text-xs text-muted-foreground">
              {blockedApps.length} app{blockedApps.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className={GRID}>
            {blockedApps.map((app) => (
              <AppCard
                key={app.id}
                app={app}
                hasAccess={false}
                isFavorite={false}
                isPending={pendingAppIds.has(app.id)}
                onOpen={onOpen}
                onRequestAccess={onRequestAccess}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
