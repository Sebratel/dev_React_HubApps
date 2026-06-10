// ADR-0001-D3: This store uses NO persist middleware.
// isAdmin, permissions, profile are NEVER written to localStorage.
// The store is in-memory only — cleared on page refresh.
// Bootstrap always re-fetches UserModel from Firestore on auth state change.

import { create } from 'zustand'
import type { UserModel } from '@/types/models'

interface AuthState {
  user: UserModel | null
  isLoading: boolean
  error: string | null
}

interface AuthActions {
  setUser: (user: UserModel | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearUser: () => void
}

export const useAuthStore = create<AuthState & AuthActions>()((set) => ({
  // ─── State ───────────────────────────────────────────────────────────────
  user: null,
  isLoading: true, // true on init — waiting for onAuthStateChanged
  error: null,

  // ─── Actions ─────────────────────────────────────────────────────────────
  setUser: (user) => set({ user, isLoading: false, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),

  // Clears all auth state — called on signOut and auth errors
  clearUser: () => set({ user: null, isLoading: false, error: null }),
}))

// Derived selectors — read computed values without subscribing to full store
export const selectIsAuthenticated = (state: AuthState) => state.user !== null
export const selectIsAdmin = (state: AuthState) => state.user?.isAdmin ?? false
export const selectUser = (state: AuthState) => state.user
