import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { canAccessAdminDashboard } from '@/utils/permissions'
import { LoadingSpinner } from '@/components/LoadingSpinner'

export function AdminRoute() {
  const user = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)

  if (isLoading) {
    return <LoadingSpinner fullScreen />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!canAccessAdminDashboard(user)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
