import { Skeleton } from '@/components/ui/skeleton'
import { AppCard } from './AppCard'
import type { AppItemModel } from '@/types/models'

interface AppGridProps {
  apps: AppItemModel[]
  blockedApps: AppItemModel[]
  favorites: string[]
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
  isLoading,
  emptyMessage = 'Nenhum aplicativo encontrado.',
  onOpen,
  onRequestAccess,
  onToggleFavorite,
}: AppGridProps) {
  if (isLoading) return <LoadingGrid />

  if (apps.length === 0 && blockedApps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <span className="text-4xl">📭</span>
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
          <p className="text-sm font-medium text-muted-foreground">
            Disponíveis para solicitar acesso
          </p>
          <div className={GRID}>
            {blockedApps.map((app) => (
              <AppCard
                key={app.id}
                app={app}
                hasAccess={false}
                isFavorite={false}
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
