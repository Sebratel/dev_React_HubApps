import { cn } from '@/lib/utils'
import type { AnnouncementModel } from '@/types/models'

const TYPE_CONFIG = {
  info: {
    label: 'Informativo',
    card: 'border-border bg-card',
    badge: 'bg-muted text-muted-foreground',
  },
  warning: {
    label: 'Aviso',
    card: 'border-amber-200 bg-amber-50/60',
    badge: 'bg-amber-100 text-amber-800',
  },
  urgent: {
    label: 'Urgente',
    card: 'border-red-200 bg-red-50/60',
    badge: 'bg-red-100 text-destructive',
  },
  success: {
    label: 'Concluído',
    card: 'border-green-200 bg-green-50/60',
    badge: 'bg-green-100 text-green-700',
  },
}

interface AnnouncementCardProps {
  announcement: AnnouncementModel
}

export function AnnouncementCard({ announcement }: AnnouncementCardProps) {
  const config = TYPE_CONFIG[announcement.type] ?? TYPE_CONFIG.info

  const formattedDate = announcement.createdAt.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  return (
    <article className={cn('rounded-xl border p-4 flex flex-col gap-2', config.card)}>
      <div className="flex items-center gap-3 justify-between">
        <span
          className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', config.badge)}
        >
          {config.label}
        </span>
        <time
          className="text-xs text-muted-foreground tabular-nums"
          dateTime={announcement.createdAt.toISOString()}
        >
          {formattedDate}
        </time>
      </div>

      <h3 className="text-sm font-semibold text-foreground leading-snug">
        {announcement.title}
      </h3>

      {announcement.body && (
        <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
          {announcement.body}
        </p>
      )}
    </article>
  )
}
