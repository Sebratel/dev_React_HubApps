import { useState } from 'react'
import { Outlet, NavLink, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Menu, X, LayoutDashboard, Users, ClipboardList, LayoutGrid,
  Bell, UsersRound, MessageSquare, ArrowLeft, ScrollText, Sparkles, BookOpen, BarChart2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SebratelLogo } from '@/components/SebratelLogo'
import { getAdminStats } from '@/services/admin/admin-stats.service'

const NAV_ITEMS = [
  { to: '/admin',                 label: 'Dashboard',    icon: LayoutDashboard, end: true  },
  { to: '/admin/users',           label: 'Usuários',     icon: Users,           end: false },
  { to: '/admin/teams',           label: 'Times',        icon: UsersRound,      end: false },
  { to: '/admin/access-requests', label: 'Solicitações', icon: ClipboardList,   end: false },
  { to: '/admin/apps',            label: 'Aplicativos',  icon: LayoutGrid,      end: false },
  { to: '/admin/highlights',      label: 'Destaques',    icon: Sparkles,        end: false },
  { to: '/admin/announcements',   label: 'Avisos',       icon: Bell,            end: false },
  { to: '/admin/suggestions',     label: 'Sugestões',    icon: MessageSquare,   end: false },
  { to: '/admin/manuals',          label: 'Manuais',      icon: BookOpen,        end: false },
  { to: '/admin/analytics',       label: 'Analytics',    icon: BarChart2,       end: false },
  { to: '/admin/audit-logs',      label: 'Auditoria',    icon: ScrollText,      end: false },
]

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { data: stats } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: getAdminStats,
    staleTime: 60_000,
    refetchInterval: 2 * 60_000,
  })

  const badges: Record<string, number> = {
    '/admin/access-requests': stats?.pendingRequests    ?? 0,
    '/admin/suggestions':     stats?.pendingSuggestions ?? 0,
    '/admin/users':           stats?.inactiveUsers      ?? 0,
  }

  return (
    <div className="h-screen overflow-hidden flex bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          aria-hidden
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      {/* Desktop: static flex item (pushes content naturally). Mobile: fixed overlay drawer. */}
      <aside
        className={cn(
          'flex flex-col bg-card border-r border-border shrink-0 w-56',
          'fixed md:static inset-y-0 left-0 z-30',
          'transition-transform md:transition-none duration-200 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
        aria-label="Navegação admin"
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
              <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary mt-0.5">Admin</span>
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5 overflow-y-auto" aria-label="Menu administrativo">
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
                      <span className="ml-auto text-[10px] font-bold leading-none bg-primary/15 text-primary rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                        {count > 99 ? '99+' : count}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            )
          })}

          {/* Back to Hub */}
          <div className="mt-auto pt-2 border-t border-border">
            <Link
              to="/"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-[10px] py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <ArrowLeft className="sidebar-nav-icon h-[18px] w-[18px] shrink-0" aria-hidden />
              <span>Voltar ao Hub</span>
            </Link>
          </div>
        </nav>
      </aside>

      {/* ── Main column ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 h-full">
        {/* Topbar — mobile only */}
        <header className="h-14 bg-primary flex items-center px-4 shadow-sm gap-3 shrink-0 md:hidden">
          <button
            className="text-black/80 hover:text-black p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label={sidebarOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <span className="font-bold text-black/90 text-base tracking-tight">Admin</span>
        </header>

        <main className="flex-1 p-4 sm:p-6 overflow-y-auto min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
