import { useState } from 'react'
import { RefreshCw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
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
  const currentUser = useAuthStore(s => s.user)

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
  } = useAccessRequestsPage()

  const [selectedRequest, setSelectedRequest] = useState<AccessRequestModel | null>(null)
  const [dialog, setDialog] = useState<DialogKind>(null)

  if (!currentUser || !canAccessAdminDashboard(currentUser)) return null

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
      <div className="flex items-start justify-between gap-4">
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
          <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Error banner */}
      {isError && !isLoading && (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
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
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          />
        </div>

        <Select
          className="w-40"
          value={filters.status}
          onChange={e =>
            setFilters(f => ({ ...f, status: e.target.value as typeof f.status }))
          }
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

      {/* Table */}
      {isLoading ? (
        <AccessRequestsTableSkeleton />
      ) : requests.length === 0 ? (
        <AccessRequestsTableEmpty hasFilters={hasFilters} />
      ) : (
        <AccessRequestsTable
          requests={requests}
          onDetails={req => openDialog('details', req)}
          onApprove={req => openDialog('approve', req)}
          onReject={req => openDialog('reject', req)}
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
        onConfirm={() => {
          if (!selectedRequest) return
          rejectMutation.mutate(selectedRequest.id, { onSuccess: closeDialog })
        }}
        onClose={closeDialog}
      />
    </div>
  )
}
