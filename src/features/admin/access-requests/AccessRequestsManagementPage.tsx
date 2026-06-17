import { useState, useEffect, useMemo } from 'react'
import { RefreshCw, Search, CheckCircle, XCircle, Clock3, Inbox, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { canAccessAdminDashboard } from '@/utils/permissions'
import { ApiError } from '@/types/api'
import { PageHero, type HeroStat } from '@/components/PageHero'
import { useAccessRequestsPage } from './hooks/useAccessRequestsPage'
import {
  AccessRequestsTable,
  AccessRequestsTableEmpty,
  AccessRequestsTableSkeleton,
} from './components/AccessRequestsTable'
import { ApproveRequestDialog } from './components/ApproveRequestDialog'
import { RejectRequestDialog } from './components/RejectRequestDialog'
import { AccessRequestDetailsDialog } from './components/AccessRequestDetailsDialog'
import type { AccessRequestModel } from '@/types/models'

type DialogKind = 'details' | 'approve' | 'reject' | null

function formatMutationError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.isConflict)    return 'Esta solicitação já foi processada por outro administrador.'
    if (err.isForbidden)   return 'Acesso negado. Você não tem permissão para esta operação.'
    if (err.isRateLimited) return 'Muitas requisições. Aguarde um momento e tente novamente.'
    return err.message
  }
  return 'Ocorreu um erro inesperado. Tente novamente.'
}

function daysAgo(date: Date): string {
  const d = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (d === 0) return 'hoje'
  if (d === 1) return 'há 1 dia'
  return `há ${d} dias`
}

// ── Mini bar ──────────────────────────────────────────────────────────────────

function MiniBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="flex-1 min-w-0 truncate text-[12px] text-muted-foreground">{label}</span>
      <div className="w-20 h-1.5 flex-shrink-0 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-amber-400 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-5 flex-shrink-0 text-right text-[12px] font-semibold text-foreground tabular-nums">{value}</span>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function AccessRequestsManagementPage() {
  const currentUser = useAuthStore((s) => s.user)

  const {
    requests,
    allRequests,
    totalRequests,
    pendingCount,
    approvedCount,
    rejectedCount,
    isLoading,
    isError,
    refetch,
    filters,
    setFilters,
    hasFilters,
    approveMutation,
    rejectMutation,
    isBulkProcessing,
    bulkApprove,
    bulkReject,
  } = useAccessRequestsPage()

  const heroStats: HeroStat[] = [
    { icon: Clock3,      value: pendingCount,  label: 'em análise', tone: 'amber' },
    { icon: CheckCircle, value: approvedCount, label: 'aprovadas',  tone: 'green' },
    { icon: XCircle,     value: rejectedCount, label: 'rejeitadas', tone: 'red'   },
  ]

  const [selectedRequest, setSelectedRequest] = useState<AccessRequestModel | null>(null)
  const [dialog, setDialog]                   = useState<DialogKind>(null)
  const [selectedIds, setSelectedIds]         = useState<Set<string>>(new Set())
  const [bulkNotice, setBulkNotice]           = useState<string | null>(null)

  useEffect(() => { setSelectedIds(new Set()) }, [filters])

  useEffect(() => {
    if (!bulkNotice) return
    const t = setTimeout(() => setBulkNotice(null), 4000)
    return () => clearTimeout(t)
  }, [bulkNotice])

  // ── Insights ───────────────────────────────────────────────────────────────

  const overdueRequests = useMemo(() => {
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000
    return allRequests
      .filter((r) => r.status === 'pending' && Date.now() - r.requestedAt.getTime() > THREE_DAYS_MS)
      .sort((a, b) => a.requestedAt.getTime() - b.requestedAt.getTime())
      .slice(0, 5)
  }, [allRequests])

  const pendingByApp = useMemo(() => {
    const map = new Map<string, number>()
    allRequests.filter((r) => r.status === 'pending').forEach((r) => {
      map.set(r.appName, (map.get(r.appName) ?? 0) + 1)
    })
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
  }, [allRequests])

  const weeklyVolume = useMemo(() => {
    const weeks = Array(7).fill(0)
    const WEEK_MS = 7 * 24 * 60 * 60 * 1000
    allRequests.forEach((r) => {
      const ago = Math.floor((Date.now() - r.requestedAt.getTime()) / WEEK_MS)
      if (ago < 7) weeks[6 - ago]++
    })
    return weeks
  }, [allRequests])

  const showInsights = !isLoading && allRequests.length > 0

  // ──────────────────────────────────────────────────────────────────────────

  if (!currentUser || !canAccessAdminDashboard(currentUser)) return null

  const pendingIds = new Set(requests.filter((r) => r.status === 'pending').map((r) => r.id))

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    const allSelected = [...pendingIds].every((id) => selectedIds.has(id))
    setSelectedIds(allSelected ? new Set() : new Set(pendingIds))
  }

  async function handleBulkApprove() {
    const ids = [...selectedIds]
    setSelectedIds(new Set())
    const { success, failed } = await bulkApprove(ids)
    setBulkNotice(
      failed === 0
        ? `${success} solicitaç${success !== 1 ? 'ões aprovadas' : 'ão aprovada'} com sucesso.`
        : `${success} aprovadas, ${failed} falharam.`
    )
  }

  async function handleBulkReject() {
    const ids = [...selectedIds]
    setSelectedIds(new Set())
    const { success, failed } = await bulkReject(ids)
    setBulkNotice(
      failed === 0
        ? `${success} solicitaç${success !== 1 ? 'ões rejeitadas' : 'ão rejeitada'} com sucesso.`
        : `${success} rejeitadas, ${failed} falharam.`
    )
  }

  function openDialog(kind: DialogKind, request: AccessRequestModel) {
    setSelectedRequest(request)
    setDialog(kind)
  }

  function closeDialog() {
    setDialog(null)
    setSelectedRequest(null)
    approveMutation.reset()
    rejectMutation.reset()
  }

  const volMax = Math.max(...weeklyVolume, 1)

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <PageHero
        icon={Inbox}
        title="Solicitações de Acesso"
        subtitle="Revise e processe os pedidos de acesso a aplicativos."
        stats={!isLoading ? heroStats : undefined}
      />

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {isLoading ? 'Carregando...' : `${totalRequests} solicitação${totalRequests !== 1 ? 'ões' : ''} no total`}
        </p>
        <Button
          variant="outline" size="sm"
          onClick={() => void refetch()}
          disabled={isLoading}
          aria-label="Atualizar lista"
        >
          <RefreshCw className={cn('h-4 w-4 mr-1.5', isLoading && 'animate-spin')} aria-hidden />
          Atualizar
        </Button>
      </div>

      {/* Error banner */}
      {isError && !isLoading && (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-destructive">
            Erro ao carregar solicitações.{' '}
            <button className="underline underline-offset-2 hover:text-destructive/80" onClick={() => void refetch()}>
              Tentar novamente
            </button>
          </p>
        </div>
      )}

      {/* Overdue alert */}
      {!isLoading && overdueRequests.length > 0 && (
        <div className="rounded-xl overflow-hidden border border-orange-200">
          <div className="flex items-center gap-2 px-4 py-2 bg-orange-100 border-b border-orange-200">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 text-orange-600" aria-hidden />
            <span className="text-xs font-semibold text-orange-800">
              {overdueRequests.length} solicitaç{overdueRequests.length !== 1 ? 'ões aguardam' : 'ão aguarda'} resposta há mais de 3 dias
            </span>
          </div>
          {overdueRequests.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-3 px-4 py-2.5 bg-orange-50 border-b border-orange-100 last:border-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-orange-900 truncate">
                  {r.userName} → {r.appName}
                </p>
                <p className="text-xs text-orange-600">{daysAgo(r.requestedAt)}</p>
              </div>
              <Button
                size="sm" variant="ghost"
                className="h-7 shrink-0 text-xs font-medium text-green-800 bg-green-50 border border-green-200 hover:bg-green-100"
                onClick={() => openDialog('approve', r)}
              >
                <CheckCircle className="h-3 w-3 mr-1" aria-hidden />
                Aprovar
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Insights panels */}
      {showInsights && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

          {/* Apps com mais pendências */}
          {pendingByApp.length > 0 && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="h-[3px] bg-amber-400" />
              <div className="p-4">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                  Apps com mais pendências
                </p>
                <div className="flex flex-col gap-2">
                  {pendingByApp.map(([app, count]) => (
                    <MiniBar key={app} label={app} value={count} max={pendingByApp[0][1]} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Volume por semana */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="h-[3px]" style={{ background: 'hsl(var(--primary))' }} />
            <div className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                Volume por semana
              </p>
              <div className="flex items-end gap-1.5 h-12">
                {weeklyVolume.map((v, i) => {
                  const isLast = i === weeklyVolume.length - 1
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-t-sm transition-all duration-300"
                      style={{
                        height: `${Math.max((v / volMax) * 100, 4)}%`,
                        background: isLast
                          ? 'hsl(var(--primary))'
                          : 'hsl(var(--primary) / 0.25)',
                      }}
                      title={`${v} solicitaç${v !== 1 ? 'ões' : 'ão'}`}
                    />
                  )
                })}
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[10px] text-muted-foreground">7 sem. atrás</span>
                <span className="text-[10px] text-muted-foreground">Esta semana</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por usuário, e-mail ou aplicativo..."
            className="pl-9"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
        </div>
        <Select
          className="w-40"
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as typeof f.status }))}
          aria-label="Filtrar por status"
        >
          <option value="all">Todos os status</option>
          <option value="pending">Pendentes</option>
          <option value="approved">Aprovadas</option>
          <option value="rejected">Rejeitadas</option>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => setFilters({ search: '', status: 'all' })}>
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5">
          <span className="text-sm font-medium text-foreground">
            {selectedIds.size} selecionada{selectedIds.size !== 1 ? 's' : ''}
          </span>
          <Button
            size="sm"
            className="h-7 gap-1.5 text-green-800 bg-green-100 hover:bg-green-200 border-0"
            onClick={handleBulkApprove}
            disabled={isBulkProcessing}
          >
            <CheckCircle className="h-3.5 w-3.5" />
            Aprovar selecionadas
          </Button>
          <Button
            size="sm" variant="outline"
            className="h-7 gap-1.5 text-red-700 border-red-200 hover:bg-red-50"
            onClick={handleBulkReject}
            disabled={isBulkProcessing}
          >
            <XCircle className="h-3.5 w-3.5" />
            Rejeitar selecionadas
          </Button>
          <Button
            size="sm" variant="ghost"
            className="ml-auto h-7 text-muted-foreground"
            onClick={() => setSelectedIds(new Set())}
            disabled={isBulkProcessing}
          >
            Cancelar
          </Button>
        </div>
      )}

      {/* Bulk notice */}
      {bulkNotice && (
        <p className="text-sm text-foreground bg-muted rounded-lg px-4 py-2.5">{bulkNotice}</p>
      )}

      {/* Table */}
      {isLoading ? (
        <AccessRequestsTableSkeleton />
      ) : requests.length === 0 ? (
        <AccessRequestsTableEmpty hasFilters={hasFilters} />
      ) : (
        <AccessRequestsTable
          requests={requests}
          onDetails={(req) => openDialog('details', req)}
          onApprove={(req) => openDialog('approve', req)}
          onReject={(req) => openDialog('reject', req)}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleAll={toggleAll}
        />
      )}

      {/* Results summary */}
      {!isLoading && !isError && requests.length > 0 && hasFilters && (
        <p className="text-xs text-muted-foreground text-right">
          Exibindo {requests.length} de {totalRequests} solicitações
        </p>
      )}

      <AccessRequestDetailsDialog
        request={selectedRequest}
        open={dialog === 'details'}
        onClose={closeDialog}
        onApprove={() => { closeDialog(); if (selectedRequest) openDialog('approve', selectedRequest) }}
        onReject={() => { closeDialog(); if (selectedRequest) openDialog('reject', selectedRequest) }}
      />

      <ApproveRequestDialog
        request={selectedRequest}
        open={dialog === 'approve'}
        isPending={approveMutation.isPending}
        error={approveMutation.isError ? formatMutationError(approveMutation.error) : null}
        onConfirm={() => {
          if (!selectedRequest) return
          approveMutation.mutate(selectedRequest.id, { onSuccess: closeDialog })
        }}
        onClose={closeDialog}
      />

      <RejectRequestDialog
        request={selectedRequest}
        open={dialog === 'reject'}
        isPending={rejectMutation.isPending}
        error={rejectMutation.isError ? formatMutationError(rejectMutation.error) : null}
        onConfirm={(reviewNote) => {
          if (!selectedRequest) return
          rejectMutation.mutate({ id: selectedRequest.id, reviewNote }, { onSuccess: closeDialog })
        }}
        onClose={closeDialog}
      />
    </div>
  )
}
