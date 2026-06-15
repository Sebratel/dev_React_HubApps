import { motion, useReducedMotion } from 'framer-motion'
import { Star, Lock, Clock3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { AppItemModel } from '@/types/models'

interface AppCardProps {
  app: AppItemModel
  hasAccess: boolean
  isFavorite: boolean
  isPending?: boolean
  index?: number
  onOpen: (app: AppItemModel) => void
  onRequestAccess: (app: AppItemModel) => void
  onToggleFavorite: (appId: string) => void
}

export function AppCard({
  app,
  hasAccess,
  isFavorite,
  isPending = false,
  index = 0,
  onOpen,
  onRequestAccess,
  onToggleFavorite,
}: AppCardProps) {
  const reduced = useReducedMotion()
  const staggerDelay = reduced ? 0 : Math.min(60 + index * 35, 280)

  return (
    <div
      className={cn(
        'group relative flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm min-h-[180px]',
        !reduced && 'animate-fade-in',
        hasAccess && !isPending && [
          'border-border',
          'transition-[transform,box-shadow,border-color] duration-[180ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
          'hover:-translate-y-[3px] hover:shadow-md hover:border-border/60',
        ],
        isPending && 'border-amber-200 bg-amber-50/40',
        !hasAccess && !isPending && [
          'border-border opacity-[0.82]',
          'transition-[transform,box-shadow,border-color,opacity] duration-[180ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
          'hover:-translate-y-[1px] hover:shadow hover:border-border/70 hover:opacity-100',
        ],
      )}
      style={reduced ? undefined : { animationDelay: `${staggerDelay}ms`, animationFillMode: 'both' }}
    >
      {/* Camada 1 — Identidade */}
      <div className="flex items-start justify-between gap-2">
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted text-3xl select-none',
            hasAccess && [
              'transition-transform duration-[180ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
              'group-hover:-translate-y-[1px] group-hover:scale-[1.03]',
            ],
          )}
        >
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
            <motion.button
              onClick={() => onToggleFavorite(app.id)}
              whileHover={reduced ? undefined : { scale: 1.1, rotate: 6 }}
              whileTap={reduced ? undefined : { scale: 0.85 }}
              transition={{ duration: 0.14, ease: [0.4, 0, 0.2, 1] }}
              className={cn(
                'rounded-full p-1 transition-opacity duration-[140ms]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isFavorite
                  ? 'text-primary'
                  : 'text-muted-foreground opacity-100 md:opacity-0 md:group-hover:opacity-100',
              )}
              aria-label={isFavorite ? `Remover ${app.name} dos favoritos` : `Adicionar ${app.name} aos favoritos`}
              aria-pressed={isFavorite}
            >
              <Star className="h-4 w-4" fill={isFavorite ? 'currentColor' : 'none'} aria-hidden />
            </motion.button>
          )}
        </div>
      </div>

      {/* Camada 2 — Informação */}
      <div className="flex flex-1 flex-col gap-1">
        <h3 className="line-clamp-1 text-sm font-semibold leading-tight text-foreground">
          {app.name}
        </h3>
        {app.description && (
          <p
            className={cn(
              'line-clamp-2 text-xs',
              hasAccess ? 'text-muted-foreground' : 'text-muted-foreground/70',
            )}
            title={app.description}
          >
            {app.description}
          </p>
        )}
      </div>

      {/* Camada 3 — Ação */}
      {hasAccess ? (
        <motion.div
          className="mt-auto"
          whileTap={reduced ? undefined : { scale: 0.98 }}
          transition={{ duration: 0.1, ease: [0.4, 0, 1, 1] }}
        >
          <Button size="sm" className="w-full" onClick={() => onOpen(app)}>
            Abrir
          </Button>
        </motion.div>
      ) : isPending ? (
        <motion.div
          className="mt-auto flex items-center justify-center gap-1.5 rounded-md border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-800"
          initial={reduced ? false : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Aguardando aprovação
        </motion.div>
      ) : (
        <motion.div
          className="mt-auto"
          whileTap={reduced ? undefined : { scale: 0.98 }}
          transition={{ duration: 0.1, ease: [0.4, 0, 1, 1] }}
        >
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-1.5"
            onClick={() => onRequestAccess(app)}
          >
            <Lock className="h-3.5 w-3.5" aria-hidden />
            Solicitar acesso
          </Button>
        </motion.div>
      )}
    </div>
  )
}
