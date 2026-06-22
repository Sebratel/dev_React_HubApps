import { motion, useReducedMotion } from 'framer-motion'
import { Lock, Clock3, Star, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { AppIcon } from '@/components/app-icon'
import { cn } from '@/lib/utils'
import type { AppItemModel } from '@/types/models'

const STRIPE_COLOR_MAP: Record<string, string> = {
  amber: '#FFB000',
  dark:  '#2d1800',
  muted: '#94a3b8',
  white: '#d1c9b8',
}

function resolveStripeColor(cardColor?: string | null): string {
  return STRIPE_COLOR_MAP[cardColor ?? ''] ?? '#FFB000'
}

interface BookCardProps {
  app: AppItemModel
  hasAccess: boolean
  isFavorite: boolean
  isPending?: boolean
  index?: number
  onOpen: (app: AppItemModel) => void
  onRequestAccess: (app: AppItemModel) => void
  onToggleFavorite: (appId: string) => void
}

export function BookCard({
  app,
  hasAccess,
  isFavorite,
  isPending = false,
  index = 0,
  onOpen,
  onRequestAccess,
  onToggleFavorite,
}: BookCardProps) {
  const reduced = useReducedMotion()
  const isInteractive = hasAccess || !isPending
  const isLocked = !hasAccess && !isPending

  const initial = (app.name ?? '?').trim()[0]?.toUpperCase() ?? '?'

  function handleClick() {
    if (hasAccess && !isPending) onOpen(app)
    else if (!hasAccess && !isPending) onRequestAccess(app)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'group relative flex min-h-[200px] w-full select-none flex-col gap-3 overflow-hidden rounded-3xl p-5 outline-none bg-white',
        'shadow-[0_4px_20px_-4px_rgba(120,60,0,0.10),0_1px_4px_-1px_rgba(120,60,0,0.06)] transition-shadow duration-200',
        'focus-visible:ring-2 focus-visible:ring-[#FFB000]/50 focus-visible:ring-offset-2',
        isInteractive && 'cursor-pointer',
        !reduced && 'hover:shadow-[0_12px_36px_-8px_rgba(120,60,0,0.18),0_2px_8px_-2px_rgba(120,60,0,0.08)]',
        isLocked && 'opacity-90',
      )}
      initial={reduced ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: reduced ? 0 : Math.min(index * 0.06, 0.42),
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={reduced || !isInteractive ? undefined : { y: -5, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } }}
      whileTap={reduced || !isInteractive ? undefined : { scale: 0.98 }}
      aria-label={`${hasAccess ? 'Abrir' : isPending ? 'Aguardando aprovação para' : 'Solicitar acesso a'} ${app.name}`}
    >
      {/* Faixa colorida no topo */}
      <span
        className="pointer-events-none absolute left-0 right-0 top-0 h-[3px] rounded-t-3xl"
        style={{ background: isLocked ? '#ef4444' : resolveStripeColor(app.cardColor) }}
        aria-hidden
      />

      {/* Inicial em marca d'água */}
      <span
        className="pointer-events-none absolute -bottom-6 -right-2 select-none font-black leading-none text-[#3d1a00]"
        style={{ fontSize: '8rem', opacity: 0.12 }}
        aria-hidden
      >
        {initial}
      </span>

      {/* Topo: ícone + favorito/badge */}
      <div className="relative flex items-start justify-between pt-1">
        <div
          className={cn('shrink-0', !reduced && isInteractive && 'group-hover:animate-icon-jump')}
          style={{ willChange: 'transform' }}
        >
          <AppIcon
            icon={app.icon}
            name={app.name}
            size="lg"
            showBackground
            className="rounded-2xl shadow-[0_4px_14px_-4px_rgba(120,60,0,0.20)]"
          />
        </div>

        <div className="flex flex-col items-end gap-1.5">
          {app.status === 'novo' && (
            <Badge className="h-4 bg-[#FFB000] px-1.5 py-0 text-[9px] leading-4 text-[#2d1800]">Novo</Badge>
          )}
          {hasAccess && (
            <motion.button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(app.id) }}
              whileHover={reduced ? undefined : { scale: 1.2, rotate: 10 }}
              whileTap={reduced ? undefined : { scale: 0.8 }}
              transition={{ duration: 0.12 }}
              className={cn(
                'rounded-full p-0.5 transition-opacity duration-150 text-[#FFB000]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB000]/40',
                isFavorite ? 'opacity-100' : 'opacity-35 group-hover:opacity-80',
              )}
              aria-label={isFavorite ? `Remover ${app.name} dos favoritos` : `Adicionar ${app.name} aos favoritos`}
              aria-pressed={isFavorite}
            >
              <Star className="h-4 w-4" fill={isFavorite ? 'currentColor' : 'none'} aria-hidden />
            </motion.button>
          )}
          {isLocked && (
            <span className="flex items-center gap-1 rounded-full bg-[#FFB000]/10 px-2 py-0.5 text-[#2d1800]/70">
              <Lock className="h-3 w-3" aria-hidden />
              <span className="text-[10px] font-bold">Bloqueado</span>
            </span>
          )}
        </div>
      </div>

      {/* Nome + descrição */}
      <div className="relative flex-1">
        <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-[#2d1800]">
          {app.name}
        </h3>
        {app.description && (
          <p className="mt-1 line-clamp-3 text-[11px] leading-[1.6] text-[#2d1800]/50">
            {app.description.length > 95
              ? app.description.slice(0, 95).trimEnd() + '…'
              : app.description}
          </p>
        )}
      </div>

      {/* CTA */}
      <div className="relative">
        {isPending ? (
          <span
            className="flex items-center justify-center gap-1.5 rounded-xl py-2 text-[11px] font-semibold text-[#2d1800]/45"
            style={{ background: 'rgba(255,176,0,0.08)' }}
          >
            <Clock3 className="h-3 w-3" aria-hidden />
            Aguardando aprovação
          </span>
        ) : isLocked ? (
          <span
            className="flex items-center justify-center gap-1.5 rounded-xl py-2 text-[11px] font-bold"
            style={{ background: '#FFB000', color: '#2d1800' }}
          >
            <Lock className="h-3 w-3" aria-hidden />
            Solicitar acesso
          </span>
        ) : (
          <button
            className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-[11px] font-bold transition-transform duration-150 active:scale-95"
            style={{ background: '#FFB000', color: '#2d1800' }}
            onClick={(e) => { e.stopPropagation(); onOpen(app) }}
            tabIndex={-1}
            aria-hidden
          >
            <ExternalLink className="h-3 w-3" aria-hidden />
            Acessar
          </button>
        )}
      </div>
    </motion.div>
  )
}
