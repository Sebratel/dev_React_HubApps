// ADR-0001-D3: favorites, recent, recentAccess are safe to persist (app IDs only).
// The actual `apps` array comes from Firestore — never from localStorage.
// Access rights are re-computed from user permissions on every render.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppItemModel } from '@/types/models'
import { MAX_RECENT_APPS } from '@/constants/config'

interface AppsState {
  // In-memory — fetched from Firestore, never persisted
  allApps: AppItemModel[]
  isLoading: boolean

  // Persisted — only IDs, not app data or access rights
  favorites: string[]
  recent: string[]
  recentAccess: Record<string, string> // appId → ISO UTC timestamp

  // Current user's accessible apps (computed client-side, not persisted)
  userApps: AppItemModel[]
}

interface AppsActions {
  setAllApps: (apps: AppItemModel[]) => void
  setUserApps: (apps: AppItemModel[]) => void
  setLoading: (loading: boolean) => void
  toggleFavorite: (appId: string) => void
  markRecent: (appId: string) => void
  pruneStoredAppRefs: (validAppIds: Set<string>) => void
  clearUserData: () => void
}

export const useAppsStore = create<AppsState & AppsActions>()(
  persist(
    (set, get) => ({
      // ─── State ─────────────────────────────────────────────────────────
      allApps: [],
      userApps: [],
      isLoading: false,
      favorites: [],
      recent: [],
      recentAccess: {},

      // ─── Actions ───────────────────────────────────────────────────────
      setAllApps: (allApps) => set({ allApps }),
      setUserApps: (userApps) => set({ userApps }),
      setLoading: (isLoading) => set({ isLoading }),

      toggleFavorite: (appId) => {
        const { favorites } = get()
        set({
          favorites: favorites.includes(appId)
            ? favorites.filter((id) => id !== appId)
            : [...favorites, appId],
        })
      },

      markRecent: (appId) => {
        const { recent, recentAccess } = get()
        const filtered = recent.filter((id) => id !== appId)
        set({
          recent: [appId, ...filtered].slice(0, MAX_RECENT_APPS),
          recentAccess: {
            ...recentAccess,
            [appId]: new Date().toISOString(),
          },
        })
      },

      pruneStoredAppRefs: (validAppIds) => {
        const { favorites, recent, recentAccess } = get()
        set({
          favorites: favorites.filter((id) => validAppIds.has(id)),
          recent: recent.filter((id) => validAppIds.has(id)),
          recentAccess: Object.fromEntries(
            Object.entries(recentAccess).filter(([id]) => validAppIds.has(id))
          ),
        })
      },

      // Called on signOut — clears only persisted preference data
      clearUserData: () =>
        set({ favorites: [], recent: [], recentAccess: {}, allApps: [], userApps: [] }),
    }),
    {
      name: 'sebratel-hub:apps-prefs',
      // Only persist lightweight preference data — never app content or access rights
      partialize: (state) => ({
        favorites: state.favorites,
        recent: state.recent,
        recentAccess: state.recentAccess,
      }),
    }
  )
)
