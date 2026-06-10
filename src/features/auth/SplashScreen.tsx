import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { LoadingSpinner } from '@/components/LoadingSpinner'

const MIN_DISPLAY_MS = 2000

export function SplashScreen() {
  const user = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)
  const navigate = useNavigate()

  useEffect(() => {
    if (isLoading) return

    const timer = setTimeout(() => {
      navigate(user ? '/' : '/login', { replace: true })
    }, MIN_DISPLAY_MS)

    return () => clearTimeout(timer)
  }, [isLoading, user, navigate])

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-sebratel-header gap-6">
      <div className="flex flex-col items-center gap-2">
        <span className="text-4xl font-bold text-black tracking-tight">Sebratel</span>
        <span className="text-lg font-medium text-black/70">Hub Corporativo</span>
      </div>
      <LoadingSpinner className="border-black/30 border-t-black" />
    </div>
  )
}
