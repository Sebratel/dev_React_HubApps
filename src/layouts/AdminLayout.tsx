import { Outlet, NavLink } from 'react-router-dom'

export function AdminLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="h-14 bg-sebratel-secondary flex items-center px-6 shadow-md">
        <span className="font-semibold text-white text-lg tracking-wide">Sebratel Hub — Admin</span>
      </header>
      <div className="flex flex-1">
        <nav className="w-56 bg-card border-r border-border p-4 flex flex-col gap-2">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sebratel-primary text-black'
                  : 'text-muted-foreground hover:bg-accent'
              }`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/admin/users"
            className={({ isActive }) =>
              `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sebratel-primary text-black'
                  : 'text-muted-foreground hover:bg-accent'
              }`
            }
          >
            Usuários
          </NavLink>
          <NavLink
            to="/admin/access-requests"
            className={({ isActive }) =>
              `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sebratel-primary text-black'
                  : 'text-muted-foreground hover:bg-accent'
              }`
            }
          >
            Solicitações
          </NavLink>
          <NavLink
            to="/admin/apps"
            className={({ isActive }) =>
              `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sebratel-primary text-black'
                  : 'text-muted-foreground hover:bg-accent'
              }`
            }
          >
            Aplicativos
          </NavLink>
          <NavLink
            to="/admin/audit-logs"
            className={({ isActive }) =>
              `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sebratel-primary text-black'
                  : 'text-muted-foreground hover:bg-accent'
              }`
            }
          >
            Auditoria
          </NavLink>
        </nav>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
