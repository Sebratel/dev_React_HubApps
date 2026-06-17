import { motion, useReducedMotion } from 'framer-motion'
import { Lock, Clock3, Star, ExternalLink, Wifi, SignalHigh, BatteryMedium } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { AppIcon } from '@/components/app-icon'
import { cn } from '@/lib/utils'
import type { AppItemModel } from '@/types/models'

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
  const canProject = !reduced && hasAccess

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
    <div style={{ perspective: '1100px' }}>
      <motion.div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          'group relative mx-auto w-full max-w-[185px] select-none outline-none',
          'aspect-[10/19] rounded-[2rem]',
          'bg-foreground shadow-[0_12px_30px_-10px_rgba(0,0,0,0.45)]',
          'transition-shadow duration-200',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          isInteractive && 'cursor-pointer',
          !hasAccess && !isPending && 'opacity-80',
          !reduced && !hasAccess && !isPending && 'hover:opacity-100',
          !reduced && hasAccess && 'hover:shadow-[0_28px_50px_-12px_rgba(0,0,0,0.55)]',
        )}
        style={{ transformStyle: 'preserve-3d' }}
        initial={reduced ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.3,
          delay: reduced ? 0 : Math.min(index * 0.06, 0.42),
          ease: [0.22, 1, 0.36, 1],
        }}
        whileHover={
          reduced || !isInteractive
            ? undefined
            : { y: -10, scale: 1.07, rotateX: 6, rotateY: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } }
        }
        whileTap={reduced || !isInteractive ? undefined : { scale: 0.97 }}
        aria-label={`${hasAccess ? 'Abrir' : isPending ? 'Aguardando aprovação para' : 'Solicitar acesso a'} ${app.name}`}
      >
        {/* ── Side buttons (titanium frame) ─────────────────────────────────── */}
        <span className="pointer-events-none absolute -left-[2px] top-[20%] h-6 w-[3px] rounded-l-sm bg-foreground" aria-hidden />
        <span className="pointer-events-none absolute -left-[2px] top-[31%] h-9 w-[3px] rounded-l-sm bg-foreground" aria-hidden />
        <span className="pointer-events-none absolute -right-[2px] top-[26%] h-12 w-[3px] rounded-r-sm bg-foreground" aria-hidden />

        {/* ── Screen background ────────────────────────────────────────────── */}
        <div
          className="absolute inset-[5px] overflow-hidden rounded-[1.65rem]"
          style={{ background: '#FFF8EE' }}
          aria-hidden
        >
          {/* Amber header zone — top 38% */}
          <div
            className="absolute inset-x-0 top-0 h-[38%]"
            style={{ background: 'linear-gradient(148deg, #FFD580 0%, #FFA830 100%)', boxShadow: '0 2px 10px rgba(120,60,0,0.14)' }}
          />
          {/* Screen glare */}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, transparent 22%)' }}
          />
          {/* Status bar — warm dark tones on the golden screen */}
          <div
            className="absolute inset-x-0 top-[7px] flex items-center justify-between px-3.5"
            style={{ color: 'rgba(45,24,0,0.72)' }}
          >
            <div className="flex items-center gap-1 opacity-80">
              <SignalHigh className="h-3 w-3" aria-hidden />
              <Wifi className="h-3 w-3" aria-hidden />
            </div>
            <BatteryMedium className="h-3.5 w-3.5 opacity-80" aria-hidden />
          </div>
          {/* Dynamic Island */}
          <div className="absolute left-1/2 top-2 h-[18px] w-[52px] -translate-x-1/2 rounded-full bg-black/90 shadow-inner">
            <span className="absolute right-2.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-white/15" />
          </div>
          {/* Home indicator */}
          <div
            className="absolute bottom-2 left-1/2 h-1 w-1/3 -translate-x-1/2 rounded-full"
            style={{ background: 'rgba(80,40,0,0.18)' }}
          />
        </div>

        {/* ── Content layer (NOT clipped) — elements project in 3D on hover ── */}
        <div className="absolute inset-[5px] z-10 flex flex-col [transform-style:preserve-3d]">

          {/* Projector light halo */}
          {canProject && (
            <div
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-[350ms] [transform:translateZ(18px)] group-hover:opacity-100"
              style={{
                background:
                  'radial-gradient(55% 45% at 50% 40%, rgba(255,176,0,0.32) 0%, rgba(255,176,0,0.10) 40%, transparent 72%)',
                filter: 'blur(10px)',
              }}
              aria-hidden
            />
          )}

          {/* Badge + favorite — top-right */}
          <div className="absolute right-2.5 top-[30px] z-20 flex flex-col items-end gap-1">
            {app.status === 'novo' && (
              <Badge className="h-4 px-1.5 py-0 text-[9px] leading-4">Novo</Badge>
            )}
            {hasAccess && (
              <motion.button
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(app.id) }}
                whileHover={reduced ? undefined : { scale: 1.2, rotate: 10 }}
                whileTap={reduced ? undefined : { scale: 0.8 }}
                transition={{ duration: 0.12 }}
                className={cn(
                  'rounded-full p-0.5 transition-opacity duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isFavorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-60',
                )}
                style={{ color: 'rgba(80,40,0,0.75)' }}
                aria-label={isFavorite ? `Remover ${app.name} dos favoritos` : `Adicionar ${app.name} aos favoritos`}
                aria-pressed={isFavorite}
              >
                <Star className="h-3.5 w-3.5" fill={isFavorite ? 'currentColor' : 'none'} aria-hidden />
              </motion.button>
            )}
          </div>

          {/* Spacer — aligns icon center with header/body boundary */}
          <div className="h-[38%] shrink-0" />

          {/* Icon — white translucent squircle with shimmer sweep */}
          <div className="flex justify-center" style={{ marginTop: '-2rem' }}>
            <div
              className={cn(
                '[transform:translateZ(0px)] [transform-style:preserve-3d]',
                'transition-transform duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
                canProject && 'group-hover:[transform:translateZ(50px)]',
              )}
              style={{ willChange: 'transform' }}
            >
              <div className="relative h-16 w-16">
                <AppIcon
                  icon={app.icon}
                  name={app.name}
                  size="lg"
                  showBackground={false}
                  className={cn(
                    'rounded-2xl bg-white shadow-[0_8px_24px_-4px_rgba(100,50,0,0.32)] ring-2 ring-white',
                    canProject && 'group-hover:shadow-[0_14px_32px_-6px_rgba(100,50,0,0.42)]',
                  )}
                />
                {!reduced && !isLocked && (
                  <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden>
                    <motion.div
                      className="absolute inset-y-0 w-[45%]"
                      style={{
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.72), transparent)',
                        skewX: -12,
                      }}
                      animate={{ x: ['-120%', '260%'] }}
                      transition={{
                        duration: 0.9,
                        repeat: Infinity,
                        repeatDelay: 3.8,
                        ease: [0.4, 0, 0.6, 1],
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Title + description — warm dark amber tones */}
          <div
            className={cn(
              'mt-3 px-3 text-center [transform:translateZ(0px)]',
              'transition-transform duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
              canProject && 'group-hover:[transform:translateZ(28px)]',
            )}
            style={{ willChange: 'transform' }}
          >
            <h3
              className="line-clamp-2 text-[14px] font-bold leading-snug"
              style={{ color: '#2d1800' }}
            >
              {app.name}
            </h3>
            {app.description && (
              <p
                className="mt-1.5 text-[11px] leading-[1.55]"
                style={{ color: 'rgba(60,30,0,0.50)' }}
              >
                {app.description.length > 95
                  ? app.description.slice(0, 95).trimEnd() + '…'
                  : app.description}
              </p>
            )}
          </div>

          {/* Flex spacer */}
          <div className="min-h-0 flex-1" />

          {/* CTA — dark background, amber text */}
          <div
            className={cn(
              'px-2.5 pb-2.5 [transform:translateZ(0px)]',
              'transition-transform duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
              canProject && 'group-hover:[transform:translateZ(62px)]',
            )}
            style={{ willChange: 'transform' }}
          >
            {isPending ? (
              <span
                className="flex items-center justify-center gap-1.5 rounded-xl border py-2 text-[11px] font-semibold"
                style={{ background: 'rgba(45,24,0,0.07)', color: 'rgba(45,24,0,0.52)', borderColor: 'rgba(45,24,0,0.14)' }}
              >
                <Clock3 className="h-3 w-3" aria-hidden />
                Aguardando aprovação
              </span>
            ) : hasAccess ? (
              <button
                className="mx-auto flex w-[84%] items-center justify-center gap-1.5 rounded-full py-2 text-[11px] font-bold transition-transform duration-150 active:scale-95"
                style={{ background: '#2d1800', color: '#FFB000', boxShadow: '0 4px 14px rgba(45,24,0,0.38)' }}
                onClick={(e) => { e.stopPropagation(); onOpen(app) }}
                tabIndex={-1}
                aria-hidden
              >
                <ExternalLink className="h-3 w-3" aria-hidden />
                Acessar
              </button>
            ) : null}
          </div>

          {/* ── Lock screen overlay ────────────────────────────────────────────── */}
          {isLocked && (
            <div
              className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 rounded-[1.65rem] px-4 text-center"
              style={{ backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', background: 'rgba(30,12,0,0.72)' }}
              aria-hidden
            >
              <div className="relative flex items-center justify-center">
                <span
                  className="absolute h-20 w-20 rounded-3xl"
                  style={{
                    background: 'radial-gradient(circle, rgba(255,176,0,0.55) 0%, transparent 72%)',
                    filter: 'blur(10px)',
                  }}
                />
                <AppIcon
                  icon={app.icon}
                  name={app.name}
                  size="lg"
                  showBackground
                  className="relative rounded-2xl shadow-[0_12px_28px_-8px_rgba(0,0,0,0.55)] ring-2 ring-amber-300/30"
                />
              </div>
              <span className="max-w-full truncate text-[14px] font-extrabold leading-tight text-amber-50 drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]">
                {app.name}
              </span>
              <span className="h-px w-12 rounded-full bg-amber-400/25" />
              <div className="flex items-center gap-1.5 rounded-full bg-amber-950/60 px-3 py-1.5 shadow-md backdrop-blur-sm">
                <Lock className="h-3 w-3 text-amber-300/90" aria-hidden />
                <span className="text-[11px] font-bold text-amber-200">Bloqueado</span>
              </div>
              <span className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[11px] font-bold text-primary-foreground shadow-lg">
                Solicitar acesso
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
