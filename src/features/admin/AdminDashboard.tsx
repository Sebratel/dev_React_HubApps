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
  UsersRound, Bell, MessageSquare, AlertTriangle, UserX,
} from 'lucide-react'

const zone = (delay: number): React.CSSProperties => ({
  animationDelay: `${delay}ms`,
  animationFillMode: 'both',
})

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
  const hasPendingUsers       = metrics.inactiveUsers > 0
  const hasAlerts             = !isLoading && (hasPendingUsers || hasPendingSuggestions)

  const usersPercent =
    metrics.totalUsers > 0
      ? Math.round((metrics.activeUsers / metrics.totalUsers) * 100)
      : 0

  return (
    <div className="flex flex-col gap-6">

      {/* Zona 1 — Comando */}
      <div
        className="flex items-center justify-between gap-4 animate-fade-in"
        style={zone(0)}
      >
        <h1 className="text-2xl font-bold text-foreground">Painel Administrativo</h1>
        <div className="flex items-center gap-3">
          {lastUpdated && !isLoading && (
            <span className="text-[11px] text-muted-foreground tabular-nums">
              Atualizado às{' '}
              {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
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
        </div>
      </div>

      {/* Zona 2 — Triagem (condicional) */}
      {hasAlerts && (
        <div
          className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 animate-fade-in"
          style={zone(40)}
        >
          <p className="text-sm font-semibold text-amber-800 mb-2">Atenção necessária</p>
          <div className="flex flex-col gap-1.5">
            {hasPendingUsers && (
              <Link
                to="/admin/users"
                className="flex items-center gap-2 rounded-lg px-2 py-1 -mx-2 text-sm text-amber-800 hover:bg-amber-100/60 transition-colors"
              >
                <UserX className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="flex-1">
                  <span className="font-medium">{metrics.inactiveUsers}</span>{' '}
                  {metrics.inactiveUsers === 1
                    ? 'usuário inativo aguarda'
                    : 'usuários inativos aguardam'}{' '}
                  ativação
                </span>
                <span className="text-xs font-medium underline underline-offset-2 shrink-0">
                  Gerenciar →
                </span>
              </Link>
            )}
            {hasPendingSuggestions && (
              <Link
                to="/admin/suggestions"
                className="flex items-center gap-2 rounded-lg px-2 py-1 -mx-2 text-sm text-amber-800 hover:bg-amber-100/60 transition-colors"
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="flex-1">
                  <span className="font-medium">{metrics.pendingSuggestions}</span>{' '}
                  {metrics.pendingSuggestions === 1
                    ? 'sugestão aguarda'
                    : 'sugestões aguardam'}{' '}
                  revisão
                </span>
                <span className="text-xs font-medium underline underline-offset-2 shrink-0">
                  Ver todas →
                </span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Error banner */}
      {hasError && !isLoading && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 animate-fade-in"
          style={zone(40)}
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

      {/* Zona 3 — Monitoramento */}
      <section aria-label="Métricas de monitoramento">
        {/* 3A — KPIs críticos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <AdminMetricCard
            title="Usuários"
            value={metrics.totalUsers}
            description={`${metrics.activeUsers} ativos (${usersPercent}%)`}
            icon={<Users className="h-4 w-4" />}
            isLoading={isLoading}
            delay={60}
          />
          <AdminMetricCard
            title="Apps Ativos"
            value={metrics.activeApps}
            icon={<LayoutGrid className="h-4 w-4" />}
            variant="success"
            isLoading={isLoading}
            delay={110}
          />
          <AdminMetricCard
            title="Sol. Pendentes"
            value={metrics.pendingRequests}
            icon={<Clock className="h-4 w-4" />}
            variant={metrics.pendingRequests > 0 ? 'warning' : 'default'}
            isLoading={isLoading}
            delay={160}
          />
        </div>

        {/* 3B — Métricas secundárias */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-3">
          <AdminMetricCard
            title="Usuários Inativos"
            value={metrics.inactiveUsers}
            variant={metrics.inactiveUsers > 0 ? 'warning' : 'default'}
            isLoading={isLoading}
            delay={180}
          />
          <AdminMetricCard
            title="Administradores"
            value={metrics.adminUsers}
            icon={<ShieldCheck className="h-4 w-4" />}
            isLoading={isLoading}
            delay={210}
          />
          <AdminMetricCard
            title="Apps Inativos"
            value={metrics.inactiveApps}
            variant={metrics.inactiveApps > 0 ? 'warning' : 'default'}
            isLoading={isLoading}
            delay={240}
          />
          <AdminMetricCard
            title="Times Ativos"
            value={metrics.activeTeams}
            icon={<UsersRound className="h-4 w-4" />}
            isLoading={isLoading}
            delay={270}
          />
          <AdminMetricCard
            title="Avisos Ativos"
            value={metrics.activeAnnouncements}
            icon={<Bell className="h-4 w-4" />}
            isLoading={isLoading}
            delay={300}
          />
          <AdminMetricCard
            title="Sugestões Pend."
            value={metrics.pendingSuggestions}
            icon={<MessageSquare className="h-4 w-4" />}
            variant={hasPendingSuggestions ? 'warning' : 'default'}
            isLoading={isLoading}
            delay={330}
          />
        </div>
      </section>

      {/* Zona 4A — Inteligência: widgets */}
      <div
        className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in"
        style={zone(370)}
      >
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

      {/* Zona 4B — Inteligência: painéis de atividade */}
      <div
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in"
        style={zone(430)}
      >
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
