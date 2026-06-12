import { useState } from 'react'
import { Outlet, NavLink, Link } from 'react-router-dom'
import { LayoutGrid, Bell, MessageSquare, ShieldCheck, Menu, X, LogOut, ClipboardList } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'
import { useNotificationsStore } from '@/stores/notifications.store'
import { canAccessAdminDashboard } from '@/utils/permissions'
import { UserAvatar } from '@/components/UserAvatar'
import { Button } from '@/components/ui/button'
import { useSecureSignOut } from '@/hooks/useSecureSignOut'
import { useHeartbeat } from '@/hooks/useHeartbeat'
import { cn } from '@/lib/utils'
import { getAnnouncements } from '@/services/announcement.service'
import { getUserAccessRequests } from '@/services/access-request.service'

export function DashboardLayout() {
  const user = useAuthStore((s) => s.user)
  const secureSignOut = useSecureSignOut()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  useHeartbeat()

  const lastReadAt = useNotificationsStore((s) => s.announcementsLastReadAt)
  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements'],
    queryFn: getAnnouncements,
    staleTime: 5 * 60_000,
    enabled: !!user,
  })
  const unreadCount = announcements.filter((a) => a.createdAt.getTime() > lastReadAt).length

  const { data: myRequests = [] } = useQuery({
    queryKey: ['access-requests', 'me'],
    queryFn: () => getUserAccessRequests(user!.id),
    enabled: !!user,
    staleTime: 60_000,
  })
  const pendingRequestsCount = myRequests.filter((r) => r.status === 'pending').length

  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          aria-hidden
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-30 w-64 bg-card border-r border-border flex flex-col shrink-0',
          'transition-transform duration-200 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        aria-label="Navegação principal"
      >
        {/* Brand */}
        <div className="h-14 flex items-center px-5 border-b border-border shrink-0">
          <Link
            to="/"
            className="font-bold text-base text-foreground tracking-tight hover:opacity-75 transition-opacity"
            onClick={closeSidebar}
          >
            Sebratel Hub
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 flex flex-col gap-0.5 overflow-y-auto" aria-label="Menu principal">
          <NavLink
            to="/"
            end
            onClick={closeSidebar}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )
            }
          >
            <LayoutGrid className="h-4 w-4 shrink-0" aria-hidden />
            Aplicativos
          </NavLink>

          <NavLink
            to="/avisos"
            onClick={closeSidebar}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )
            }
          >
            <Bell className="h-4 w-4 shrink-0" aria-hidden />
            Avisos
            {unreadCount > 0 && (
              <span className="ml-auto text-[10px] font-bold leading-none bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </NavLink>

          <NavLink
            to="/sugestoes"
            onClick={closeSidebar}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )
            }
          >
            <MessageSquare className="h-4 w-4 shrink-0" aria-hidden />
            Sugestões
          </NavLink>

          <NavLink
            to="/minhas-solicitacoes"
            onClick={closeSidebar}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )
            }
          >
            <ClipboardList className="h-4 w-4 shrink-0" aria-hidden />
            Solicitações
            {pendingRequestsCount > 0 && (
              <span className="ml-auto text-[10px] font-bold leading-none bg-amber-100 text-amber-800 rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                {pendingRequestsCount > 99 ? '99+' : pendingRequestsCount}
              </span>
            )}
          </NavLink>

          {/* Admin link — somente para admins */}
          {user && canAccessAdminDashboard(user) && (
            <>
              <div className="my-2 h-px bg-border" />
              <NavLink
                to="/admin"
                onClick={closeSidebar}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )
                }
              >
                <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
                Administração
              </NavLink>
            </>
          )}
        </nav>

        {/* User section */}
        {user && (
          <div className="border-t border-border p-4 shrink-0">
            <div className="flex items-center gap-3">
              <Link
                to="/perfil"
                onClick={closeSidebar}
                className="flex items-center gap-3 flex-1 min-w-0 rounded-md hover:bg-accent transition-colors -mx-1 px-1 py-0.5"
                title="Editar perfil"
              >
                <UserAvatar name={user.name || user.email} photoUrl={user.photoUrl} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate leading-tight">
                    {user.name || user.email}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={secureSignOut}
                title="Encerrar sessão"
                aria-label="Encerrar sessão"
              >
                <LogOut className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>
        )}
      </aside>

      {/* Área principal */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Topbar mobile */}
        <header className="h-14 bg-primary flex items-center px-4 gap-3 shrink-0 lg:hidden shadow-sm">
          <button
            className="text-black/80 hover:text-black p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label={sidebarOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <span className="font-bold text-black/90 text-base tracking-tight">Sebratel Hub</span>
          {user && (
            <div className="ml-auto">
              <UserAvatar name={user.name || user.email} photoUrl={user.photoUrl} size="sm" />
            </div>
          )}
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
