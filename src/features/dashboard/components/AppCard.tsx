import { Star, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { AppItemModel } from '@/types/models'

interface AppCardProps {
  app: AppItemModel
  hasAccess: boolean
  isFavorite: boolean
  onOpen: (app: AppItemModel) => void
  onRequestAccess: (app: AppItemModel) => void
  onToggleFavorite: (appId: string) => void
}

export function AppCard({
  app,
  hasAccess,
  isFavorite,
  onOpen,
  onRequestAccess,
  onToggleFavorite,
}: AppCardProps) {
  return (
    <div
      className={cn(
        'group relative flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm',
        'transition-all duration-200 hover:shadow-md hover:border-border/80',
        !hasAccess && 'opacity-70'
      )}
    >
      {/* Icon + badge + favorite */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted text-3xl select-none">
          {app.icon || '📦'}
        </div>
        <div className="flex items-center gap-1">
          {app.status === 'novo' && (
            <Badge className="text-xs px-1.5 py-0.5">
              Novo
              <span className="sr-only"> — aplicativo recém-adicionado</span>
            </Badge>
          )}
          {hasAccess && (
            <button
              onClick={() => onToggleFavorite(app.id)}
              className={cn(
                'rounded-full p-1 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isFavorite
                  ? 'text-primary'
                  : 'text-muted-foreground opacity-0 group-hover:opacity-100'
              )}
              aria-label={
                isFavorite
                  ? `Remover ${app.name} dos favoritos`
                  : `Adicionar ${app.name} aos favoritos`
              }
              aria-pressed={isFavorite}
            >
              <Star className="h-4 w-4" fill={isFavorite ? 'currentColor' : 'none'} aria-hidden />
            </button>
          )}
        </div>
      </div>

      {/* Name + description */}
      <div className="flex flex-1 flex-col gap-1">
        <h3 className="line-clamp-1 text-sm font-semibold leading-tight text-foreground">
          {app.name}
        </h3>
        {app.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground" title={app.description}>
            {app.description}
          </p>
        )}
      </div>

      {/* Action */}
      {hasAccess ? (
        <Button size="sm" className="mt-auto w-full" onClick={() => onOpen(app)}>
          Abrir
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="mt-auto w-full gap-1.5"
          onClick={() => onRequestAccess(app)}
        >
          <Lock className="h-3.5 w-3.5" aria-hidden />
          Solicitar acesso
        </Button>
      )}
    </div>
  )
}
