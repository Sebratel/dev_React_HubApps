import { useRef, useEffect } from 'react'
import { Eye, CheckCircle, XCircle, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { UserAvatar } from '@/components/UserAvatar'
import { formatRelativeTime } from '@/utils/relative-time'
import { cn } from '@/lib/utils'
import type { AccessRequestModel } from '@/types/models'
import { AccessRequestStatusBadge } from './AccessRequestStatusBadge'

// ── Props ─────────────────────────────────────────────────────────────────────

interface AccessRequestsTableProps {
  requests: AccessRequestModel[]
  onApprove: (request: AccessRequestModel) => void
  onReject: (request: AccessRequestModel) => void
  onDetails: (request: AccessRequestModel) => void
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
  onToggleAll?: () => void
}

// ── Main Table ────────────────────────────────────────────────────────────────

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
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      {/* Header */}
      <div className="hidden sm:flex items-center gap-4 px-4 py-2.5 border-b border-border bg-muted/40">
        {selectable && (
          <span className="flex-shrink-0">
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
        <span className="flex-1 min-w-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">Usuário</span>
        <span className="w-44 flex-shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">Aplicativo</span>
        <span className="w-24 flex-shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</span>
        <span className="w-28 flex-shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">Solicitado</span>
        <span className="w-40 flex-shrink-0 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Ações</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border">
        {requests.map((req) => {
          const isPending = req.status === 'pending'

          return (
            <div
              key={req.id}
              className={cn(
                'flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-muted/30',
                'sm:flex-row sm:items-center sm:gap-4',
                !isPending && 'opacity-70'
              )}
            >
              {/* Checkbox */}
              {selectable && (
                <span className="hidden sm:flex flex-shrink-0 items-center">
                  {isPending ? (
                    <input
                      type="checkbox"
                      className="h-4 w-4 cursor-pointer rounded"
                      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                      checked={selectedIds!.has(req.id)}
                      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                      onChange={() => onToggleSelect!(req.id)}
                      aria-label={`Selecionar ${req.appName}`}
                    />
                  ) : (
                    <span className="h-4 w-4" />
                  )}
                </span>
              )}

              {/* User */}
              <div className="flex flex-1 min-w-0 items-center gap-2.5">
                <UserAvatar
                  name={req.userName || req.userId}
                  photoUrl={req.userPhotoUrl}
                  size="sm"
                  className="flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {req.userName || req.userId}
                  </p>
                  {req.email && (
                    <p className="text-xs text-muted-foreground truncate">{req.email}</p>
                  )}
                </div>
              </div>

              {/* App + reason */}
              <div className="w-44 flex-shrink-0 min-w-0 hidden sm:block">
                <p className="text-sm font-medium text-foreground truncate">{req.appName}</p>
                {req.reason && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    "{req.reason}"
                  </p>
                )}
              </div>

              {/* Status */}
              <div className="w-24 flex-shrink-0 hidden sm:block">
                <AccessRequestStatusBadge status={req.status} />
              </div>

              {/* Requested at */}
              <div className="w-28 flex-shrink-0 hidden sm:block">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatRelativeTime(req.requestedAt.toISOString())}
                </span>
              </div>

              {/* Actions */}
              <div className="w-40 flex-shrink-0 flex flex-wrap items-center gap-1.5 sm:justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  aria-label={`Detalhes de ${req.appName}`}
                  onClick={() => onDetails(req)}
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
                {isPending && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2.5 text-xs font-medium bg-green-50 text-green-800 border border-green-200 hover:bg-green-100 shadow-none"
                      onClick={() => onApprove(req)}
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1" />
                      Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2.5 text-xs font-medium border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                      onClick={() => onReject(req)}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" />
                      Rejeitar
                    </Button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

export function AccessRequestsTableSkeleton() {
  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      <div className="px-4 py-2.5 bg-muted/40 border-b border-border">
        <Skeleton className="h-3 w-48" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5">
            <div className="h-9 w-9 flex-shrink-0 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-3 w-28 hidden sm:block" />
            <Skeleton className="h-5 w-16 rounded-full hidden sm:block" />
            <Skeleton className="h-3 w-16 hidden sm:block" />
            <Skeleton className="h-7 w-7 rounded hidden sm:block" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────

export function AccessRequestsTableEmpty({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <ClipboardList className="h-6 w-6 text-muted-foreground/40" aria-hidden />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">
          {hasFilters ? 'Nenhuma solicitação corresponde aos filtros.' : 'Nenhuma solicitação cadastrada.'}
        </p>
        {hasFilters && (
          <p className="mt-1 text-xs text-muted-foreground">Tente ajustar ou limpar os filtros.</p>
        )}
      </div>
    </div>
  )
}
