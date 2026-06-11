import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { signOut } from '@/services/auth.service'
import { logLogout } from '@/services/audit-log.service'
import { api } from '@/lib/api'

export function useSecureSignOut(): () => Promise<void> {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  return async function secureSignOut(): Promise<void> {
    if (user) {
      try { await logLogout(user) } catch (err) {
        console.error('[audit] Logout log failed:', err)
      }
      try { await api.patch('/users/me/offline', {}) } catch {
        // non-critical — presença será expirada pelo heartbeat timeout
      }
    }
    try {
      await signOut()
    } catch (err) {
      console.error('[auth] signOut failed — local session cleared:', err)
    }
    navigate('/login', { replace: true })
  }
}
