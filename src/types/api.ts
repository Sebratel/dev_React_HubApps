// ─── Pagination ──────────────────────────────────────────────────────────────

export interface PaginationMeta {
  limit: number
  offset: number
  total: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: PaginationMeta
}

// Index-signature base for all API query-param objects.
// Param interfaces that extend this are assignable to the api helpers' QueryParams.
export type QueryParams = Record<string, string | number | boolean | undefined | null>

export interface PaginationParams extends QueryParams {
  limit?: number
  offset?: number
}

// ─── API Error ───────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message)
    this.name = 'ApiError'
    Object.setPrototypeOf(this, ApiError.prototype)
  }

  get isUnauthorized(): boolean {
    return this.status === 401
  }
  get isForbidden(): boolean {
    return this.status === 403
  }
  get isConflict(): boolean {
    return this.status === 409
  }
  get isRateLimited(): boolean {
    return this.status === 429
  }
  get isNotFound(): boolean {
    return this.status === 404
  }
}

// ─── Audit Actions ───────────────────────────────────────────────────────────
// Must stay in sync with hub-api/src/utils/auditActions.js

export const AUDIT_ACTION = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  APP_OPEN: 'APP_OPEN',
  USER_UPDATE: 'USER_UPDATE',
  USER_ACTIVATE: 'USER_ACTIVATE',
  USER_DEACTIVATE: 'USER_DEACTIVATE',
  USER_PROMOTE_ADMIN: 'USER_PROMOTE_ADMIN',
  USER_REVOKE_ADMIN: 'USER_REVOKE_ADMIN',
  APP_CREATE: 'APP_CREATE',
  APP_UPDATE: 'APP_UPDATE',
  APP_DEACTIVATE: 'APP_DEACTIVATE',
  APP_REACTIVATE: 'APP_REACTIVATE',
  ACCESS_REQUEST_CREATE: 'ACCESS_REQUEST_CREATE',
  ACCESS_REQUEST_APPROVE: 'ACCESS_REQUEST_APPROVE',
  ACCESS_REQUEST_REJECT: 'ACCESS_REQUEST_REJECT',
} as const

export type AuditAction = (typeof AUDIT_ACTION)[keyof typeof AUDIT_ACTION]
