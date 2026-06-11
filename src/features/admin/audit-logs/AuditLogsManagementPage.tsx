import { useState } from 'react'
import { RefreshCw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useAuthStore } from '@/stores/auth.store'
import { canAccessAdminDashboard } from '@/utils/permissions'
import { AUDIT_ACTION } from '@/types/api'
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
  } = useAuditLogsPage()

  const [selectedLog, setSelectedLog] = useState<AuditLogModel | null>(null)

  if (!currentUser || !canAccessAdminDashboard(currentUser)) return null

  function handlePageChange(page: number) {
    setFilters((f) => ({ ...f, page }))
  }

  function clearFilters() {
    setFilters({ search: '', action: 'all', period: 'all', page: 1 })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Logs de Auditoria</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading
              ? 'Carregando...'
              : `${totalLogs} evento${totalLogs !== 1 ? 's' : ''} no total`}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          disabled={isLoading}
          aria-label="Atualizar lista"
        >
          <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
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
            setFilters((f) => ({
              ...f,
              action: e.target.value as typeof f.action,
              page: 1,
            }))
          }
          aria-label="Filtrar por ação"
        >
          {ACTION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>

        <Select
          className="w-44"
          value={filters.period}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              period: e.target.value as typeof f.period,
              page: 1,
            }))
          }
          aria-label="Filtrar por período"
        >
          <option value="all">Qualquer período</option>
          <option value="today">Hoje</option>
          <option value="last7days">Últimos 7 dias</option>
          <option value="last30days">Últimos 30 dias</option>
        </Select>

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

      {/* Pagination (only shown when data loaded and total > PAGE_SIZE) */}
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

      {/* Details dialog (read-only) */}
      <AuditLogDetailsDialog
        log={selectedLog}
        open={selectedLog !== null}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  )
}
