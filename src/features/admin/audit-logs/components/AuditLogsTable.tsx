import { BookOpen } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { AuditActionBadge } from './AuditActionBadge'
import type { AuditLogModel } from '@/types/models'

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    <div role="table" className="rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div
        role="row"
        className="hidden sm:grid grid-cols-[2fr_2fr_3fr_auto] gap-4 px-4 py-2.5 bg-muted/40 text-xs font-medium text-muted-foreground uppercase tracking-wide"
      >
        <span>Usuário</span>
        <span>Ação</span>
        <span>Detalhes</span>
        <span className="text-right">Data</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border">
        {logs.map((log) => (
          <div
            key={log.id}
            role="row"
            className="grid grid-cols-1 sm:grid-cols-[2fr_2fr_3fr_auto] gap-2 sm:gap-4 px-4 py-3 items-center hover:bg-muted/30 transition-colors cursor-pointer"
            onClick={() => onDetails(log)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onDetails(log)
            }}
            tabIndex={0}
            aria-label={`Ver detalhes do evento ${log.id}`}
          >
            {/* User */}
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{log.userName || log.userId}</p>
            </div>

            {/* Action */}
            <div>
              <AuditActionBadge action={log.action} />
            </div>

            {/* Details */}
            <div className="min-w-0 hidden sm:block">
              <p className="text-xs text-muted-foreground truncate">{log.details || '—'}</p>
            </div>

            {/* Timestamp */}
            <div className="shrink-0 text-right">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDateTime(log.timestamp)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function AuditLogsTableSkeleton() {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-2.5 bg-muted/40">
        <Skeleton className="h-3 w-48" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex items-center gap-4">
            <Skeleton className="h-3 w-32 shrink-0" />
            <Skeleton className="h-5 w-28 rounded-full shrink-0" />
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
    <div className="rounded-xl border border-border px-6 py-12 flex flex-col items-center gap-3 text-center">
      <BookOpen className="h-8 w-8 text-muted-foreground/40" aria-hidden />
      <p className="text-sm font-medium text-muted-foreground">
        {hasFilters
          ? 'Nenhum evento corresponde aos filtros.'
          : 'Nenhum evento de auditoria registrado.'}
      </p>
      {hasFilters && (
        <p className="text-xs text-muted-foreground">Tente ajustar ou limpar os filtros.</p>
      )}
    </div>
  )
}
