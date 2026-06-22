import { useState } from 'react'
import { RefreshCw, Search, Download, ScrollText } from 'lucide-react'
import { listAuditLogs } from '@/services/admin/admin-audit-log.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { canAccessAdminDashboard } from '@/utils/permissions'
import { AUDIT_ACTION } from '@/types/api'
import { PageHero, type HeroStat } from '@/components/PageHero'
import { useAuditLogsPage, PAGE_SIZE } from './hooks/useAuditLogsPage'
import {
  AuditLogsTable,
  AuditLogsTableEmpty,
  AuditLogsTableSkeleton,
} from './components/AuditLogsTable'
import { AuditLogDetailsDialog } from './components/AuditLogDetailsDialog'
import { AuditLogsPagination } from './components/AuditLogsPagination'
import type { AuditLogModel } from '@/types/models'
import type { AuditAction } from '@/types/api'
import { useReducedMotion } from 'framer-motion'

// ─── Action options for <select> ─────────────────────────────────────────────

const ACTION_OPTIONS: { value: AuditAction | 'all'; label: string }[] = [
  { value: 'all', label: 'Todas as ações' },
  { value: AUDIT_ACTION.LOGIN, label: 'Login' },
  { value: AUDIT_ACTION.LOGOUT, label: 'Logout' },
  { value: AUDIT_ACTION.APP_OPEN, label: 'Abriu app' },
  { value: AUDIT_ACTION.USER_UPDATE, label: 'Atualizou usuário' },
  { value: AUDIT_ACTION.USER_ACTIVATE, label: 'Ativou usuário' },
  { value: AUDIT_ACTION.USER_DEACTIVATE, label: 'Desativou usuário' },
  { value: AUDIT_ACTION.USER_PROMOTE_ADMIN, label: 'Promoveu a admin' },
  { value: AUDIT_ACTION.USER_REVOKE_ADMIN, label: 'Revogou admin' },
  { value: AUDIT_ACTION.APP_CREATE, label: 'Criou app' },
  { value: AUDIT_ACTION.APP_UPDATE, label: 'Atualizou app' },
  { value: AUDIT_ACTION.APP_DEACTIVATE, label: 'Desativou app' },
  { value: AUDIT_ACTION.APP_REACTIVATE, label: 'Reativou app' },
  { value: AUDIT_ACTION.ACCESS_REQUEST_CREATE, label: 'Solicitou acesso' },
  { value: AUDIT_ACTION.ACCESS_REQUEST_APPROVE, label: 'Aprovou solicitação' },
  { value: AUDIT_ACTION.ACCESS_REQUEST_REJECT, label: 'Rejeitou solicitação' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AuditLogsManagementPage() {
  const currentUser = useAuthStore((s) => s.user)

  const {
    logs,
    totalLogs,
    totalPages,
    isLoading,
    isError,
    refetch,
    filters,
    setFilters,
    hasFilters,
    serverParams,
  } = useAuditLogsPage()

  const [selectedLog, setSelectedLog] = useState<AuditLogModel | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const reduced = useReducedMotion()

  async function handleExportCsv() {
    setIsExporting(true)
    try {
      const result = await listAuditLogs({ ...serverParams, limit: 5000, offset: 0 })
      const headers = ['Data/Hora', 'Usuário', 'ID Usuário', 'Ação', 'Detalhes']
      const rows = result.data.map((log) => [
        log.timestamp.toLocaleString('pt-BR'),
        log.userName,
        log.userId,
        log.action,
        log.details,
      ])
      const csv = [headers, ...rows]
        .map((row) => row.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
        .join('\n')
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // silently fail — user can retry
    } finally {
      setIsExporting(false)
    }
  }

  if (!currentUser || !canAccessAdminDashboard(currentUser)) return null

  function handlePageChange(page: number) {
    setFilters((f) => ({ ...f, page }))
  }

  const hasCustomDates = !!filters.dateFrom || !!filters.dateTo

  function clearFilters() {
    setFilters({ search: '', action: 'all', period: 'all', dateFrom: '', dateTo: '', page: 1 })
  }

  function handlePeriodChange(period: typeof filters.period) {
    setFilters((f) => ({ ...f, period, dateFrom: '', dateTo: '', page: 1 }))
  }

  function handleDateChange(field: 'dateFrom' | 'dateTo', value: string) {
    setFilters((f) => ({ ...f, [field]: value, period: 'all', page: 1 }))
  }

  const heroStats: HeroStat[] = [
    { icon: ScrollText, value: totalLogs, label: 'eventos registrados', tone: 'muted' },
  ]

  const QUICK_PERIODS: { label: string; value: typeof filters.period }[] = [
    { label: 'Hoje',           value: 'today'      },
    { label: 'Últimos 7 dias', value: 'last7days'  },
    { label: 'Últimos 30 dias',value: 'last30days' },
    { label: 'Qualquer período',value: 'all'       },
  ]

  const QUICK_ACTIONS: { label: string; value: AuditAction }[] = [
    { label: 'Login',              value: AUDIT_ACTION.LOGIN              },
    { label: 'App aberto',         value: AUDIT_ACTION.APP_OPEN           },
    { label: 'Usuário ativado',    value: AUDIT_ACTION.USER_ACTIVATE      },
    { label: 'Usuário desativado', value: AUDIT_ACTION.USER_DEACTIVATE    },
    { label: 'Solicitação criada', value: AUDIT_ACTION.ACCESS_REQUEST_CREATE },
  ]

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHero
        icon={ScrollText}
        title="Logs de Auditoria"
        subtitle="Histórico completo de ações realizadas no sistema."
        stats={!isLoading && totalLogs > 0 ? heroStats : undefined}
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_260px] gap-6 items-start">
        {/* ── Coluna principal ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-6 min-w-0">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {isLoading ? 'Carregando...' : `${totalLogs} evento${totalLogs !== 1 ? 's' : ''} no total`}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                disabled={isLoading || isExporting || totalLogs === 0}
                aria-label="Exportar CSV"
              >
                <Download className={`h-4 w-4 mr-1.5 ${isExporting ? 'animate-bounce' : ''}`} />
                {isExporting ? 'Exportando...' : 'Exportar CSV'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void refetch()}
                disabled={isLoading}
                aria-label="Atualizar lista"
              >
                <RefreshCw className={cn('h-4 w-4 mr-1.5', isLoading && 'animate-spin')} aria-hidden />
                Atualizar
              </Button>
            </div>
          </div>

          {/* Error banner */}
          {isError && !isLoading && (
            <div
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3"
            >
              <p className="text-sm text-destructive">
                Erro ao carregar logs.{' '}
                <button
                  className="underline underline-offset-2 hover:text-destructive/80"
                  onClick={() => void refetch()}
                >
                  Tentar novamente
                </button>
              </p>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Buscar por usuário ou detalhes..."
                className="pl-9"
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              />
            </div>

            <Select
              className="w-52"
              value={filters.action}
              onChange={(e) =>
                setFilters((f) => ({ ...f, action: e.target.value as typeof f.action, page: 1 }))
              }
              aria-label="Filtrar por ação"
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>

            {/* Period preset */}
            <Select
              className="w-44"
              value={hasCustomDates ? 'all' : filters.period}
              onChange={(e) => handlePeriodChange(e.target.value as typeof filters.period)}
              disabled={hasCustomDates}
              aria-label="Filtrar por período"
            >
              <option value="all">{hasCustomDates ? 'Período customizado' : 'Qualquer período'}</option>
              <option value="today">Hoje</option>
              <option value="last7days">Últimos 7 dias</option>
              <option value="last30days">Últimos 30 dias</option>
            </Select>

            {/* Custom date range */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">De</span>
              <Input
                type="date"
                className="w-36"
                value={filters.dateFrom}
                max={filters.dateTo || undefined}
                onChange={(e) => handleDateChange('dateFrom', e.target.value)}
                aria-label="Data inicial"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">até</span>
              <Input
                type="date"
                className="w-36"
                value={filters.dateTo}
                min={filters.dateFrom || undefined}
                onChange={(e) => handleDateChange('dateTo', e.target.value)}
                aria-label="Data final"
              />
            </div>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Limpar filtros
              </Button>
            )}
          </div>

          {/* Table */}
          {isLoading ? (
            <AuditLogsTableSkeleton />
          ) : logs.length === 0 ? (
            <AuditLogsTableEmpty hasFilters={hasFilters} />
          ) : (
            <AuditLogsTable logs={logs} onDetails={setSelectedLog} />
          )}

          {/* Pagination */}
          {!isLoading && !isError && (
            <AuditLogsPagination
              page={filters.page}
              totalPages={totalPages}
              totalLogs={totalLogs}
              pageSize={PAGE_SIZE}
              onPageChange={handlePageChange}
              disabled={isLoading}
            />
          )}
        </div>

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <aside className="flex flex-col gap-4 xl:sticky xl:top-6">
          {/* Stats */}
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Resumo
            </p>
            {isLoading ? (
              <div className="space-y-2">
                <div className="h-8 rounded-lg bg-muted animate-pulse" />
                <div className="h-3 w-24 rounded bg-muted animate-pulse" />
              </div>
            ) : (
              <>
                <p className="text-3xl font-bold tabular-nums text-foreground">{totalLogs.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  eventos registrados
                </p>
                {totalPages > 1 && (
                  <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
                    Página {filters.page} de {totalPages}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Quick periods */}
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Período rápido
            </p>
            <div className="flex flex-col gap-1">
              {QUICK_PERIODS.map(({ label, value }) => {
                const isActive = !hasCustomDates && filters.period === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handlePeriodChange(value)}
                    className={cn(
                      'text-left px-3 py-1.5 rounded-lg text-sm transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Quick actions */}
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Ações frequentes
            </p>
            <div className="flex flex-col gap-1">
              {QUICK_ACTIONS.map(({ label, value }) => {
                const isActive = filters.action === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilters((f) => ({ ...f, action: isActive ? 'all' : value, page: 1 }))}
                    className={cn(
                      'text-left px-3 py-1.5 rounded-lg text-sm transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        </aside>
      </div>

      {/* Details dialog (read-only) */}
      <AuditLogDetailsDialog
        log={selectedLog}
        open={selectedLog !== null}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  )
}
