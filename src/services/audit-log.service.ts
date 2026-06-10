import { api } from '@/lib/api'
import { AUDIT_ACTION, type AuditAction } from '@/types/api'
import type { AppItemModel, UserModel } from '@/types/models'

export { AUDIT_ACTION }

async function logEvent(_user: UserModel, action: AuditAction, details?: string): Promise<void> {
  try {
    // userName is not sent — backend derives it from the Firebase token server-side.
    await api.post<{ ok: boolean }>('/audit-logs', { action, details: details ?? null })
  } catch (err) {
    // Audit log failures must never break the main flow.
    console.error('[audit]', action, err)
  }
}

export async function logLogin(user: UserModel): Promise<void> {
  await logEvent(user, AUDIT_ACTION.LOGIN, 'Usuário autenticado via browser')
}

export async function logLogout(user: UserModel): Promise<void> {
  await logEvent(user, AUDIT_ACTION.LOGOUT, 'Usuário encerrou sessão')
}

export async function logAppOpen(user: UserModel, app: AppItemModel): Promise<void> {
  await logEvent(user, AUDIT_ACTION.APP_OPEN, `Abriu: ${app.name}`)
}

// NOTE: The backend also logs ACCESS_REQUEST_CREATE when POST /access-requests is processed.
// This client-side log is kept for Sprint 2 compatibility; Sprint 3 will remove the duplication.
export async function logAccessRequest(user: UserModel, app: AppItemModel): Promise<void> {
  await logEvent(user, AUDIT_ACTION.ACCESS_REQUEST_CREATE, `Solicitou acesso: ${app.name}`)
}
