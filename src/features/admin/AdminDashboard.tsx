import { useAuthStore } from '@/stores/auth.store'
import { canAccessAdminDashboard } from '@/utils/permissions'
import { useAdminDashboard } from './hooks/useAdminDashboard'
import { AdminMetricCard } from './components/AdminMetricCard'
import { AdminPendingRequestsList } from './components/AdminPendingRequestsList'
import { AdminRecentActivityList } from './components/AdminRecentActivityList'
import { AdminErrorState } from './components/AdminErrorState'
import { AdminListSkeleton } from './components/AdminSkeleton'
import { Button } from '@/components/ui/button'
import { RefreshCw, Users, LayoutGrid, Clock, ShieldCheck } from 'lucide-react'

export function AdminDashboard() {
  const user = useAuthStore((s) => s.user)

  // All hooks must be called before conditional returns (React rules of hooks).
  // AdminRoute already ensures only admins reach this component; the check
  // below is a defense-in-depth guard against direct navigation.
  const { metrics, pendingRequests, recentAuditLogs, isLoading, hasError, refetchAll } =
    useAdminDashboard()

  if (!user || !canAccessAdminDashboard(user)) return null

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Painel Administrativo</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão geral do Hub Sebratel — somente leitura
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refetchAll}
          disabled={isLoading}
          aria-label="Atualizar dados"
        >
          <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Error banner */}
      {hasError && !isLoading && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3"
        >
          <p className="text-sm text-destructive">
            Alguns dados não puderam ser carregados.{' '}
            <button
              className="underline underline-offset-2 hover:text-destructive/80"
              onClick={refetchAll}
            >
              Tentar novamente
            </button>
          </p>
        </div>
      )}

      {/* Metrics grid */}
      <section aria-label="Métricas">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Visão Geral
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <AdminMetricCard
            title="Total de Usuários"
            value={metrics.totalUsers}
            icon={<Users className="h-4 w-4" />}
            isLoading={isLoading}
          />
          <AdminMetricCard
            title="Usuários Ativos"
            value={metrics.activeUsers}
            variant="success"
            isLoading={isLoading}
          />
          <AdminMetricCard
            title="Usuários Inativos"
            value={metrics.inactiveUsers}
            variant={metrics.inactiveUsers > 0 ? 'warning' : 'default'}
            isLoading={isLoading}
          />
          <AdminMetricCard
            title="Administradores"
            value={metrics.adminUsers}
            icon={<ShieldCheck className="h-4 w-4" />}
            isLoading={isLoading}
          />
          <AdminMetricCard
            title="Apps Ativos"
            value={metrics.activeApps}
            icon={<LayoutGrid className="h-4 w-4" />}
            variant="success"
            isLoading={isLoading}
          />
          <AdminMetricCard
            title="Apps Inativos"
            value={metrics.inactiveApps}
            variant={metrics.inactiveApps > 0 ? 'warning' : 'default'}
            isLoading={isLoading}
          />
          <AdminMetricCard
            title="Solicitações Pendentes"
            value={metrics.pendingRequests}
            icon={<Clock className="h-4 w-4" />}
            variant={metrics.pendingRequests > 0 ? 'warning' : 'default'}
            isLoading={isLoading}
          />
        </div>
      </section>

      {/* Lower panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending requests */}
        <section
          className="rounded-xl border border-border bg-card p-4"
          aria-label="Solicitações pendentes"
        >
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Últimas Solicitações Pendentes
          </h2>
          {isLoading ? (
            <AdminListSkeleton rows={4} />
          ) : hasError ? (
            <AdminErrorState onRetry={refetchAll} />
          ) : (
            <AdminPendingRequestsList requests={pendingRequests} />
          )}
        </section>

        {/* Recent audit activity */}
        <section
          className="rounded-xl border border-border bg-card p-4"
          aria-label="Atividade recente"
        >
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Atividade Recente
          </h2>
          {isLoading ? (
            <AdminListSkeleton rows={4} />
          ) : hasError ? (
            <AdminErrorState onRetry={refetchAll} />
          ) : (
            <AdminRecentActivityList logs={recentAuditLogs} />
          )}
        </section>
      </div>
    </div>
  )
}
