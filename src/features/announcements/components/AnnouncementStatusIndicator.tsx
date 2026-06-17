import { cn } from '@/lib/utils'

interface AnnouncementStatusIndicatorProps {
  unread: boolean
  className?: string
}

/**
 * Small dot marking an unread announcement. Carries its own sr-only label so
 * read/unread is perceivable without relying on color alone.
 */
export function AnnouncementStatusIndicator({ unread, className }: AnnouncementStatusIndicatorProps) {
  return (
    <span className={cn('flex items-center', className)}>
      <span
        className={cn('h-2.5 w-2.5 rounded-full', unread ? 'bg-primary' : 'bg-transparent')}
        aria-hidden
      />
      <span className="sr-only">{unread ? 'Não lido' : 'Lido'}</span>
    </span>
  )
}
