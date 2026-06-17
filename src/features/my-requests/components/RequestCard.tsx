import { CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatFullDate, relativeTime } from '@/lib/datetime'
import type { AccessRequestModel } from '@/types/models'
import { getRequestStatusMeta } from '../utils'

interface RequestCardProps {
  req: AccessRequestModel
}

export function RequestCard({ req }: RequestCardProps) {
  const meta = getRequestStatusMeta(req.status)
  const Icon = meta.icon

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_10px_28px_-18px_rgba(0,0,0,0.30)]">
      <span className={cn('absolute inset-y-0 left-0 w-1', meta.accent)} aria-hidden />

      <div className="flex flex-col gap-3 p-5 pl-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', meta.iconChip)}>
              <Icon className="h-[18px] w-[18px]" aria-hidden />
            </span>
            <div className="flex min-w-0 flex-col">
              <p className="truncate text-base font-bold leading-tight text-foreground">{req.appName}</p>
              {req.teamName && (
                <span className="truncate text-xs text-muted-foreground">{req.teamName}</span>
              )}
            </div>
          </div>
          <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold', meta.badge)}>
            {meta.label}
          </span>
        </div>

        {/* Reason */}
        {req.reason && (
          <p className="line-clamp-2 text-sm italic leading-relaxed text-muted-foreground" title={req.reason}>
            "{req.reason}"
          </p>
        )}

        {/* Rejection note */}
        {req.status === 'rejected' && req.reviewNote && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2">
            <p className="mb-0.5 text-[11px] font-medium text-muted-foreground">Motivo da rejeição</p>
            <p className="text-xs text-foreground">{req.reviewNote}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-border/60 pt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden />
            Solicitado em {formatFullDate(req.requestedAt)}
          </span>
          {req.reviewedAt ? (
            <span>{req.status === 'approved' ? 'Aprovado' : 'Revisado'} {relativeTime(req.reviewedAt)}</span>
          ) : (
            <span>{relativeTime(req.requestedAt)}</span>
          )}
        </div>
      </div>
    </article>
  )
}
