import { AdminEmptyState } from './AdminEmptyState'
import type { AuditLogModel } from '@/types/models'
import { formatRelativeTime } from '@/utils/relative-time'

const ACTION_LABELS: Record<string, string> = {
  LOGIN: 'Login',
  LOGOUT: 'Logout',
  APP_OPEN: 'Abriu app',
  USER_UPDATE: 'Atualizou usuário',
  USER_ACTIVATE: 'Ativou usuário',
  USER_DEACTIVATE: 'Desativou usuário',
  USER_PROMOTE_ADMIN: 'Promoveu a admin',
  USER_REVOKE_ADMIN: 'Revogou admin',
  APP_CREATE: 'Criou app',
  APP_UPDATE: 'Atualizou app',
  APP_DEACTIVATE: 'Desativou app',
  ACCESS_REQUEST_CREATE: 'Solicitou acesso',
  ACCESS_REQUEST_APPROVE: 'Aprovou solicitação',
  ACCESS_REQUEST_REJECT: 'Rejeitou solicitação',
}

interface AdminRecentActivityListProps {
  logs: AuditLogModel[]
}

export function AdminRecentActivityList({ logs }: AdminRecentActivityListProps) {
  if (logs.length === 0) {
    return (
      <AdminEmptyState
        title="Sem atividade recente"
        description="Nenhum evento de auditoria registrado."
      />
    )
  }

  return (
    <ul className="divide-y divide-border">
      {logs.map(log => (
        <li key={log.id} className="py-3 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{log.userName}</p>
            <p className="text-xs text-muted-foreground">
              {ACTION_LABELS[log.action] ?? log.action}
              {log.details ? ` — ${log.details}` : ''}
            </p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
            {formatRelativeTime(log.timestamp.toISOString())}
          </span>
        </li>
      ))}
    </ul>
  )
}
