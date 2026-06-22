import { useState } from 'react'
import { Outlet, NavLink, Link } from 'react-router-dom'
import { LayoutGrid, Bell, MessageSquare, ShieldCheck, Menu, X, LogOut, ClipboardList } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'
import { SebratelLogo } from '@/components/SebratelLogo'
import { useNotificationsStore } from '@/stores/notifications.store'
import { canAccessAdminDashboard } from '@/utils/permissions'
import { UserAvatar } from '@/components/UserAvatar'
import { useSecureSignOut } from '@/hooks/useSecureSignOut'
import { useHeartbeat } from '@/hooks/useHeartbeat'
import { cn } from '@/lib/utils'
import { getAnnouncements } from '@/services/announcement.service'
import { getUserAccessRequests } from '@/services/access-request.service'

const NAV_ITEMS = [
  { to: '/',                    label: 'Aplicativos',  icon: LayoutGrid,    end: true  },
  { to: '/avisos',              label: 'Avisos',       icon: Bell,          end: false },
  { to: '/sugestoes',           label: 'Sugestões',    icon: MessageSquare, end: false },
  { to: '/minhas-solicitacoes', label: 'Solicitações', icon: ClipboardList, end: false },
]

export function DashboardLayout() {
  const user = useAuthStore((s) => s.user)
  const secureSignOut = useSecureSignOut()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  useHeartbeat()

  const readIds = useNotificationsStore((s) => s.readAnnouncementIds)
  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements'],
    queryFn: getAnnouncements,
    staleTime: 5 * 60_000,
    enabled: !!user,
  })
  const unreadCount = announcements.filter((a) => !readIds.includes(a.id)).length

  const { data: myRequests = [] } = useQuery({
    queryKey: ['access-requests', 'me'],
    queryFn: () => getUserAccessRequests(user!.id),
    enabled: !!user,
    staleTime: 60_000,
  })
  const pendingRequestsCount = myRequests.filter((r) => r.status === 'pending').length

  const badges: Record<string, number> = {
    '/avisos':              unreadCount,
    '/minhas-solicitacoes': pendingRequestsCount,
  }

  return (
    <div className="h-screen overflow-hidden flex bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          aria-hidden
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      {/* Desktop: static flex item (pushes content naturally). Mobile: fixed overlay drawer. */}
      <aside
        className={cn(
          'flex flex-col bg-card border-r border-border shrink-0 w-56',
          'fixed lg:static inset-y-0 left-0 z-30',
          'transition-transform lg:transition-none duration-200 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
        aria-label="Navegação principal"
      >
        {/* Brand */}
        <div className="h-16 flex items-center gap-3 px-[14px] border-b border-border/70 shrink-0">
          <Link
            to="/"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 rounded-xl transition-transform duration-150 active:scale-95"
          >
            <SebratelLogo size={34} />
            <span className="flex flex-col leading-none">
              <span className="font-extrabold text-[15px] text-foreground tracking-tight">Sebratel</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary mt-0.5">Hub</span>
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5 overflow-y-auto" aria-label="Menu principal">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => {
            const count = badges[to] ?? 0
            return (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'relative flex items-center gap-3 px-[10px] py-2.5 rounded-xl text-sm',
                    'transition-all duration-150',
                    isActive
                      ? 'bg-primary/12 font-semibold text-primary'
                      : 'font-medium text-muted-foreground hover:bg-accent hover:text-foreground',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" aria-hidden />
                    )}
                    <Icon className="sidebar-nav-icon h-[18px] w-[18px] shrink-0" aria-hidden />
                    <span className="flex-1 leading-none">{label}</span>
                    {count > 0 && (
                      <span className="ml-auto text-[10px] font-bold leading-none bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                        {count > 99 ? '99+' : count}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            )
          })}

          {/* Admin link */}
          {user && canAccessAdminDashboard(user) && (
            <>
              <div className="my-2 mx-1 h-px bg-border" />
              <NavLink
                to="/admin"
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'relative flex items-center gap-3 px-[10px] py-2.5 rounded-xl text-sm',
                    'transition-all duration-150',
                    isActive
                      ? 'bg-primary/12 font-semibold text-primary'
                      : 'font-medium text-muted-foreground hover:bg-accent hover:text-foreground',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" aria-hidden />
                    )}
                    <ShieldCheck className="sidebar-nav-icon h-[18px] w-[18px] shrink-0" aria-hidden />
                    <span className="flex-1 leading-none">Administração</span>
                  </>
                )}
              </NavLink>
            </>
          )}
        </nav>

        {/* User section */}
        {user && (
          <div className="border-t border-border p-2 shrink-0 flex flex-col gap-0.5">
            <Link
              to="/perfil"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 rounded-xl px-[10px] py-2 hover:bg-accent transition-colors"
              title="Editar perfil"
            >
              <UserAvatar name={user.name || user.email} photoUrl={user.photoUrl} size="sm" className="shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate leading-tight">
                  {user.name || user.email}
                </p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </Link>
            <button
              onClick={secureSignOut}
              className="flex items-center gap-3 w-full rounded-xl px-[10px] py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              title="Encerrar sessão"
              aria-label="Encerrar sessão"
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" aria-hidden />
              <span>Sair</span>
            </button>
          </div>
        )}
      </aside>

      {/* ── Main column ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 h-full">
        {/* Topbar — mobile only */}
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

        <main className="flex-1 p-4 sm:p-6 overflow-y-auto min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
