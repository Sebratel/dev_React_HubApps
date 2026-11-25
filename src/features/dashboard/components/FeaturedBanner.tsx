import { useState, useEffect, useRef, useCallback, useId } from 'react'
import { useReducedMotion } from 'framer-motion'
import { ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { resolveAssetUrl } from '@/lib/api'
import type { HighlightModel } from '@/types/models'

const GAP = 12           // px entre os cartões
const MIN_CARD = 300     // largura mínima de um cartão: define quantos cabem lado a lado
const MAX_PER_VIEW = 4
const AUTOPLAY_MS = 6000
const SLIDE_MS = 520

/** Quantos cartões cabem na largura da faixa (1 no celular, até 4 em monitor largo). */
function perViewFor(width: number): number {
  return Math.min(MAX_PER_VIEW, Math.max(1, Math.floor((width + GAP) / (MIN_CARD + GAP))))
}

// ── Cartão ────────────────────────────────────────────────────────────────────
function HighlightCard({ item, isClone }: { item: HighlightModel; isClone: boolean }) {
  const [imgError, setImgError] = useState(false)
  const patternId = useId()
  const hasCta = !!(item.ctaLabel && item.ctaUrl)
  const src = resolveAssetUrl(item.imageUrl)

  return (
    <article
      aria-hidden={isClone || undefined}
      className={cn(
        'group relative h-full overflow-hidden rounded-[14px] bg-neutral-900',
        'shadow-[0_6px_18px_-10px_rgba(0,0,0,0.35)] transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
        'motion-safe:hover:-translate-y-1 hover:shadow-[0_16px_32px_-14px_rgba(0,0,0,0.55)]',
        hasCta && 'cursor-pointer motion-safe:active:scale-[0.985]',
      )}
    >
      {imgError ? (
        // Imagem não carregou (ex.: arquivo só existe em produção): grade sutil no fundo escuro.
        <svg className="absolute inset-0 h-full w-full" aria-hidden>
          <defs>
            <pattern id={patternId} width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="rgba(255,255,255,0.08)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${patternId})`} />
        </svg>
      ) : (
        <>
          {/* Fundo desfocado da própria imagem: preenche as laterais quando ela é "contain". */}
          <img
            src={src}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full scale-150 object-cover"
            style={{ filter: 'blur(40px)', opacity: 0.6 }}
            draggable={false}
          />
          {/* Zoom lento ao passar o mouse */}
          <img
            src={src}
            alt={isClone ? '' : item.title}
            className="absolute inset-0 h-full w-full transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:group-hover:scale-[1.06]"
            style={{
              objectFit: item.objectFit ?? 'cover',
              objectPosition: item.objectFit === 'contain' ? 'center' : (item.objectPosition ?? 'center'),
            }}
            draggable={false}
            onError={() => setImgError(true)}
          />
        </>
      )}

      {/* Escurece o pé do cartão para o texto ficar legível; aprofunda no hover. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-90 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: 'linear-gradient(180deg, rgba(20,12,0,0) 30%, rgba(20,12,0,0.82) 100%)' }}
        aria-hidden
      />

      {/* Clicar em qualquer ponto do cartão abre o destaque (o teclado usa o botão abaixo). */}
      {hasCta && (
        <a
          href={item.ctaUrl ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={-1}
          aria-hidden
          className="absolute inset-0 z-[1]"
        />
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] flex flex-col gap-1.5 p-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:group-hover:-translate-y-0.5">
        {item.badgeText && (
          <span className="self-start rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-primary-foreground">
            {item.badgeText}
          </span>
        )}
        <h3 className="line-clamp-2 text-base font-bold leading-snug text-white drop-shadow">{item.title}</h3>
        {item.description && (
          <p className="line-clamp-1 text-xs text-white/85">{item.description}</p>
        )}
        {hasCta && (
          <a
            href={item.ctaUrl ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            tabIndex={isClone ? -1 : undefined}
            className={cn(
              'pointer-events-auto mt-1 inline-flex self-start items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5',
              'text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
            )}
          >
            {item.ctaLabel}
            <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        )}
      </div>
    </article>
  )
}

// ── Carrossel ─────────────────────────────────────────────────────────────────
interface FeaturedBannerProps {
  highlights: HighlightModel[]
}

/**
 * Carrossel compacto (168 px de altura, largura toda): mostra quantos cartões couberem,
 * gira sozinho a cada 6 s (pausa com o mouse ou o foco em cima e em aba escondida) e
 * desliza sem emenda: os primeiros cartões são repetidos no fim da trilha e, ao chegar
 * neles, a trilha volta ao início sem animação.
 */
export function FeaturedBanner({ highlights }: FeaturedBannerProps) {
  const n = highlights.length
  const reduced = useReducedMotion()
  const viewportRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(1200)
  const [index, setIndex] = useState(0)
  const [animate, setAnimate] = useState(true)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    setWidth(el.offsetWidth)
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => setWidth(el.offsetWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Com 1 destaque, ele ocupa metade da faixa em vez de esticar na largura toda.
  const perView = Math.min(perViewFor(width), Math.max(n, 2))
  const loops = n > 1
  const slides = loops ? [...highlights, ...highlights.slice(0, perView)] : highlights

  // Mudou quantos cabem: volta ao início sem animar.
  useEffect(() => {
    setAnimate(false)
    setIndex(0)
  }, [perView, n])

  const go = useCallback((target: number) => {
    setAnimate(!reduced)
    setIndex(target)
  }, [reduced])

  const next = useCallback(() => {
    if (index >= n) return // ainda encaixando depois do clone; o próximo giro segue normal
    go(index + 1)
  }, [index, n, go])

  const prev = useCallback(() => {
    if (index > 0) { go(index - 1); return }
    // No primeiro: pula sem animar para o clone do fim e desliza um para trás.
    setAnimate(false)
    setIndex(n)
    requestAnimationFrame(() => requestAnimationFrame(() => go(n - 1)))
  }, [index, n, go])

  // Terminou de deslizar até os clones do fim: encaixa no original equivalente, sem animar.
  // (Com `animate` desligado o índice está no clone de propósito: é o salto do `prev`.)
  useEffect(() => {
    if (index < n || !loops || !animate) return
    const t = setTimeout(() => { setAnimate(false); setIndex(index - n) }, SLIDE_MS + 40)
    return () => clearTimeout(t)
  }, [index, n, animate, loops])

  // Reativa a animação depois de um salto sem animação já pintado.
  useEffect(() => {
    if (animate || reduced) return
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setAnimate(true)))
    return () => cancelAnimationFrame(id)
  }, [animate, reduced])

  // Giro automático
  useEffect(() => {
    if (!loops || paused || reduced) return
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') next()
    }, AUTOPLAY_MS)
    return () => clearInterval(id)
  }, [loops, paused, reduced, next])

  if (!n) return null

  const active = ((index % n) + n) % n
  const step = `(100% + ${GAP}px) / ${perView}`

  const arrowButton =
    'flex h-8 w-8 items-center justify-center rounded-lg border border-[#E6DDCB] bg-white text-foreground transition-colors hover:bg-[#F3EDE0] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

  return (
    <section
      aria-label="Destaques"
      aria-roledescription="carrossel"
      className="flex flex-col gap-2.5"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false) }}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-foreground">
          <span className="inline-block h-4 w-[3px] rounded-full bg-primary" aria-hidden />
          Destaques
        </h2>
        {loops && (
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-1.5 sm:flex">
              {highlights.map((h, i) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => go(i)}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    i === active ? 'w-5 bg-foreground' : 'w-1.5 bg-border hover:bg-muted-foreground',
                  )}
                  aria-label={`Ver destaque ${i + 1}`}
                  aria-current={i === active ? 'true' : undefined}
                />
              ))}
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={prev} className={arrowButton} aria-label="Destaque anterior">
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
              <button type="button" onClick={next} className={arrowButton} aria-label="Próximo destaque">
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Folga vertical: o cartão sobe no hover e a sombra não é cortada pela janela do carrossel. */}
      <div ref={viewportRef} className="-my-3 overflow-hidden py-3">
        <div
          className="flex"
          style={{
            gap: GAP,
            transform: `translateX(calc(${-index} * ${step}))`,
            transition: animate && !reduced ? `transform ${SLIDE_MS}ms cubic-bezier(0.33, 1, 0.68, 1)` : 'none',
          }}
        >
          {slides.map((item, i) => (
            <div
              key={`${item.id}-${i}`}
              className="h-[168px] shrink-0"
              style={{ width: `calc((100% - ${(perView - 1) * GAP}px) / ${perView})` }}
            >
              <HighlightCard item={item} isClone={i >= n} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
