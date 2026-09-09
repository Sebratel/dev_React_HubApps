import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { LoadingSpinner } from '@/components/LoadingSpinner'

// Sits between ProtectedRoute (auth check) and the actual route content.
// Access is controlled solely by Firebase Auth: only @sebratel.com.br Google accounts are accepted.
export function ActiveRoute() {
  const user = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)

  if (isLoading) return <LoadingSpinner fullScreen />

  // ProtectedRoute runs first — if we reach here without a user, it's a race
  if (!user) return <Navigate to="/login" replace />

  return <Outlet />
}
