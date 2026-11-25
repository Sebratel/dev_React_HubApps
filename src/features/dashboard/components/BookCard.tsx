import { Lock, Clock3, Star } from 'lucide-react'
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
  onOpen: (app: AppItemModel) => void
  onRequestAccess: (app: AppItemModel) => void
  onToggleFavorite: (appId: string) => void
}

/**
 * Cartão de app da home. O cartão inteiro abre o app: o botão do nome se estende por cima
 * do cartão (`after:inset-0`) e só a estrela fica acima dele. A faixa de 3 px no topo é a
 * "Cor da faixa" escolhida no admin (vermelha quando o app está bloqueado).
 */
export function BookCard({
  app,
  hasAccess,
  isFavorite,
  isPending = false,
  onOpen,
  onRequestAccess,
  onToggleFavorite,
}: BookCardProps) {
  const isLocked = !hasAccess && !isPending

  function handleClick() {
    if (hasAccess && !isPending) onOpen(app)
    else if (!hasAccess && !isPending) onRequestAccess(app)
  }

  const label = `${hasAccess ? 'Abrir' : isPending ? 'Aguardando aprovação para' : 'Solicitar acesso a'} ${app.name}`

  return (
    <div
      className={cn(
        'group relative flex min-h-[132px] w-full flex-col gap-2.5 overflow-hidden rounded-[14px] border border-[#EDE6D8] bg-white p-3.5',
        'shadow-[0_1px_3px_rgba(120,60,0,0.06)] transition-[border-color,box-shadow] duration-150',
        'hover:border-[#E3D3AC] hover:shadow-[0_6px_18px_-6px_rgba(120,60,0,0.16)]',
        'focus-within:ring-2 focus-within:ring-[#FFB000]/60',
        isLocked && 'opacity-90',
      )}
    >
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
        style={{ background: isLocked ? '#ef4444' : resolveStripeColor(app.cardColor) }}
        aria-hidden
      />

      <div className="flex items-start justify-between gap-2">
        <AppIcon icon={app.icon} name={app.name} size="sm" showBackground className="rounded-[10px]" />
        <div className="relative z-10 -mr-1.5 -mt-1.5 flex items-center gap-1">
          {app.status === 'novo' && (
            <Badge className="h-4 bg-[#FFB000] px-1.5 py-0 text-[9px] leading-4 text-[#2d1800]">Novo</Badge>
          )}
          {hasAccess && (
            <button
              type="button"
              onClick={() => onToggleFavorite(app.id)}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg text-[#B08A3E] transition-[opacity,background-color] duration-150 hover:bg-[#F3EDE0]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB000]/50',
                isFavorite ? 'opacity-100' : 'opacity-60 group-hover:opacity-100',
              )}
              aria-label={isFavorite ? `Remover ${app.name} dos favoritos` : `Adicionar ${app.name} aos favoritos`}
              aria-pressed={isFavorite}
            >
              <Star className="h-4 w-4" fill={isFavorite ? 'currentColor' : 'none'} aria-hidden />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1">
        <h3 className="text-sm font-bold leading-snug text-[#2d1800]">
          {/* O corte em 2 linhas fica no <span>: no <h3> ele não alcança o texto de dentro do botão. */}
          <button
            type="button"
            onClick={handleClick}
            disabled={isPending}
            aria-label={label}
            title={app.name}
            className="block w-full text-left outline-none after:absolute after:inset-0 after:content-[''] disabled:cursor-default"
          >
            <span className="line-clamp-2">{app.name}</span>
          </button>
        </h3>
        {app.description && (
          <p className="line-clamp-2 text-xs leading-snug text-[#2d1800]/65">{app.description}</p>
        )}
      </div>

      {isPending && (
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#2d1800]/65">
          <Clock3 className="h-3 w-3" aria-hidden />
          Aguardando aprovação
        </span>
      )}
      {isLocked && (
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#2d1800]">
          <Lock className="h-3 w-3" aria-hidden />
          Solicitar acesso
        </span>
      )}
    </div>
  )
}
