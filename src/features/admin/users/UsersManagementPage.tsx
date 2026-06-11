import { useState } from 'react'
import { RefreshCw, Search, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useAuthStore } from '@/stores/auth.store'
import { canAccessAdminDashboard } from '@/utils/permissions'
import { ApiError } from '@/types/api'
import { useUsersPage } from './hooks/useUsersPage'
import { UsersTable, UsersTableEmpty, UsersTableSkeleton } from './components/UsersTable'
import { UserActivateDialog } from './components/UserActivateDialog'
import { UserDeactivateDialog } from './components/UserDeactivateDialog'
import { UserEditDialog } from './components/UserEditDialog'
import { CreateExternalUserDialog } from './components/CreateExternalUserDialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { UserModel } from '@/types/models'

type DialogKind = 'activate' | 'deactivate' | 'edit' | 'promoteAdmin' | 'revokeAdmin' | 'createExternal' | null

function formatMutationError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.isForbidden) return 'Acesso negado. Você não tem permissão para esta operação.'
    if (err.isConflict) return 'Esta operação não pôde ser concluída (conflito no servidor).'
    if (err.isRateLimited) return 'Muitas requisições. Aguarde um momento e tente novamente.'
    return err.message
  }
  return 'Ocorreu um erro inesperado. Tente novamente.'
}

export function UsersManagementPage() {
  const currentUser = useAuthStore((s) => s.user)

  const {
    users,
    totalUsers,
    isLoading,
    isError,
    refetch,
    filters,
    setFilters,
    availableProfiles,
    activateMutation,
    deactivateMutation,
    promoteAdminMutation,
    revokeAdminMutation,
    updateProfileMutation,
    createExternalMutation,
  } = useUsersPage()

  const [selectedUser, setSelectedUser] = useState<UserModel | null>(null)
  const [dialog, setDialog] = useState<DialogKind>(null)

  if (!currentUser || !canAccessAdminDashboard(currentUser)) return null

  function openDialog(kind: DialogKind, user: UserModel) {
    setSelectedUser(user)
    setDialog(kind)
  }

  function closeDialog() {
    setDialog(null)
    setSelectedUser(null)
    activateMutation.reset()
    deactivateMutation.reset()
    promoteAdminMutation.reset()
    revokeAdminMutation.reset()
    updateProfileMutation.reset()
  }

  const hasFilters =
    filters.search !== '' ||
    filters.status !== 'all' ||
    filters.role !== 'all' ||
    filters.profile !== ''

  // Promote/revoke admin share a generic confirm dialog
  const adminMutation = dialog === 'promoteAdmin' ? promoteAdminMutation : revokeAdminMutation
  const adminMutationLabel = dialog === 'promoteAdmin' ? 'Promover a admin' : 'Revogar admin'
  const adminMutationDescription =
    dialog === 'promoteAdmin'
      ? `Tem certeza que deseja promover ${selectedUser?.name} a administrador? Ele terá acesso total ao painel admin.`
      : `Tem certeza que deseja revogar as permissões de administrador de ${selectedUser?.name}?`

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading
              ? 'Carregando...'
              : `${totalUsers} usuário${totalUsers !== 1 ? 's' : ''} cadastrado${totalUsers !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <Button
            size="sm"
            onClick={() => { setSelectedUser(null); setDialog('createExternal') }}
          >
            <UserPlus className="h-4 w-4 mr-1.5" aria-hidden />
            Novo usuário
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
            Erro ao carregar usuários.{' '}
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
            placeholder="Buscar por nome ou e-mail..."
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
          value={filters.role}
          onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value as typeof f.role }))}
          aria-label="Filtrar por papel"
        >
          <option value="all">Todos papéis</option>
          <option value="admin">Admins</option>
          <option value="user">Não admins</option>
        </Select>

        {availableProfiles.length > 0 && (
          <Select
            className="w-36"
            value={filters.profile}
            onChange={(e) => setFilters((f) => ({ ...f, profile: e.target.value }))}
            aria-label="Filtrar por perfil"
          >
            <option value="">Todos perfis</option>
            {availableProfiles.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        )}

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilters({ search: '', status: 'all', role: 'all', profile: '' })}
          >
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <UsersTableSkeleton />
      ) : users.length === 0 ? (
        <UsersTableEmpty hasFilters={hasFilters} />
      ) : (
        <UsersTable
          users={users}
          currentUserId={currentUser.id}
          onEdit={(user) => openDialog('edit', user)}
          onActivate={(user) => openDialog('activate', user)}
          onDeactivate={(user) => openDialog('deactivate', user)}
          onPromoteAdmin={(user) => openDialog('promoteAdmin', user)}
          onRevokeAdmin={(user) => openDialog('revokeAdmin', user)}
        />
      )}

      {/* Results summary */}
      {!isLoading && !isError && users.length > 0 && hasFilters && (
        <p className="text-xs text-muted-foreground text-right">
          Exibindo {users.length} de {totalUsers} usuários
        </p>
      )}

      {/* ── Dialogs ────────────────────────────────────────────────────────── */}

      <UserActivateDialog
        user={selectedUser}
        open={dialog === 'activate'}
        isPending={activateMutation.isPending}
        error={activateMutation.isError ? formatMutationError(activateMutation.error) : null}
        onConfirm={() => {
          if (!selectedUser) return
          activateMutation.mutate(selectedUser.id, { onSuccess: closeDialog })
        }}
        onClose={closeDialog}
      />

      <UserDeactivateDialog
        user={selectedUser}
        open={dialog === 'deactivate'}
        isPending={deactivateMutation.isPending}
        error={deactivateMutation.isError ? formatMutationError(deactivateMutation.error) : null}
        onConfirm={() => {
          if (!selectedUser) return
          deactivateMutation.mutate(selectedUser.id, { onSuccess: closeDialog })
        }}
        onClose={closeDialog}
      />

      <UserEditDialog
        user={selectedUser}
        open={dialog === 'edit'}
        isPending={updateProfileMutation.isPending}
        error={
          updateProfileMutation.isError ? formatMutationError(updateProfileMutation.error) : null
        }
        onConfirm={(patch) => {
          if (!selectedUser) return
          updateProfileMutation.mutate(
            { userId: selectedUser.id, patch },
            { onSuccess: closeDialog }
          )
        }}
        onClose={closeDialog}
      />

      <CreateExternalUserDialog
        open={dialog === 'createExternal'}
        isPending={createExternalMutation.isPending}
        onClose={closeDialog}
        onConfirm={async (payload) => {
          await createExternalMutation.mutateAsync(payload)
        }}
      />

      {/* Generic admin promote/revoke confirmation dialog */}
      <Dialog
        open={dialog === 'promoteAdmin' || dialog === 'revokeAdmin'}
        onOpenChange={(v) => !v && closeDialog()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{adminMutationLabel}</DialogTitle>
            <DialogDescription>{adminMutationDescription}</DialogDescription>
          </DialogHeader>

          {adminMutation.isError && (
            <p
              role="alert"
              className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2"
            >
              {formatMutationError(adminMutation.error)}
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={adminMutation.isPending}>
              Cancelar
            </Button>
            <Button
              variant={dialog === 'revokeAdmin' ? 'destructive' : 'default'}
              disabled={adminMutation.isPending}
              onClick={() => {
                if (!selectedUser) return
                adminMutation.mutate(selectedUser.id, { onSuccess: closeDialog })
              }}
            >
              {adminMutation.isPending ? 'Aguarde...' : adminMutationLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
