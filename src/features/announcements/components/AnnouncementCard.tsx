import { CalendarDays, AlertTriangle, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AnnouncementModel } from '@/types/models'
import { getTypeMeta, relativeTime, formatFullDate } from '../utils'
import { AnnouncementStatusIndicator } from './AnnouncementStatusIndicator'

interface AnnouncementCardProps {
  announcement: AnnouncementModel
  unread: boolean
  onOpen: () => void
}

/**
 * Wide, list-oriented announcement card. Uses the stretched-link pattern: the
 * title is the single focusable control whose ::after overlay makes the whole
 * card clickable — keyboard accessible with one tab stop per card.
 */
export function AnnouncementCard({ announcement, unread, onOpen }: AnnouncementCardProps) {
  const meta = getTypeMeta(announcement.type)
  const Icon = meta.icon

  return (
    <article
      className={cn(
        'group relative overflow-hidden rounded-2xl border transition-all duration-200',
        'focus-within:ring-2 focus-within:ring-ring',
        'hover:-translate-y-0.5 hover:shadow-[0_10px_28px_-18px_rgba(0,0,0,0.30)]',
        unread ? 'border-primary/40 bg-primary/5' : 'border-border bg-card hover:border-primary/30',
      )}
    >
      {/* Left accent bar — amber & thicker when unread */}
      <span
        className={cn('absolute inset-y-0 left-0', unread ? 'w-1.5 bg-primary' : 'w-1', !unread && meta.accent)}
        aria-hidden
      />

      <div className="flex flex-col gap-3 p-5 pl-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <AnnouncementStatusIndicator unread={unread} />
            <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', meta.iconChip)}>
              <Icon className="h-[18px] w-[18px]" aria-hidden />
            </span>
            <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide', meta.badge)}>
              {meta.label}
            </span>
            {meta.important && (
              <span className="hidden items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary sm:inline-flex">
                <AlertTriangle className="h-3 w-3" aria-hidden />
                Importante
              </span>
            )}
          </div>
          <time
            className="shrink-0 text-xs font-medium text-muted-foreground"
            dateTime={announcement.createdAt.toISOString()}
          >
            {relativeTime(announcement.createdAt)}
          </time>
        </div>

        {/* Title (stretched-link control) */}
        <h3>
          <button
            type="button"
            onClick={onOpen}
            aria-label={`${announcement.title} — ${unread ? 'não lido' : 'lido'}`}
            className={cn(
              'text-left text-base leading-snug text-foreground outline-none transition-colors',
              'after:absolute after:inset-0 after:content-[""]',
              'group-hover:text-primary',
              unread ? 'font-bold' : 'font-semibold',
            )}
          >
            {announcement.title}
          </button>
        </h3>

        {/* Summary */}
        {announcement.body && (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{announcement.body}</p>
        )}

        {/* Footer */}
        <div className="mt-1 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden />
            {formatFullDate(announcement.createdAt)}
          </span>
          <span className="flex items-center gap-1 text-xs font-semibold text-primary" aria-hidden>
            Ler aviso
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </article>
  )
}
