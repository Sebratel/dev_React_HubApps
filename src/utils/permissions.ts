import type { UserModel, AppItemModel } from '@/types/models'

// ─── User permission helpers ──────────────────────────────────────────────────
// TypeScript equivalents of Flutter's UserModel getters.
// Pure functions — no side effects, fully testable.

export function hasPermission(user: UserModel, permission: string): boolean {
  return user.permissions.includes(permission)
}

export function isThirdPartyUser(user: UserModel): boolean {
  return user.permissions.includes('third_party')
}

export function isInternalUser(user: UserModel): boolean {
  return user.permissions.includes('internal')
}

export function isAdminThird(user: UserModel): boolean {
  return user.permissions.includes('admin_third')
}

export function canManageThirdParty(user: UserModel): boolean {
  return user.permissions.includes('manage_third_party_users')
}

// ─── Route guard predicates ───────────────────────────────────────────────────
// Used by React Router loaders (ProtectedRoute, AdminRoute).
// ADR-0001-D3: these read from the Zustand store (in-memory) not localStorage.

export function canAccessAdminDashboard(user: UserModel): boolean {
  return user.isAdmin || user.permissions.includes('admin_third')
}

export function canAccessThirdPartyManagement(user: UserModel): boolean {
  return user.isAdmin || user.permissions.includes('admin_third')
}

export function canAccessAccessRequestsManagement(user: UserModel): boolean {
  return user.isAdmin || user.permissions.includes('admin_third')
}

// ─── App access logic ─────────────────────────────────────────────────────────
// O Hub é um launcher aberto: todos os apps ativos aparecem para todos os
// usuários autenticados @sebratel.com.br. Cada app gerencia seu próprio controle
// de acesso internamente.

export function getUserApps(_user: UserModel, allApps: AppItemModel[]): AppItemModel[] {
  return allApps.filter((app) => app.status !== 'maintenance')
}
