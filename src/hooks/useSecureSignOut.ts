import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { signOut } from '@/services/auth.service'
import { logLogout } from '@/services/audit-log.service'

export function useSecureSignOut(): () => Promise<void> {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  return async function secureSignOut(): Promise<void> {
    if (user) {
      try {
        await logLogout(user)
      } catch (err) {
        console.error('[audit] Logout log failed:', err)
      }
    }
    try {
      await signOut()
    } catch (err) {
      // Firebase clears local auth state before the network call, so navigating
      // to /login is safe even when the server-side revocation fails.
      console.error('[auth] signOut failed — local session cleared:', err)
    }
    navigate('/login', { replace: true })
  }
}
