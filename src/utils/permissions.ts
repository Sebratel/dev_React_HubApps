import type { UserModel } from '@/types/models'
import type { AppItemModel } from '@/types/models'

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
// Mirrors Flutter's AppsService._userHasAccess() exactly.

export function userHasAppAccess(user: UserModel, app: AppItemModel): boolean {
  if (app.status === 'maintenance') return false
  return (
    app.allowedProfiles.includes(user.profile) ||
    app.allowedUsers.includes(user.id) ||
    (user.team !== null && app.allowedTeams.includes(user.team))
  )
}

export function getUserApps(user: UserModel, allApps: AppItemModel[]): AppItemModel[] {
  return allApps.filter((app) => userHasAppAccess(user, app))
}

export function getAppsWithoutAccess(
  allApps: AppItemModel[],
  userApps: AppItemModel[]
): AppItemModel[] {
  const userAppIds = new Set(userApps.map((a) => a.id))
  return allApps.filter((a) => !userAppIds.has(a.id) && a.status !== 'maintenance')
}
