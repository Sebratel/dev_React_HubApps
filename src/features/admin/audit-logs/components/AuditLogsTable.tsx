import { BookOpen } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { UserAvatar } from '@/components/UserAvatar'
import { AUDIT_ACTION } from '@/types/api'
import { AuditActionBadge } from './AuditActionBadge'
import { formatRelativeTime } from '@/utils/relative-time'
import type { AuditLogModel } from '@/types/models'

// ─── Dot color by action ──────────────────────────────────────────────────────

function getActionDotColor(action: string): string {
  switch (action) {
    case AUDIT_ACTION.USER_ACTIVATE:
    case AUDIT_ACTION.APP_CREATE:
    case AUDIT_ACTION.APP_REACTIVATE:
    case AUDIT_ACTION.ACCESS_REQUEST_CREATE:
      return '#22c55e'
    case AUDIT_ACTION.USER_DEACTIVATE:
    case AUDIT_ACTION.APP_UPDATE:
      return '#f59e0b'
    case AUDIT_ACTION.USER_UPDATE:
    case AUDIT_ACTION.USER_PROMOTE_ADMIN:
    case AUDIT_ACTION.USER_REVOKE_ADMIN:
    case AUDIT_ACTION.APP_DEACTIVATE:
    case AUDIT_ACTION.ACCESS_REQUEST_APPROVE:
    case AUDIT_ACTION.ACCESS_REQUEST_REJECT:
      return '#ef4444'
    case AUDIT_ACTION.APP_OPEN:
      return '#60a5fa'
    default:
      return '#94a3b8'
  }
}

// ─── Timestamp ────────────────────────────────────────────────────────────────

function formatDateTime(date: Date): string {
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface AuditLogsTableProps {
  logs: AuditLogModel[]
  onDetails: (log: AuditLogModel) => void
}

// ─── Main Table ───────────────────────────────────────────────────────────────

export function AuditLogsTable({ logs, onDetails }: AuditLogsTableProps) {
  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      {/* Column header */}
      <div className="hidden sm:grid grid-cols-[2fr_2fr_3fr_auto] gap-4 px-4 py-2.5 bg-muted/40 border-b border-border text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <span>Usuário</span>
        <span>Ação</span>
        <span>Detalhes</span>
        <span className="text-right">Data</span>
      </div>

      <div className="divide-y divide-border">
        {logs.map((log) => {
          const displayName = log.userName || log.userId
          const dotColor = getActionDotColor(log.action)

          return (
            <div
              key={log.id}
              role="row"
              className="flex flex-col gap-2 px-4 py-3.5 cursor-pointer hover:bg-muted/30 transition-colors
                         sm:grid sm:grid-cols-[2fr_2fr_3fr_auto] sm:items-center sm:gap-4"
              onClick={() => onDetails(log)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onDetails(log) }}
              tabIndex={0}
              aria-label={`Ver detalhes do evento ${log.id}`}
            >
              {/* User cell */}
              <div className="flex items-center gap-2.5 min-w-0">
                <UserAvatar name={displayName} photoUrl={log.userPhotoUrl} size="sm" className="shrink-0" />
                <div className="min-w-0 flex items-center gap-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: dotColor }}
                    aria-hidden
                  />
                  <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                </div>
              </div>

              {/* Action cell */}
              <div>
                <AuditActionBadge action={log.action} />
              </div>

              {/* Details cell */}
              <div className="min-w-0 hidden sm:block">
                <p className="text-xs text-muted-foreground truncate">{log.details || '—'}</p>
              </div>

              {/* Timestamp cell */}
              <div className="shrink-0 text-right">
                <span
                  className="text-xs text-muted-foreground whitespace-nowrap tabular-nums"
                  title={formatDateTime(log.timestamp)}
                >
                  {formatRelativeTime(log.timestamp.toISOString())}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function AuditLogsTableSkeleton() {
  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      <div className="px-4 py-2.5 bg-muted/40 border-b border-border">
        <Skeleton className="h-3 w-48" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3.5">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5 min-w-0">
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-5 w-28 rounded-full shrink-0 hidden sm:block" />
            <Skeleton className="h-3 flex-1 hidden sm:block" />
            <Skeleton className="h-3 w-28 hidden sm:block shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

export function AuditLogsTableEmpty({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card px-6 py-16 flex flex-col items-center gap-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <BookOpen className="h-6 w-6 text-muted-foreground/40" aria-hidden />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">
          {hasFilters ? 'Nenhum evento corresponde aos filtros.' : 'Nenhum evento de auditoria registrado.'}
        </p>
        {hasFilters && (
          <p className="mt-1 text-xs text-muted-foreground">Tente ajustar ou limpar os filtros.</p>
        )}
      </div>
    </div>
  )
}
