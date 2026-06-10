import { Badge } from '@/components/ui/badge'
import { AdminEmptyState } from './AdminEmptyState'
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
    <ul className="divide-y divide-border">
      {requests.slice(0, MAX_VISIBLE).map(req => (
        <li key={req.id} className="py-3 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{req.userName || req.userId}</p>
            <p className="text-xs text-muted-foreground truncate">→ {req.appName}</p>
          </div>
          <Badge variant="outline" className="text-xs shrink-0 whitespace-nowrap">
            {formatRelativeTime(req.requestedAt.toISOString())}
          </Badge>
        </li>
      ))}
    </ul>
  )
}
