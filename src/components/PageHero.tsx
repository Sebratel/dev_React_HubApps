import { useEffect, useState, type ReactNode } from 'react'
import { motion, useReducedMotion, useMotionValue, animate } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// Número que anima contando de 0 até o valor
function AnimatedNumber({ value }: { value: number }) {
  const reduced = useReducedMotion()
  const mv = useMotionValue(0)
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (reduced) {
      setDisplay(value)
      return
    }
    const controls = animate(mv, value, { duration: 0.8, ease: [0.22, 1, 0.36, 1] })
    const unsub = mv.on('change', (v) => setDisplay(Math.round(v)))
    return () => {
      controls.stop()
      unsub()
    }
  }, [value, reduced, mv])

  return <>{display}</>
}

export interface HeroStat {
  icon: LucideIcon
  value: number
  label: string
  tone?: 'primary' | 'amber' | 'green' | 'red' | 'muted'
}

const TONE_CLASSES: Record<NonNullable<HeroStat['tone']>, string> = {
  primary: 'bg-primary/12 text-primary',
  amber:   'bg-amber-100 text-amber-700',
  green:   'bg-green-100 text-green-700',
  red:     'bg-red-100 text-red-600',
  muted:   'bg-muted text-muted-foreground',
}

function StatTile({ stat, delay }: { stat: HeroStat; delay: number }) {
  const reduced = useReducedMotion()
  const Icon = stat.icon
  return (
    <motion.div
      className="group flex items-center gap-3 rounded-2xl border border-white/55 bg-white/45 px-4 py-2.5 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-white/70 hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.18)]"
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: reduced ? 0 : delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110', TONE_CLASSES[stat.tone ?? 'primary'])}>
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-lg font-bold tabular-nums text-foreground">
          <AnimatedNumber value={stat.value} />
        </span>
        <span className="text-xs text-muted-foreground">{stat.label}</span>
      </div>
    </motion.div>
  )
}

interface PageHeroProps {
  icon: LucideIcon
  title: string
  subtitle?: string
  /** Right-aligned actions (buttons). */
  actions?: ReactNode
  /** Stat tiles shown below the title. */
  stats?: HeroStat[]
  className?: string
}

/**
 * Shared frosted-glass page header — matches the dashboard hero language.
 * Leading icon tile, title + subtitle, optional actions and animated stat tiles.
 */
export function PageHero({ icon: Icon, title, subtitle, actions, stats, className }: PageHeroProps) {
  const reduced = useReducedMotion()

  return (
    <motion.section
      className={cn('relative overflow-hidden rounded-3xl', className)}
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.42)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.6)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.85)',
      }}
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Warm amber glow */}
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full"
        style={{ background: 'hsl(var(--primary) / 0.10)', filter: 'blur(60px)' }}
        aria-hidden
      />
      {/* Subtle dotted texture */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(hsl(var(--foreground) / 0.05) 1px, transparent 1.4px)',
          backgroundSize: '22px 22px',
          maskImage: 'radial-gradient(120% 90% at 80% 0%, #000 20%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(120% 90% at 80% 0%, #000 20%, transparent 70%)',
        }}
        aria-hidden
      />

      <div className="relative flex flex-col gap-5 p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Leading icon tile */}
            <div className="relative shrink-0">
              <div
                className="absolute -inset-1 rounded-2xl"
                style={{ background: 'hsl(var(--primary) / 0.18)', filter: 'blur(8px)' }}
                aria-hidden
              />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/70 bg-primary/15 text-primary shadow-sm">
                <Icon className="h-6 w-6" aria-hidden />
              </div>
            </div>

            <motion.div
              className="flex flex-col gap-1"
              initial={reduced ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: reduced ? 0 : 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              <h1 className="text-2xl font-bold leading-tight tracking-tight text-foreground">{title}</h1>
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </motion.div>
          </div>

          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>

        {stats && stats.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {stats.map((s, i) => (
              <StatTile key={s.label} stat={s} delay={0.14 + i * 0.07} />
            ))}
          </div>
        )}
      </div>
    </motion.section>
  )
}
