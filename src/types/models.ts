import type { AppStatus, AppType, AccessRequestStatus, NoticeType } from './enums'

// ─── Dashboard sub-document stored in users/{uid}.dashboard ──────────────────

export interface DashboardPreferences {
  favorites: string[]
  recent: string[]
  recentAccess: Record<string, string> // appId → ISO UTC timestamp
}

// ─── UserModel ───────────────────────────────────────────────────────────────
// Firestore collection: users / Document ID: Firebase Auth UID
// ADR-0001-D3: isAdmin and permissions are NEVER persisted to localStorage.

export interface UserModel {
  id: string
  email: string
  name: string
  photoUrl: string | null
  // Legacy profile field — kept for compatibility with existing Firestore data
  profile: string // 'employee' | 'user' | 'third_party' | 'admin'
  team: string | null // FK → teams/{teamId}
  permissions: string[]
  isActive: boolean
  isAdmin: boolean // Stored field — NOT computed from permissions array
  createdAt: Date
  updatedAt: Date
  online: boolean
  lastLogin: Date | null
  dashboard?: DashboardPreferences
}

// ─── AuthResult ──────────────────────────────────────────────────────────────

// Returned by auth.service.ts sign-in methods.
// The resolved UserModel is fetched separately via useAuthSession → Firestore.
export interface AuthResult {
  success: boolean
  error?: string
}

// ─── AppItemModel ─────────────────────────────────────────────────────────────
// Firestore collection: apps / Document ID: manual app ID
// BUG NOTE from Flutter: `lottie` was missing from copyWith — fixed here with
// correct spread in all update operations.

export interface AppItemModel {
  id: string
  name: string
  icon: string // emoji or Lottie URL (.json)
  lottie: string | null // explicit Lottie animation URL
  description: string
  type: AppType
  launchMode: 'url' | 'deep-link' | 'internal'
  deepLink: string | null
  openInExternalBrowser: boolean
  passUser: boolean // inject uid/name/email/permissions as query params
  passToken: boolean // inject session token as query param
  url: string | null // legacy field
  route: string | null // legacy field
  allowedProfiles: string[]
  allowedUsers: string[] // UIDs with direct access
  allowedTeams: string[] // team IDs with access
  status: AppStatus
  cardColor?: string | null
  createdAt: Date
  updatedAt: Date
}

// ─── AccessRequestModel ───────────────────────────────────────────────────────
// Firestore collection: access_requests
// State machine: pending → approved (terminal) | rejected (terminal)

export interface AccessRequestModel {
  id: string
  userId: string
  userName: string // denormalized
  userPhotoUrl: string | null
  email: string // denormalized
  teamId: string | null
  teamName: string // denormalized
  appId: string
  appName: string // denormalized
  reason: string // min 8 chars (client-validated)
  status: AccessRequestStatus
  requestedAt: Date
  updatedAt: Date
  reviewedByUserId: string | null
  reviewedByName: string | null
  reviewedAt: Date | null
  reviewNote: string | null
}

// ─── AuditLogModel ───────────────────────────────────────────────────────────
// Firestore collection: audit_logs

export interface AuditLogModel {
  id: string
  userId: string
  userName: string // denormalized
  userPhotoUrl: string | null
  action: string // e.g. 'APP_ACCESS', 'USER_BLOCK', 'LOGIN'
  details: string
  timestamp: Date
}

// ─── TeamModel ───────────────────────────────────────────────────────────────
// Firestore collection: teams

export interface TeamModel {
  id: string
  name: string
  description: string
  permissions: string[]
  memberIds: string[] // UIDs
  createdAt: Date
  updatedAt: Date
}

// ─── DashboardNotice (Announcement) ──────────────────────────────────────────
// Firestore collection: announcements

export interface DashboardNotice {
  id: string
  title: string
  message: string
  type: NoticeType
  priority: number // 0–10; higher = shown first
  active: boolean
  ctaLabel: string | null
  ctaUrl: string | null
  startAt: Date | null
  endAt: Date | null
  updatedAt: Date
  allowedProfiles: string[]
  allowedUsers: string[]
  pushRequestedAt: Date | null
  pushSentAt: Date | null
}

// ─── AnnouncementModel ────────────────────────────────────────────────────────
// MySQL table: announcements

export interface AnnouncementModel {
  id: string
  title: string
  body: string | null
  type: import('./enums').AnnouncementType
  isActive: boolean
  createdBy: string
  allowedProfiles: string[]
  createdAt: Date
  updatedAt: Date
}

// ─── HighlightModel ───────────────────────────────────────────────────────────
// MySQL table: highlights

export interface HighlightModel {
  id: string
  title: string
  description: string | null
  badgeText: string | null
  ctaLabel: string | null
  ctaUrl: string | null
  imageUrl: string
  objectFit: 'cover' | 'contain'
  objectPosition: string
  isActive: boolean
  sortOrder: number
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

// ─── AppManualModel ───────────────────────────────────────────────────────────
// MySQL table: app_manuals

export interface AppManualModel {
  id: string
  appId: string
  appName: string
  appIcon: string | null
  wikiUrl: string | null
  pdfUrl: string | null
  description: string | null
  isActive: boolean
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

// ─── ExternalAppLaunchSession ─────────────────────────────────────────────────
// Returned by Cloud Function createExternalAppSessionV1.
// ADR-0001-D7: token is generated exclusively server-side.

export interface ExternalAppLaunchSession {
  token: string
  expiresAt: Date | null
  launchContext: string | null
  launchContextExpiresAt: Date | null
}
