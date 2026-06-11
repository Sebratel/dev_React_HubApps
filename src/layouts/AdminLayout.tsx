import { useState } from 'react'
import { Outlet, NavLink, Link } from 'react-router-dom'
import {
  Menu,
  X,
  LayoutDashboard,
  Users,
  ClipboardList,
  AppWindow,
  BookOpen,
  ArrowLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/admin',                  label: 'Dashboard',    icon: LayoutDashboard, end: true },
  { to: '/admin/users',            label: 'Usuários',     icon: Users            },
  { to: '/admin/access-requests',  label: 'Solicitações', icon: ClipboardList    },
  { to: '/admin/apps',             label: 'Aplicativos',  icon: AppWindow        },
  { to: '/admin/audit-logs',       label: 'Auditoria',    icon: BookOpen         },
]

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  return (
    <nav className="flex flex-col flex-1 p-3 gap-0.5 overflow-y-auto" aria-label="Menu administrativo">
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavClick}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )
          }
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden />
          {label}
        </NavLink>
      ))}

      <div className="mt-auto pt-3 border-t border-border">
        <Link
          to="/"
          onClick={onNavClick}
          className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          Voltar ao Hub
        </Link>
      </div>
    </nav>
  )
}

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          aria-hidden
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed md:static inset-y-0 left-0 z-30 w-64 bg-card border-r border-border flex flex-col shrink-0',
          'transition-transform duration-200 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
        aria-label="Navegação admin"
      >
        {/* Brand */}
        <div className="h-14 flex items-center px-5 border-b border-border shrink-0 gap-2">
          <Link
            to="/"
            className="font-bold text-base text-foreground tracking-tight hover:opacity-75 transition-opacity"
            onClick={() => setSidebarOpen(false)}
          >
            Sebratel Hub
          </Link>
          <span className="text-xs font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-sm">
            Admin
          </span>
        </div>

        <SidebarContent onNavClick={() => setSidebarOpen(false)} />
      </aside>

      {/* Área principal */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Topbar mobile */}
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

        <main className="flex-1 p-6 overflow-y-auto min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
