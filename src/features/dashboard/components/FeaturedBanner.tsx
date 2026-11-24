import { useState } from 'react'
import { ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { resolveAssetUrl } from '@/lib/api'
import type { HighlightModel } from '@/types/models'

// Cartões visíveis por largura: 1 no celular, 2 a partir de `sm`, 3 a partir de `lg`.
// O 2º e o 3º só aparecem nessas larguras (classes abaixo), então as setas só fazem
// sentido quando há mais destaques do que cabem na tela.
const VISIBLE_CLASS = ['', 'hidden sm:block', 'hidden lg:block']
function arrowsClass(n: number): string | null {
  if (n <= 1) return null
  if (n === 2) return 'sm:hidden'
  if (n === 3) return 'lg:hidden'
  return ''
}

function HighlightCard({ item, className }: { item: HighlightModel; className?: string }) {
  const [imgError, setImgError] = useState(false)
  const hasCta = !!(item.ctaLabel && item.ctaUrl)

  return (
    <article className={cn('relative h-[168px] overflow-hidden rounded-[14px] bg-neutral-900', className)}>
      {!imgError && (
        <img
          src={resolveAssetUrl(item.imageUrl)}
          alt={item.title}
          className="absolute inset-0 h-full w-full"
          style={{
            objectFit: item.objectFit ?? 'cover',
            objectPosition: item.objectFit === 'contain' ? 'center' : (item.objectPosition ?? 'center'),
          }}
          draggable={false}
          onError={() => setImgError(true)}
        />
      )}

      {/* Faixa escura no pé do cartão: só para o texto ficar legível sobre a foto. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(30,18,0,0) 35%, rgba(30,18,0,0.80) 100%)' }}
        aria-hidden
      />

      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-4">
        {item.badgeText && (
          <span className="self-start rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-primary-foreground">
            {item.badgeText}
          </span>
        )}
        <h3 className="line-clamp-2 text-base font-bold leading-snug text-white">{item.title}</h3>
        {item.description && (
          <p className="line-clamp-1 text-xs text-white/85">{item.description}</p>
        )}
        {hasCta && (
          <a
            href={item.ctaUrl ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'mt-1 inline-flex self-start items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5',
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

interface FeaturedBannerProps {
  highlights: HighlightModel[]
}

export function FeaturedBanner({ highlights }: FeaturedBannerProps) {
  const n = highlights.length
  const [start, setStart] = useState(0)

  if (!n) return null

  const visible = Array.from({ length: Math.min(n, VISIBLE_CLASS.length) }, (_, i) => highlights[(start + i) % n])
  const arrows = arrowsClass(n)
  const step = (delta: number) => setStart((s) => (s + delta + n) % n)

  const arrowButton =
    'flex h-8 w-8 items-center justify-center rounded-lg border border-[#E6DDCB] bg-white text-foreground transition-colors hover:bg-[#F3EDE0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

  return (
    // Altura fixa de 168 px e faixa de no máximo 1.100 px: em monitor largo os cartões não
    // esticam (a imagem cortaria demais) nem empurram os apps para baixo.
    <section aria-label="Destaques" className="flex max-w-[1100px] flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-foreground">
          <span className="inline-block h-4 w-[3px] rounded-full bg-primary" aria-hidden />
          Destaques
        </h2>
        {arrows !== null && (
          <div className={cn('flex items-center gap-1', arrows)}>
            <button type="button" onClick={() => step(-1)} className={arrowButton} aria-label="Destaque anterior">
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <button type="button" onClick={() => step(1)} className={arrowButton} aria-label="Próximo destaque">
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((item, i) => (
          <HighlightCard key={`${item.id}-${i}`} item={item} className={VISIBLE_CLASS[i]} />
        ))}
      </div>
    </section>
  )
}
