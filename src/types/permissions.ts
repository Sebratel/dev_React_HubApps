// ─── Permission strings stored in users.permissions[] ────────────────────────
// Source: lib/models/user_model.dart + users_management_permission_catalog.dart
// Consolidated here — single source of truth (eliminates Flutter's duplication).

export const UserPermissions = {
  admin: 'admin',
  internal: 'internal',
  thirdParty: 'third_party',
  adminThird: 'admin_third',
  manageThirdPartyUsers: 'manage_third_party_users',
  accessCarnesDelivery: 'access_carnes_delivery',
  carnesViewOnly: 'visualizacao',
  accessInternalTools: 'access_internal_tools',
  massivaView: 'massiva_view',
  massivaOpen: 'massiva_open',
  // Undeclared in Flutter constants but present in production data:
  motoboy: 'motoboy',
  financeiro: 'financeiro',
  // Alias — intentionally excluded from EDITABLE list
  carnesViewerAlias: 'viewer',
} as const

export type UserPermissionValue = (typeof UserPermissions)[keyof typeof UserPermissions]

// Permissions shown in the admin edit-permissions dialog
export const EDITABLE_PERMISSIONS: string[] = [
  UserPermissions.internal,
  UserPermissions.adminThird,
  UserPermissions.accessCarnesDelivery,
  UserPermissions.carnesViewOnly,
  UserPermissions.accessInternalTools,
  UserPermissions.massivaView,
  UserPermissions.massivaOpen,
]

// Permissions editable for third-party users only
export const THIRD_PARTY_PERMISSIONS: string[] = [
  UserPermissions.motoboy,
  UserPermissions.financeiro,
  UserPermissions.carnesViewOnly,
]
