import { Outlet, Link, NavLink } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { canAccessAdminDashboard } from '@/utils/permissions'
import { UserAvatar } from '@/components/UserAvatar'
import { Button } from '@/components/ui/button'
import { useSecureSignOut } from '@/hooks/useSecureSignOut'

export function DashboardLayout() {
  const user = useAuthStore((s) => s.user)
  const secureSignOut = useSecureSignOut()

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center gap-3 bg-sebratel-header px-4 shadow-sm sm:px-6">
        <Link
          to="/"
          className="shrink-0 text-lg font-bold tracking-tight text-black/90 transition-opacity hover:opacity-80"
        >
          Sebratel Hub
        </Link>

        <div className="flex-1" />

        {user && canAccessAdminDashboard(user) && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-black/20 text-black'
                  : 'text-black/70 hover:bg-black/10 hover:text-black'
              }`
            }
          >
            Admin
          </NavLink>
        )}

        {user && (
          <div className="flex items-center gap-2 sm:gap-3">
            <UserAvatar name={user.name || user.email} photoUrl={user.photoUrl} size="sm" />
            <span className="hidden max-w-[130px] truncate text-sm font-medium text-black/80 sm:block">
              {user.name || user.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-black/70 hover:bg-black/10 hover:text-black"
              onClick={secureSignOut}
            >
              Sair
            </Button>
          </div>
        )}
      </header>

      <main className="flex-1 p-4 sm:p-6 w-full max-w-7xl mx-auto">
        <Outlet />
      </main>
    </div>
  )
}
