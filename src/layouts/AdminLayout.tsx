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
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Usuários', icon: Users },
  { to: '/admin/access-requests', label: 'Solicitações', icon: ClipboardList },
  { to: '/admin/apps', label: 'Aplicativos', icon: AppWindow },
  { to: '/admin/audit-logs', label: 'Auditoria', icon: BookOpen },
]

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  return (
    <nav className="flex flex-col gap-1 p-3" aria-label="Menu administrativo">
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
                ? 'bg-sebratel-primary text-black'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )
          }
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden />
          {label}
        </NavLink>
      ))}

      <div className="mt-auto pt-4 border-t border-border">
        <Link
          to="/"
          onClick={onNavClick}
          className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
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
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 bg-sebratel-secondary flex items-center px-4 shadow-md gap-3 shrink-0">
        <button
          className="md:hidden text-white/80 hover:text-white p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          onClick={() => setSidebarOpen((o) => !o)}
          aria-label={sidebarOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={sidebarOpen}
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <span className="font-semibold text-white text-lg tracking-wide">Sebratel Hub — Admin</span>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
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
            'fixed md:static inset-y-0 left-0 z-30 w-56 bg-card border-r border-border flex flex-col',
            'transition-transform duration-200 ease-in-out',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          )}
          aria-label="Navegação admin"
        >
          <SidebarContent onNavClick={() => setSidebarOpen(false)} />
        </aside>

        <main className="flex-1 p-4 sm:p-6 overflow-y-auto min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
