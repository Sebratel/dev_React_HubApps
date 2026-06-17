import { useState, useEffect, useRef, useCallback } from 'react'
import {
  motion,
  useMotionValue, useTransform, useMotionTemplate, animate,
  useReducedMotion,
  type MotionValue,
} from 'framer-motion'
import { ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { HighlightModel } from '@/types/models'

const CARD_RATIO = 0.40
const ROT_DEG   = 22

// ── Single card — hooks at top level so rules of hooks are respected ──────────
interface CardProps {
  item:       HighlightModel
  idx:        number
  n:          number
  pos:        MotionValue<number>
  cardW:      number
  cardH:      number
  step:       number
  onNavigate: (idx: number) => void
}

function CarouselCard({ item, idx, n, pos, cardW, cardH, step, onNavigate }: CardProps) {
  const reduced = useReducedMotion()
  const [hover, setHover]       = useState(false)
  const [isCenter, setIsCenter] = useState(false)

  // d = circular distance from pos to idx, range (-n/2, n/2]
  const d = useTransform(pos, (p) => {
    const raw = ((idx - p) % n + n) % n
    return raw > n / 2 ? raw - n : raw
  })

  // Track whether this card is the centered one (for hover behaviour + cursor)
  useEffect(() => {
    const update = (v: number) => setIsCenter(Math.abs(v) < 0.35)
    update(d.get())
    return d.on('change', update)
  }, [d])

  const x       = useTransform(d, v => v * step)
  const rotY    = useTransform(d, v => reduced ? 0 : -v * ROT_DEG)
  // translateZ — pushes side cards physically back in 3D space (real depth via container perspective)
  const z       = useTransform(d, v => reduced ? 0 : -Math.abs(v) * 90)
  // stronger size hierarchy: 1 at center, 0.68 at ±1 — the grow-to-center is more dramatic
  const scale   = useTransform(d, [-2, -1, 0, 1, 2], [0.56, 0.68, 1, 0.68, 0.56])
  // fade: side cards stay clearly visible (0.85); reaches 0 exactly at ±1.5 (circular jump point) so the wrap is never seen
  const opacity = useTransform(d, [-1.5, -1.1, -1, 0, 1, 1.1, 1.5], [0, 0.85, 0.85, 1, 0.85, 0.85, 0])
  const zIdx    = useTransform(d, v => Math.round(20 - Math.abs(v) * 6))
  // content visible only when near center
  const contentOpacity = useTransform(d, [-0.6, -0.1, 0.1, 0.6], [0, 1, 1, 0])
  // side cards get progressively blurred — sharp at center, hazy at the sides (sense of surprise)
  const blurPx = useTransform(d, [-1, -0.45, 0, 0.45, 1], [7, 0, 0, 0, 7])
  const filter = useMotionTemplate`blur(${blurPx}px)`
  // depth shading — side cards recede into shadow as they move away from center
  const shadeOpacity = useTransform(d, v => Math.min(Math.abs(v), 1) * 0.5)

  const lifted = hover && isCenter

  return (
    <motion.div
      style={{
        position: 'absolute',
        width:  cardW,
        height: cardH,
        left:   '50%',
        marginLeft: -cardW / 2,
        borderRadius: 20,
        overflow: 'hidden',
        willChange: 'transform, opacity, filter',
        cursor: isCenter ? 'default' : 'pointer',
        x,
        z,
        rotateY: rotY,
        scale,
        opacity,
        zIndex: zIdx,
        filter,
        transformStyle: 'preserve-3d',
      }}
      animate={{
        boxShadow: lifted
          ? '0 28px 60px -18px rgba(0,0,0,0.55)'
          : '0 12px 36px -16px rgba(0,0,0,0.40)',
      }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onNavigate(idx)}
    >
      {/* Dark base */}
      <div className="absolute inset-0 bg-neutral-900" aria-hidden />

      {/* Blurred colour backdrop */}
      <img
        src={item.imageUrl}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover scale-150"
        style={{ filter: 'blur(64px)', opacity: 0.55 }}
        draggable={false}
      />

      {/* Main image — gentle Ken Burns zoom on hover */}
      <img
        src={item.imageUrl}
        alt={item.title}
        className="absolute inset-0 h-full w-full"
        style={{
          objectFit:     item.objectFit ?? 'cover',
          objectPosition: item.objectFit === 'contain' ? 'center' : (item.objectPosition ?? 'center'),
          transform: lifted ? 'scale(1.06)' : 'scale(1)',
          transition: 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        draggable={false}
      />

      {/* Bottom-left gradient for text readability — deepens slightly on hover */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          background: 'linear-gradient(170deg, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.78) 100%)',
          opacity: lifted ? 1 : 0.9,
        }}
        aria-hidden
      />

      {/* Depth shade — side cards recede into shadow */}
      <motion.div
        className="pointer-events-none absolute inset-0 bg-neutral-950"
        style={{ opacity: shadeOpacity }}
        aria-hidden
      />

      {/* Top-right glass sheen */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 45%)' }}
        aria-hidden
      />

      {/* Content — fades in only when card is at center; lifts up slightly on hover */}
      <motion.div
        className="absolute inset-0 flex flex-col justify-end gap-3 p-7"
        style={{ opacity: contentOpacity }}
        animate={{ y: lifted ? -6 : 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        {item.badgeText && (
          <span className="inline-flex self-start items-center rounded-full bg-primary px-3 py-1 text-[10px] font-bold text-primary-foreground tracking-[0.1em] uppercase shadow-sm">
            {item.badgeText}
          </span>
        )}

        <h3 className="text-xl font-bold text-white leading-snug max-w-md drop-shadow-md">
          {item.title}
        </h3>

        {item.description && (
          <p className="text-sm text-white/80 max-w-sm leading-relaxed line-clamp-2 drop-shadow">
            {item.description}
          </p>
        )}

        {item.ctaLabel && item.ctaUrl && (
          <a
            href={item.ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'mt-1 inline-flex self-start items-center gap-1.5',
              'rounded-xl bg-primary px-5 py-2.5',
              'text-sm font-bold text-primary-foreground',
              'shadow-lg transition-opacity duration-150 hover:opacity-90 active:opacity-80',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {item.ctaLabel}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        )}
      </motion.div>
    </motion.div>
  )
}

// ── Main banner ───────────────────────────────────────────────────────────────
interface FeaturedBannerProps {
  highlights: HighlightModel[]
}

export function FeaturedBanner({ highlights }: FeaturedBannerProps) {
  const n             = highlights.length
  const reduced       = useReducedMotion()
  const [hovered, setHovered] = useState(false)
  const containerRef  = useRef<HTMLDivElement>(null)
  const [cw, setCw]   = useState(900)

  // Continuous position — never wraps, just keeps growing/shrinking
  const pos      = useMotionValue(0)
  const animRef  = useRef<ReturnType<typeof animate> | null>(null)

  // Active index for dots — derived from pos
  const [activeIdx, setActiveIdx] = useState(0)
  useEffect(() => {
    return pos.on('change', (p) => {
      // %n AFTER rounding — rounding (((p%n)+n)%n) alone can yield n (out of bounds) near the wrap
      setActiveIdx(Math.round(((p % n) + n) % n) % n)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n])

  // Measure container width
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    setCw(el.offsetWidth)
    const ro = new ResizeObserver(() => setCw(el.offsetWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const cardW = cw * CARD_RATIO
  const cardH = Math.round(cardW * (9 / 16))
  const step  = cardW

  // Navigate — animate continuous position
  const navigateTo = useCallback((newPos: number) => {
    animRef.current?.stop()
    animRef.current = animate(pos, newPos, {
      duration: reduced ? 0 : 0.48,
      ease: [0.33, 1, 0.68, 1], // cubic-bezier easeOutCubic
    })
  }, [pos, reduced])

  const goTo = useCallback((targetIdx: number) => {
    const current = pos.get()
    const currentIdx = Math.round(((current % n) + n) % n) % n
    let delta = targetIdx - currentIdx
    if (delta > n / 2) delta -= n
    if (delta < -n / 2) delta += n
    navigateTo(current + delta)
  }, [pos, n, navigateTo])

  const prev = useCallback(() => navigateTo(pos.get() - 1), [pos, navigateTo])
  const next = useCallback(() => navigateTo(pos.get() + 1), [pos, navigateTo])

  // Auto-play
  useEffect(() => {
    if (n <= 1 || hovered || reduced) return
    const id = setInterval(() => navigateTo(pos.get() + 1), 6000)
    return () => clearInterval(id)
  }, [n, hovered, reduced, pos, navigateTo])

  if (!n) return null

  return (
    <motion.section
      aria-label="Destaques"
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Header + dots */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
          <span className="inline-block h-5 w-1 rounded-full bg-primary" aria-hidden />
          Destaques
        </h2>

        {n > 1 && (
          <div className="flex items-center gap-1.5">
            {highlights.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={cn(
                  'rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  i === activeIdx
                    ? 'w-5 h-1.5 bg-foreground'
                    : 'w-1.5 h-1.5 bg-border hover:bg-muted-foreground',
                )}
                aria-label={`Ver destaque ${i + 1}`}
                aria-current={i === activeIdx ? 'true' : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Stage — modern ambient backdrop + carousel viewport */}
      <div className="relative">
        {/* Ambient stage — clean cream canvas with a soft amber spotlight on the center card */}
        <div className="pointer-events-none absolute -inset-x-5 -inset-y-3 z-0 overflow-hidden rounded-[28px]">
          {/* Subtle dotted grid texture — modern, barely-there */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(hsl(var(--foreground) / 0.07) 1px, transparent 1.4px)',
              backgroundSize: '22px 22px',
              maskImage: 'radial-gradient(130% 95% at 50% 50%, #000 35%, transparent 78%)',
              WebkitMaskImage: 'radial-gradient(130% 95% at 50% 50%, #000 35%, transparent 78%)',
            }}
          />

          {/* Warm amber spotlight focusing the center card */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(58% 78% at 50% 42%, rgba(255,176,0,0.18) 0%, rgba(255,176,0,0.06) 38%, transparent 72%)',
            }}
          />
        </div>

        {/* Carousel viewport */}
        <div
          ref={containerRef}
          className="relative z-10 select-none"
          style={{ height: cardH, perspective: '1400px', overflow: 'hidden' }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
        {highlights.map((item, i) => (
          <CarouselCard
            key={item.id}
            item={item}
            idx={i}
            n={n}
            pos={pos}
            cardW={cardW}
            cardH={cardH}
            step={step}
            onNavigate={(idx) => {
              const current = pos.get()
              const currentIdx = Math.round(((current % n) + n) % n) % n
              if (idx !== currentIdx) {
                let delta = idx - currentIdx
                if (delta > n / 2) delta -= n
                if (delta < -n / 2) delta += n
                navigateTo(current + delta)
              }
            }}
          />
        ))}

        {/* Navigation arrows */}
        {n > 1 && (
          <>
            <button
              onClick={prev}
              className={cn(
                'absolute left-3 top-1/2 -translate-y-1/2 z-40',
                'flex h-10 w-10 items-center justify-center rounded-full',
                'bg-card/80 border border-border/60 shadow-xl backdrop-blur-md',
                'text-foreground transition-all duration-150',
                'hover:bg-card hover:scale-105 active:scale-95',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
              aria-label="Destaque anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={next}
              className={cn(
                'absolute right-3 top-1/2 -translate-y-1/2 z-40',
                'flex h-10 w-10 items-center justify-center rounded-full',
                'bg-card/80 border border-border/60 shadow-xl backdrop-blur-md',
                'text-foreground transition-all duration-150',
                'hover:bg-card hover:scale-105 active:scale-95',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
              aria-label="Próximo destaque"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
        </div>
      </div>
    </motion.section>
  )
}
