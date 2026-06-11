import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { canAccessAdminDashboard } from '@/utils/permissions'
import { useAdminDashboard } from './hooks/useAdminDashboard'
import { AdminMetricCard } from './components/AdminMetricCard'
import { AdminPendingRequestsList } from './components/AdminPendingRequestsList'
import { AdminRecentActivityList } from './components/AdminRecentActivityList'
import { AdminErrorState } from './components/AdminErrorState'
import { AdminListSkeleton } from './components/AdminSkeleton'
import { AdminProfileChart } from './components/AdminProfileChart'
import { AdminTopAppsCard } from './components/AdminTopAppsCard'
import { AdminOnlineWidget } from './components/AdminOnlineWidget'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  RefreshCw, Users, LayoutGrid, Clock, ShieldCheck,
  UsersRound, Bell, MessageSquare, AlertTriangle,
} from 'lucide-react'

export function AdminDashboard() {
  const user = useAuthStore((s) => s.user)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const { metrics, stats, pendingRequests, recentAuditLogs, isLoading, hasError, refetchAll } =
    useAdminDashboard()

  const handleRefresh = useCallback(() => {
    refetchAll()
    setLastUpdated(new Date())
  }, [refetchAll])

  if (!user || !canAccessAdminDashboard(user)) return null

  const hasPendingSuggestions = metrics.pendingSuggestions > 0

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
        <div className="flex flex-col items-end gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            aria-label="Atualizar dados"
          >
            <RefreshCw
              className={cn('h-4 w-4 mr-1.5', isLoading && 'animate-spin')}
              aria-hidden
            />
            Atualizar
          </Button>
          {lastUpdated && !isLoading && (
            <span className="text-[11px] text-muted-foreground tabular-nums">
              Atualizado às{' '}
              {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {/* Alerta — sugestões pendentes */}
      {!isLoading && hasPendingSuggestions && (
        <Link
          to="/admin/suggestions"
          className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 hover:bg-amber-100 transition-colors"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          <span>
            <span className="font-semibold">{metrics.pendingSuggestions}</span>{' '}
            {metrics.pendingSuggestions === 1 ? 'sugestão aguarda' : 'sugestões aguardam'} revisão.
          </span>
          <span className="ml-auto text-xs font-medium underline underline-offset-2">
            Ver sugestões →
          </span>
        </Link>
      )}

      {/* Error banner */}
      {hasError && !isLoading && (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
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

      {/* Metrics — Usuários e Apps */}
      <section aria-label="Métricas de usuários e apps">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
          Usuários &amp; Apps
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
            title="Sol. Pendentes"
            value={metrics.pendingRequests}
            icon={<Clock className="h-4 w-4" />}
            variant={metrics.pendingRequests > 0 ? 'warning' : 'default'}
            isLoading={isLoading}
          />
        </div>
      </section>

      {/* Metrics — Módulos */}
      <section aria-label="Métricas de módulos">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
          Módulos
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <AdminMetricCard
            title="Times Ativos"
            value={metrics.activeTeams}
            icon={<UsersRound className="h-4 w-4" />}
            isLoading={isLoading}
          />
          <AdminMetricCard
            title="Avisos Ativos"
            value={metrics.activeAnnouncements}
            icon={<Bell className="h-4 w-4" />}
            isLoading={isLoading}
          />
          <AdminMetricCard
            title="Sugestões Pendentes"
            value={metrics.pendingSuggestions}
            icon={<MessageSquare className="h-4 w-4" />}
            variant={hasPendingSuggestions ? 'warning' : 'default'}
            isLoading={isLoading}
          />
        </div>
      </section>

      {/* Charts + Presença Online */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AdminProfileChart
          data={stats?.profileDistribution ?? []}
          isLoading={isLoading}
        />
        <AdminTopAppsCard
          data={stats?.topApps ?? []}
          isLoading={isLoading}
        />
        <AdminOnlineWidget />
      </div>

      {/* Lower panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        <section
          className="rounded-xl border border-border bg-card p-4"
          aria-label="Atividade recente"
        >
          <h2 className="text-sm font-semibold text-foreground mb-3">Atividade Recente</h2>
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
