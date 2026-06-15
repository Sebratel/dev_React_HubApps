import { motion, useReducedMotion } from 'framer-motion'
import { PackageOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
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

// Skeleton estruturado que espelha o layout real do AppCard
function CardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 min-h-[180px]">
      <div className="flex items-start justify-between">
        <div className="h-12 w-12 rounded-xl bg-muted animate-pulse" />
        <div className="h-4 w-4 rounded-full bg-muted animate-pulse mt-0.5" />
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="h-3.5 w-3/4 rounded bg-muted animate-pulse" />
        <div className="h-3 w-full rounded bg-muted animate-pulse" />
        <div className="h-3 w-2/3 rounded bg-muted animate-pulse" />
      </div>
      <div className="h-9 w-full rounded-md bg-muted animate-pulse mt-auto" />
    </div>
  )
}

function LoadingGrid() {
  return (
    <div className={GRID}>
      {Array.from({ length: 8 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}

// Header de seção com menor peso visual — usado para "Solicitar acesso"
function SectionHeader({ title, count }: { title: string; count: number }) {
  const reduced = useReducedMotion()
  return (
    <div className={cn('mb-4', !reduced && 'animate-fade-in')} style={reduced ? undefined : { animationFillMode: 'both' }}>
      <div className="flex items-baseline justify-between pb-2">
        <span className="text-sm font-semibold text-muted-foreground">{title}</span>
        <span className="text-xs text-muted-foreground/70">
          {count} app{count !== 1 ? 's' : ''}
        </span>
      </div>
      <motion.div
        className="h-px bg-border"
        style={{ originX: 0 }}
        initial={reduced ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.28, delay: reduced ? 0 : 0.04, ease: [0.22, 1, 0.36, 1] }}
      />
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
  const reduced = useReducedMotion()

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
          {apps.map((app, i) => (
            <AppCard
              key={app.id}
              app={app}
              hasAccess={true}
              isFavorite={favorites.includes(app.id)}
              index={i}
              onOpen={onOpen}
              onRequestAccess={onRequestAccess}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      )}

      {blockedApps.length > 0 && (
        <div className="flex flex-col gap-3">
          <SectionHeader title="Solicitar acesso" count={blockedApps.length} />
          <div className={GRID}>
            {blockedApps.map((app, i) => (
              <AppCard
                key={app.id}
                app={app}
                hasAccess={false}
                isFavorite={false}
                isPending={pendingAppIds.has(app.id)}
                index={reduced ? 0 : i}
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
