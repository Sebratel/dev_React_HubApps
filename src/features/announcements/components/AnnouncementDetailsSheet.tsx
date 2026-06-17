import { CalendarDays, AlertTriangle, Check, RotateCcw } from 'lucide-react'
import {
  Sheet, SheetContent, SheetHeader, SheetBody, SheetFooter, SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AnnouncementModel } from '@/types/models'
import { getTypeMeta, formatFullDate, relativeTime } from '../utils'

interface AnnouncementDetailsSheetProps {
  announcement: AnnouncementModel | null
  open: boolean
  unread: boolean
  onOpenChange: (open: boolean) => void
  onToggleRead: (id: string, read: boolean) => void
}

export function AnnouncementDetailsSheet({
  announcement, open, unread, onOpenChange, onToggleRead,
}: AnnouncementDetailsSheetProps) {
  const meta = announcement ? getTypeMeta(announcement.type) : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent aria-describedby={undefined}>
        {announcement && meta && (
          <>
            <SheetHeader>
              {/* Category + status */}
              <div className="flex flex-wrap items-center gap-2 pr-8">
                <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide', meta.badge)}>
                  <meta.icon className="h-3.5 w-3.5" aria-hidden />
                  {meta.label}
                </span>
                {meta.important && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                    <AlertTriangle className="h-3 w-3" aria-hidden />
                    Importante
                  </span>
                )}
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                    unread ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', unread ? 'bg-primary' : 'bg-muted-foreground')} aria-hidden />
                  {unread ? 'Não lido' : 'Lido'}
                </span>
              </div>

              <SheetTitle>{announcement.title}</SheetTitle>

              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                {formatFullDate(announcement.createdAt)} · {relativeTime(announcement.createdAt)}
              </p>
            </SheetHeader>

            <SheetBody>
              {announcement.body ? (
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                  {announcement.body}
                </p>
              ) : (
                <p className="text-sm italic text-muted-foreground">Este comunicado não possui conteúdo adicional.</p>
              )}
            </SheetBody>

            <SheetFooter>
              {unread ? (
                <Button onClick={() => onToggleRead(announcement.id, true)} className="gap-1.5">
                  <Check className="h-4 w-4" aria-hidden />
                  Marcar como lido
                </Button>
              ) : (
                <Button variant="outline" onClick={() => onToggleRead(announcement.id, false)} className="gap-1.5">
                  <RotateCcw className="h-4 w-4" aria-hidden />
                  Marcar como não lido
                </Button>
              )}
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
