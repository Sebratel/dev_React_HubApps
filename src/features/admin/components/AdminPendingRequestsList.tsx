import { AdminEmptyState } from './AdminEmptyState'
import { cn } from '@/lib/utils'
import type { AccessRequestModel } from '@/types/models'
import { formatRelativeTime } from '@/utils/relative-time'

const MAX_VISIBLE = 5

interface AdminPendingRequestsListProps {
  requests: AccessRequestModel[]
}

export function AdminPendingRequestsList({ requests }: AdminPendingRequestsListProps) {
  if (requests.length === 0) {
    return (
      <AdminEmptyState
        title="Nenhuma solicitação pendente"
        description="Todas as solicitações foram processadas."
      />
    )
  }

  return (
    <ul className="flex flex-col -mx-1">
      {requests.slice(0, MAX_VISIBLE).map((req) => (
        <li
          key={req.id}
          className={cn(
            'flex items-center justify-between gap-3 px-2 py-2.5 rounded-lg',
            'hover:bg-muted/50 transition-colors cursor-default',
          )}
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">
              {req.userName || req.userId}
            </p>
            <p className="text-xs text-muted-foreground truncate">{req.appName}</p>
          </div>
          <span className="shrink-0 text-[11px] text-muted-foreground/70 whitespace-nowrap tabular-nums">
            {formatRelativeTime(req.requestedAt.toISOString())}
          </span>
        </li>
      ))}
    </ul>
  )
}
