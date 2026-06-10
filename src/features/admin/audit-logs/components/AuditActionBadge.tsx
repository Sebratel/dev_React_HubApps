import { AUDIT_ACTION } from '@/types/api'

// ─── Labels ───────────────────────────────────────────────────────────────────

const AUDIT_ACTION_LABELS: Record<string, string> = {
  [AUDIT_ACTION.LOGIN]:                   'Login',
  [AUDIT_ACTION.LOGOUT]:                  'Logout',
  [AUDIT_ACTION.APP_OPEN]:                'Abriu app',
  [AUDIT_ACTION.USER_UPDATE]:             'Atualizou usuário',
  [AUDIT_ACTION.USER_ACTIVATE]:           'Ativou usuário',
  [AUDIT_ACTION.USER_DEACTIVATE]:         'Desativou usuário',
  [AUDIT_ACTION.USER_PROMOTE_ADMIN]:      'Promoveu a admin',
  [AUDIT_ACTION.USER_REVOKE_ADMIN]:       'Revogou admin',
  [AUDIT_ACTION.APP_CREATE]:              'Criou app',
  [AUDIT_ACTION.APP_UPDATE]:              'Atualizou app',
  [AUDIT_ACTION.APP_DEACTIVATE]:          'Desativou app',
  [AUDIT_ACTION.APP_REACTIVATE]:          'Reativou app',
  [AUDIT_ACTION.ACCESS_REQUEST_CREATE]:   'Solicitou acesso',
  [AUDIT_ACTION.ACCESS_REQUEST_APPROVE]:  'Aprovou solicitação',
  [AUDIT_ACTION.ACCESS_REQUEST_REJECT]:   'Rejeitou solicitação',
}

// ─── Critical set (destaque visual) ──────────────────────────────────────────

const CRITICAL_ACTIONS = new Set<string>([
  AUDIT_ACTION.USER_UPDATE,
  AUDIT_ACTION.USER_PROMOTE_ADMIN,
  AUDIT_ACTION.USER_REVOKE_ADMIN,
  AUDIT_ACTION.APP_DEACTIVATE,
  AUDIT_ACTION.ACCESS_REQUEST_APPROVE,
  AUDIT_ACTION.ACCESS_REQUEST_REJECT,
])

function getBadgeClasses(action: string): string {
  switch (action) {
    case AUDIT_ACTION.LOGIN:
    case AUDIT_ACTION.LOGOUT:
      return 'bg-gray-100 text-gray-600'
    case AUDIT_ACTION.APP_OPEN:
      return 'bg-blue-50 text-blue-700'
    case AUDIT_ACTION.USER_ACTIVATE:
    case AUDIT_ACTION.APP_CREATE:
    case AUDIT_ACTION.APP_REACTIVATE:
    case AUDIT_ACTION.ACCESS_REQUEST_CREATE:
      return 'bg-green-50 text-green-700'
    case AUDIT_ACTION.USER_DEACTIVATE:
    case AUDIT_ACTION.APP_UPDATE:
      return 'bg-yellow-50 text-yellow-700'
    // All critical actions → red
    case AUDIT_ACTION.USER_UPDATE:
    case AUDIT_ACTION.USER_PROMOTE_ADMIN:
    case AUDIT_ACTION.USER_REVOKE_ADMIN:
    case AUDIT_ACTION.APP_DEACTIVATE:
    case AUDIT_ACTION.ACCESS_REQUEST_APPROVE:
    case AUDIT_ACTION.ACCESS_REQUEST_REJECT:
      return 'bg-red-50 text-red-700 font-medium'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface AuditActionBadgeProps {
  action: string
}

export function AuditActionBadge({ action }: AuditActionBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${getBadgeClasses(action)}`}
      data-critical={CRITICAL_ACTIONS.has(action) ? '' : undefined}
      data-testid={`action-badge-${action}`}
    >
      {AUDIT_ACTION_LABELS[action] ?? action}
    </span>
  )
}
