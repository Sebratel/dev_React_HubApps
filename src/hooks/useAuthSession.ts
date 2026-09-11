import { useEffect } from 'react'
import { onAuthStateChanged, signOut, getIdToken } from 'firebase/auth'
import { auth } from '@/firebase'
import { useAuthStore } from '@/stores/auth.store'
import { useAppsStore } from '@/stores/apps.store'
import { provisionUserOnFirstLogin } from '@/services/user.service'
import { logLogin } from '@/services/audit-log.service'
import { ApiError } from '@/types/api'
import { API_URL } from '@/lib/api'

// ─── Helpers de sessão gateway ────────────────────────────────────────────────
// Cria/destrói o cookie hub_session em .sebratel.com.br.
// Erros são silenciados — o gateway é um reforço de segurança, não um bloqueador
// de login se o hub-api não responder por algum motivo.

async function createGatewaySession(idToken: string): Promise<void> {
  try {
    await fetch(`${API_URL}/auth/session`, {
      method:      'POST',
      headers:     { 'Content-Type': 'application/json' },
      credentials: 'include',
      body:        JSON.stringify({ idToken }),
    })
  } catch (err) {
    console.warn('[auth] falha ao criar sessão gateway:', err)
  }
}

async function destroyGatewaySession(): Promise<void> {
  try {
    await fetch(`${API_URL}/auth/session`, {
      method:      'DELETE',
      credentials: 'include',
    })
  } catch (err) {
    console.warn('[auth] falha ao destruir sessão gateway:', err)
  }
}

function normalizeBootstrapError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.isUnauthorized) return 'Sua sessao expirou. Faca login novamente.'
    if (err.isForbidden) {
      return 'Seu usuario autenticou no Firebase, mas a API recusou o acesso. Verifique o token e as regras do backend.'
    }
    return err.message
  }

  return err instanceof Error ? err.message : 'Erro ao carregar perfil do usuario.'
}

// B3 fix: skip Firestore on token refresh (same UID already in store).
// A3 fix: store actions via getState() - no subscription, no re-renders.
export function useAuthSession(): void {
  useEffect(() => {
    const { setUser, setLoading, failAuth, clearUser } = useAuthStore.getState()

    setLoading(true)

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        clearUser()
        useAppsStore.getState().clearUserData()
        sessionStorage.removeItem('sebratel:session_logged')
        void destroyGatewaySession()
        return
      }

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

        // Cria cookie de sessão em .sebratel.com.br para o gateway nginx
        const idToken = await getIdToken(firebaseUser)
        void createGatewaySession(idToken)

        if (user.isActive && !sessionStorage.getItem('sebratel:session_logged')) {
          sessionStorage.setItem('sebratel:session_logged', '1')
          logLogin(user).catch((err) => console.error('[audit] Login log failed:', err))
        }
      } catch (err) {
        const message = normalizeBootstrapError(err)

        try {
          await signOut(auth)
        } catch (signOutError) {
          console.error('[auth] failed to clear Firebase session after bootstrap error:', signOutError)
        }

        useAppsStore.getState().clearUserData()
        sessionStorage.removeItem('sebratel:session_logged')
        failAuth(message)
      }
    })

    return unsubscribe
  }, [])
}
