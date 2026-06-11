import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { api } from '@/lib/api'

const INTERVAL_MS = 45_000

async function sendHeartbeat() {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
  try {
    await api.patch('/users/me/heartbeat', {})
  } catch {
    // heartbeat failure is non-critical — silent
  }
}

export function useHeartbeat() {
  const isAuthenticated = useAuthStore((s) => !!s.user)

  useEffect(() => {
    if (!isAuthenticated) return

    void sendHeartbeat()

    const id = setInterval(() => { void sendHeartbeat() }, INTERVAL_MS)

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') void sendHeartbeat()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [isAuthenticated])
}
