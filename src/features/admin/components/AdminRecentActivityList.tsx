import { AdminEmptyState } from './AdminEmptyState'
import { cn } from '@/lib/utils'
import type { AuditLogModel } from '@/types/models'
import { formatRelativeTime } from '@/utils/relative-time'

const ACTION_LABELS: Record<string, string> = {
  LOGIN:                   'Login',
  LOGOUT:                  'Logout',
  APP_OPEN:                'Abriu app',
  USER_UPDATE:             'Atualizou usuário',
  USER_ACTIVATE:           'Ativou usuário',
  USER_DEACTIVATE:         'Desativou usuário',
  USER_PROMOTE_ADMIN:      'Promoveu a admin',
  USER_REVOKE_ADMIN:       'Revogou admin',
  APP_CREATE:              'Criou app',
  APP_UPDATE:              'Atualizou app',
  APP_DEACTIVATE:          'Desativou app',
  ACCESS_REQUEST_CREATE:   'Solicitou acesso',
  ACCESS_REQUEST_APPROVE:  'Aprovou acesso',
  ACCESS_REQUEST_REJECT:   'Rejeitou acesso',
  ANNOUNCEMENT_CREATE:     'Criou aviso',
  ANNOUNCEMENT_UPDATE:     'Atualizou aviso',
  ANNOUNCEMENT_DELETE:     'Removeu aviso',
}

type ActionCategory = 'neutral' | 'success' | 'warning' | 'danger'

const ACTION_CATEGORY: Record<string, ActionCategory> = {
  LOGIN:                  'neutral',
  LOGOUT:                 'neutral',
  APP_OPEN:               'neutral',
  USER_UPDATE:            'neutral',
  USER_ACTIVATE:          'success',
  USER_DEACTIVATE:        'danger',
  USER_PROMOTE_ADMIN:     'warning',
  USER_REVOKE_ADMIN:      'warning',
  APP_CREATE:             'success',
  APP_UPDATE:             'neutral',
  APP_DEACTIVATE:         'danger',
  ACCESS_REQUEST_CREATE:  'neutral',
  ACCESS_REQUEST_APPROVE: 'success',
  ACCESS_REQUEST_REJECT:  'danger',
  ANNOUNCEMENT_CREATE:    'warning',
  ANNOUNCEMENT_UPDATE:    'warning',
  ANNOUNCEMENT_DELETE:    'danger',
}

const DOT_CLASS: Record<ActionCategory, string> = {
  neutral: 'bg-muted-foreground/40',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  danger:  'bg-destructive',
}

function parseDetails(raw: string): string {
  if (!raw) return ''
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>
    const pick = (key: string) => typeof obj[key] === 'string' ? obj[key] as string : null
    return (
      pick('title') ??
      pick('appName') ??
      pick('name') ??
      pick('reason') ??
      pick('targetEmail') ??
      ''
    )
  } catch {
    return raw
  }
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
    <ul className="flex flex-col -mx-1">
      {logs.map((log, i) => {
        const label  = ACTION_LABELS[log.action] ?? log.action
        const detail = parseDetails(log.details)
        const cat    = ACTION_CATEGORY[log.action] ?? 'neutral'

        return (
          <li
            key={log.id}
            className={cn(
              'flex items-start gap-3 px-2 py-2.5 rounded-lg transition-colors cursor-default',
              'hover:bg-muted/50',
              i % 2 !== 0 && 'bg-muted/20',
            )}
          >
            <span
              className={cn('mt-[6px] h-1.5 w-1.5 rounded-full shrink-0', DOT_CLASS[cat])}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground leading-snug truncate">
                {log.userName}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {label}
                {detail
                  ? <span className="text-muted-foreground/70"> · {detail}</span>
                  : null}
              </p>
            </div>
            <span className="shrink-0 text-[11px] text-muted-foreground/70 whitespace-nowrap tabular-nums pt-0.5">
              {formatRelativeTime(log.timestamp.toISOString())}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
