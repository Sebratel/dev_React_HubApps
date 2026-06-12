import { useState, useEffect } from 'react'
import { RefreshCw, Search, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { canAccessAdminDashboard } from '@/utils/permissions'
import { ApiError } from '@/types/api'
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
    if (err.isConflict) return 'Esta solicitação já foi processada por outro administrador.'
    if (err.isForbidden) return 'Acesso negado. Você não tem permissão para esta operação.'
    if (err.isRateLimited) return 'Muitas requisições. Aguarde um momento e tente novamente.'
    return err.message
  }
  return 'Ocorreu um erro inesperado. Tente novamente.'
}

export function AccessRequestsManagementPage() {
  const currentUser = useAuthStore((s) => s.user)

  const {
    requests,
    totalRequests,
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

  const [selectedRequest, setSelectedRequest] = useState<AccessRequestModel | null>(null)
  const [dialog, setDialog] = useState<DialogKind>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkNotice, setBulkNotice] = useState<string | null>(null)

  // Clear selection when filters change
  useEffect(() => { setSelectedIds(new Set()) }, [filters])

  // Auto-dismiss bulk notice
  useEffect(() => {
    if (!bulkNotice) return
    const t = setTimeout(() => setBulkNotice(null), 4000)
    return () => clearTimeout(t)
  }, [bulkNotice])

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

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Solicitações de Acesso</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading
              ? 'Carregando...'
              : `${totalRequests} solicitação${totalRequests !== 1 ? 'ões' : ''} no total`}
          </p>
        </div>
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

      {/* Error banner */}
      {isError && !isLoading && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3"
        >
          <p className="text-sm text-destructive">
            Erro ao carregar solicitações.{' '}
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilters({ search: '', status: 'all' })}
          >
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
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 text-red-700 border-red-200 hover:bg-red-50"
            onClick={handleBulkReject}
            disabled={isBulkProcessing}
          >
            <XCircle className="h-3.5 w-3.5" />
            Rejeitar selecionadas
          </Button>
          <Button
            size="sm"
            variant="ghost"
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

      {/* ── Dialogs ────────────────────────────────────────────────────────── */}

      <AccessRequestDetailsDialog
        request={selectedRequest}
        open={dialog === 'details'}
        onClose={closeDialog}
        onApprove={() => {
          closeDialog()
          if (selectedRequest) openDialog('approve', selectedRequest)
        }}
        onReject={() => {
          closeDialog()
          if (selectedRequest) openDialog('reject', selectedRequest)
        }}
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
