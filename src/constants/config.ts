// Corporate email domain — only this suffix may use Google Sign-In
export const CORPORATE_EMAIL_SUFFIX = '@sebratel.com.br'

// Maximum number of recent apps tracked per user
export const MAX_RECENT_APPS = 6

// Debounce delay before syncing dashboard preferences to Firestore (ms)
export const PREFS_SYNC_DEBOUNCE_MS = 900

// Google ID token freshness window — skip re-sync if last sync < 5 min ago
export const GOOGLE_TOKEN_SYNC_FRESHNESS_MS = 5 * 60 * 1000

// Minimum remaining validity to consider a Google token usable
export const GOOGLE_TOKEN_MIN_VALIDITY_MS = 2 * 60 * 1000

// Timeout for external app token warm-up (non-Splitters path)
export const TOKEN_WARMUP_TIMEOUT_MS = 700

// localStorage key prefix for dismissed notice IDs per user
export const DISMISSED_NOTICES_KEY_PREFIX = 'dashboard:dismissed_notices:'

// localStorage key prefix for cached user photo (base64)
export const USER_PHOTO_CACHE_KEY_PREFIX = 'user_photo_'

// ─── Splitters SSO origins ────────────────────────────────────────────────────
// ADR-0001-D8: localhost origins are stripped in production builds.
// The Splitters token flow is NOT implemented in Sprint 1 — handled in Sprint 2.

const SPLITTERS_PROD_ORIGINS = [
  'https://app-splitters-sebratel.web.app',
  'https://app-splitters-sebratel-ceb1f.web.app',
] as const

const SPLITTERS_DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8080',
] as const

export const SPLITTERS_ORIGINS: readonly string[] = import.meta.env.PROD
  ? SPLITTERS_PROD_ORIGINS
  : [...SPLITTERS_PROD_ORIGINS, ...SPLITTERS_DEV_ORIGINS]
