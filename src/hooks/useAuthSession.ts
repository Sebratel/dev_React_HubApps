import { useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/firebase'
import { useAuthStore } from '@/stores/auth.store'
import { useAppsStore } from '@/stores/apps.store'
import { provisionUserOnFirstLogin } from '@/services/user.service'
import { logLogin } from '@/services/audit-log.service'

// B3 fix: skip Firestore on token refresh (same UID already in store).
// A3 fix: store actions via getState() — no subscription, no re-renders.
export function useAuthSession(): void {
  useEffect(() => {
    const { setUser, setLoading, setError, clearUser } = useAuthStore.getState()

    setLoading(true)

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        clearUser()
        useAppsStore.getState().clearUserData()
        // Clear the login-logged flag so re-login in the same tab records a new LOGIN event.
        sessionStorage.removeItem('sebratel:session_logged')
        return
      }

      // Token refresh — same UID is already loaded. Skip Firestore.
      if (useAuthStore.getState().user?.id === firebaseUser.uid) {
        return
      }

      setLoading(true)
      try {
        const user = await provisionUserOnFirstLogin(
          firebaseUser.uid,
          firebaseUser.email ?? '',
          firebaseUser.displayName ?? '',
          firebaseUser.photoURL ?? null
        )
        setUser(user)
        // A1: only log LOGIN for genuine logins (not page-reload session restores).
        // M3: skip for inactive users — they are redirected before reaching the dashboard.
        if (user.isActive && !sessionStorage.getItem('sebratel:session_logged')) {
          sessionStorage.setItem('sebratel:session_logged', '1')
          logLogin(user).catch((err) => console.error('[audit] Login log failed:', err))
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao carregar perfil do usuário.'
        setError(message)
      }
    })

    return unsubscribe
  }, [])
}
