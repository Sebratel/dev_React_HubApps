import { useRef, useEffect } from 'react'
import { Eye, CheckCircle, XCircle, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatRelativeTime } from '@/utils/relative-time'
import type { AccessRequestModel } from '@/types/models'
import { AccessRequestStatusBadge } from './AccessRequestStatusBadge'

// ─── Props ────────────────────────────────────────────────────────────────────

interface AccessRequestsTableProps {
  requests: AccessRequestModel[]
  onApprove: (request: AccessRequestModel) => void
  onReject: (request: AccessRequestModel) => void
  onDetails: (request: AccessRequestModel) => void
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
  onToggleAll?: () => void
}

// ─── Main Table ───────────────────────────────────────────────────────────────

export function AccessRequestsTable({
  requests,
  onApprove,
  onReject,
  onDetails,
  selectedIds,
  onToggleSelect,
  onToggleAll,
}: AccessRequestsTableProps) {
  const pendingRequests = requests.filter((r) => r.status === 'pending')
  const selectedPendingCount = selectedIds
    ? pendingRequests.filter((r) => selectedIds.has(r.id)).length
    : 0
  const allPendingSelected = pendingRequests.length > 0 && selectedPendingCount === pendingRequests.length
  const somePendingSelected = selectedPendingCount > 0 && !allPendingSelected

  const headerCheckRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (headerCheckRef.current) {
      headerCheckRef.current.indeterminate = somePendingSelected
    }
  }, [somePendingSelected])

  const selectable = !!selectedIds && !!onToggleSelect && !!onToggleAll

  return (
    <div role="table" className="rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div
        role="row"
        className="hidden sm:grid gap-4 px-4 py-2.5 bg-muted/40 text-xs font-medium text-muted-foreground uppercase tracking-wide"
        style={{ gridTemplateColumns: selectable ? 'auto 2fr 2fr 1fr 1fr auto' : '2fr 2fr 1fr 1fr auto' }}
      >
        {selectable && (
          <span className="flex items-center">
            <input
              ref={headerCheckRef}
              type="checkbox"
              className="h-4 w-4 cursor-pointer rounded"
              checked={allPendingSelected}
              disabled={pendingRequests.length === 0}
              onChange={onToggleAll}
              aria-label="Selecionar todas pendentes"
            />
          </span>
        )}
        <span>Usuário</span>
        <span>Aplicativo</span>
        <span>Status</span>
        <span>Solicitado</span>
        <span className="text-right">Ações</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border">
        {requests.map((req) => (
          <div
            key={req.id}
            role="row"
            className="grid grid-cols-1 gap-2 sm:gap-4 px-4 py-3 items-center hover:bg-muted/30 transition-colors"
            style={{ gridTemplateColumns: selectable ? 'auto 2fr 2fr 1fr 1fr auto' : '2fr 2fr 1fr 1fr auto' }}
          >
            {/* Checkbox (pending only) */}
            {selectable && (
              <span className="hidden sm:flex items-center">
                {req.status === 'pending' ? (
                  <input
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer rounded"
                    checked={selectedIds!.has(req.id)}
                    onChange={() => onToggleSelect!(req.id)}
                    aria-label={`Selecionar ${req.appName}`}
                  />
                ) : (
                  <span className="h-4 w-4" />
                )}
              </span>
            )}

            {/* User */}
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{req.userName || req.userId}</p>
              {req.email && <p className="text-xs text-muted-foreground truncate">{req.email}</p>}
            </div>

            {/* App */}
            <div className="min-w-0">
              <p className="text-sm truncate">{req.appName}</p>
            </div>

            {/* Status */}
            <div className="hidden sm:block">
              <AccessRequestStatusBadge status={req.status} />
            </div>

            {/* Requested at */}
            <div className="hidden sm:block">
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(req.requestedAt.toISOString())}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 justify-end">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                aria-label={`Detalhes de ${req.appName}`}
                onClick={() => onDetails(req)}
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>

              {req.status === 'pending' && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-green-700 hover:bg-green-50 hover:text-green-800"
                    onClick={() => onApprove(req)}
                  >
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-red-700 hover:bg-red-50 hover:text-red-800"
                    onClick={() => onReject(req)}
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    Rejeitar
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function AccessRequestsTableSkeleton() {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-2.5 bg-muted/40">
        <Skeleton className="h-3 w-48" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex items-center gap-4">
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-3 w-24 hidden sm:block" />
            <Skeleton className="h-5 w-16 rounded-full hidden sm:block" />
            <Skeleton className="h-3 w-16 hidden sm:block" />
            <Skeleton className="h-7 w-7 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

export function AccessRequestsTableEmpty({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="rounded-xl border border-border px-6 py-12 flex flex-col items-center gap-3 text-center">
      <ClipboardList className="h-8 w-8 text-muted-foreground/40" aria-hidden />
      <p className="text-sm font-medium text-muted-foreground">
        {hasFilters
          ? 'Nenhuma solicitação corresponde aos filtros.'
          : 'Nenhuma solicitação cadastrada.'}
      </p>
      {hasFilters && (
        <p className="text-xs text-muted-foreground">Tente ajustar ou limpar os filtros.</p>
      )}
    </div>
  )
}
