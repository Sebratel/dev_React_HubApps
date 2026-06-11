import { useState } from 'react'
import { Plus, RefreshCw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useAuthStore } from '@/stores/auth.store'
import { canAccessAdminDashboard } from '@/utils/permissions'
import { ApiError } from '@/types/api'
import { useAppsPage } from './hooks/useAppsPage'
import { AppsTable, AppsTableEmpty, AppsTableSkeleton } from './components/AppsTable'
import { AppFormDialog, type AppFormValues } from './components/AppFormDialog'
import { AppDeactivateDialog } from './components/AppDeactivateDialog'
import { AppReactivateDialog } from './components/AppReactivateDialog'
import type { AppItemModel } from '@/types/models'

type DialogKind = 'create' | 'edit' | 'deactivate' | 'reactivate' | null

function formatMutationError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.isForbidden) return 'Acesso negado. Você não tem permissão para esta operação.'
    if (err.isConflict) return 'Conflito detectado. Tente novamente.'
    if (err.isRateLimited) return 'Muitas requisições. Aguarde um momento e tente novamente.'
    return err.message
  }
  return 'Ocorreu um erro inesperado. Tente novamente.'
}

function parseLines(raw: string): string[] {
  return raw
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function AppsManagementPage() {
  const currentUser = useAuthStore((s) => s.user)

  const {
    apps,
    totalApps,
    isLoading,
    isError,
    refetch,
    filters,
    setFilters,
    hasFilters,
    createMutation,
    updateMutation,
    deactivateMutation,
    reactivateMutation,
  } = useAppsPage()

  const [selectedApp, setSelectedApp] = useState<AppItemModel | null>(null)
  const [dialog, setDialog] = useState<DialogKind>(null)

  if (!currentUser || !canAccessAdminDashboard(currentUser)) return null

  function openDialog(kind: DialogKind, app: AppItemModel | null = null) {
    setSelectedApp(app)
    setDialog(kind)
  }

  function closeDialog() {
    setDialog(null)
    setSelectedApp(null)
    createMutation.reset()
    updateMutation.reset()
    deactivateMutation.reset()
    reactivateMutation.reset()
  }

  function handleFormConfirm(values: AppFormValues) {
    const users = parseLines(values.allowedUsersRaw)
    const teams = parseLines(values.allowedTeamsRaw)
    const iconVal = values.iconUrl?.trim() || undefined

    if (dialog === 'create') {
      createMutation.mutate(
        {
          name: values.name,
          url: values.url,
          description: values.description,
          iconUrl: iconVal,
          passToken: values.passToken,
          passUser: values.passUser,
          status: values.status,
          allowedProfiles: values.allowedProfiles,
          allowedUsers: users,
          allowedTeams: teams,
        },
        { onSuccess: closeDialog }
      )
    } else if (dialog === 'edit' && selectedApp) {
      updateMutation.mutate(
        {
          appId: selectedApp.id,
          payload: {
            name: values.name,
            url: values.url,
            description: values.description,
            icon_url: iconVal,
            pass_token: values.passToken,
            pass_user: values.passUser,
            status: values.status,
            allowed_profiles: values.allowedProfiles,
            allowed_users: users,
            allowed_teams: teams,
          },
        },
        { onSuccess: closeDialog }
      )
    }
  }

  const activeFormError =
    dialog === 'create' && createMutation.isError
      ? formatMutationError(createMutation.error)
      : dialog === 'edit' && updateMutation.isError
        ? formatMutationError(updateMutation.error)
        : null

  const activeFormPending =
    (dialog === 'create' && createMutation.isPending) ||
    (dialog === 'edit' && updateMutation.isPending)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Aplicativos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading
              ? 'Carregando...'
              : `${totalApps} aplicativo${totalApps !== 1 ? 's' : ''} cadastrado${totalApps !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex gap-2">
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
          <Button size="sm" onClick={() => openDialog('create')}>
            <Plus className="h-4 w-4 mr-1.5" />
            Criar app
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
            Erro ao carregar aplicativos.{' '}
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
            placeholder="Buscar por nome, descrição ou URL..."
            className="pl-9"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
        </div>

        <Select
          className="w-36"
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as typeof f.status }))}
          aria-label="Filtrar por status"
        >
          <option value="all">Todos status</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </Select>

        <Select
          className="w-36"
          value={filters.passToken}
          onChange={(e) =>
            setFilters((f) => ({ ...f, passToken: e.target.value as typeof f.passToken }))
          }
          aria-label="Filtrar por passToken"
        >
          <option value="all">Todos</option>
          <option value="yes">Com passToken</option>
          <option value="no">Sem passToken</option>
        </Select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilters({ search: '', status: 'all', passToken: 'all' })}
          >
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <AppsTableSkeleton />
      ) : apps.length === 0 ? (
        <AppsTableEmpty hasFilters={hasFilters} />
      ) : (
        <AppsTable
          apps={apps}
          onEdit={(app) => openDialog('edit', app)}
          onDeactivate={(app) => openDialog('deactivate', app)}
          onReactivate={(app) => openDialog('reactivate', app)}
        />
      )}

      {/* Results summary */}
      {!isLoading && !isError && apps.length > 0 && hasFilters && (
        <p className="text-xs text-muted-foreground text-right">
          Exibindo {apps.length} de {totalApps} aplicativos
        </p>
      )}

      {/* ── Dialogs ────────────────────────────────────────────────────────── */}

      <AppFormDialog
        app={dialog === 'edit' ? (selectedApp ?? undefined) : undefined}
        open={dialog === 'create' || dialog === 'edit'}
        isPending={activeFormPending}
        error={activeFormError}
        onConfirm={handleFormConfirm}
        onClose={closeDialog}
      />

      <AppDeactivateDialog
        app={selectedApp}
        open={dialog === 'deactivate'}
        isPending={deactivateMutation.isPending}
        error={deactivateMutation.isError ? formatMutationError(deactivateMutation.error) : null}
        onConfirm={() => {
          if (!selectedApp) return
          deactivateMutation.mutate(selectedApp.id, { onSuccess: closeDialog })
        }}
        onClose={closeDialog}
      />

      <AppReactivateDialog
        app={selectedApp}
        open={dialog === 'reactivate'}
        isPending={reactivateMutation.isPending}
        error={reactivateMutation.isError ? formatMutationError(reactivateMutation.error) : null}
        onConfirm={() => {
          if (!selectedApp) return
          reactivateMutation.mutate(selectedApp.id, { onSuccess: closeDialog })
        }}
        onClose={closeDialog}
      />
    </div>
  )
}
