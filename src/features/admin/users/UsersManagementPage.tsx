import { useState } from 'react'
import { RefreshCw, Search, UserPlus, Download, Users, UserCheck, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { canAccessAdminDashboard } from '@/utils/permissions'
import { ApiError } from '@/types/api'
import { PageHero, type HeroStat } from '@/components/PageHero'
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
import { useReducedMotion } from 'framer-motion'

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
    activeCount,
    adminCount,
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

  const heroStats: HeroStat[] = [
    { icon: Users,        value: totalUsers,   label: 'cadastrados',  tone: 'muted'    },
    { icon: UserCheck,    value: activeCount,  label: 'ativos',       tone: 'green'    },
    { icon: ShieldCheck,  value: adminCount,   label: 'admins',       tone: 'amber'    },
  ]

  const [selectedUser, setSelectedUser] = useState<UserModel | null>(null)
  const [dialog, setDialog] = useState<DialogKind>(null)

  if (!currentUser || !canAccessAdminDashboard(currentUser)) return null

  const reduced = useReducedMotion()

  function handleExportCsv() {
    const headers = ['Nome', 'E-mail', 'Perfil', 'Time', 'Status', 'Admin', 'Criado em']
    const rows = users.map((u) => [
      u.name,
      u.email,
      u.profile || '',
      u.team || '',
      u.isActive ? 'Ativo' : 'Inativo',
      u.isAdmin ? 'Sim' : 'Não',
      u.createdAt.toLocaleDateString('pt-BR'),
    ])
    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `usuarios-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

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

  const inactiveCount = totalUsers - activeCount
  const activeRatio = totalUsers > 0 ? Math.round((activeCount / totalUsers) * 100) : 0

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHero
        icon={Users}
        title="Usuários"
        subtitle="Gerencie os usuários, perfis e permissões de acesso."
        stats={!isLoading ? heroStats : undefined}
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_260px] gap-6 items-start">
        {/* ── Coluna principal ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-6 min-w-0">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {isLoading ? 'Carregando...' : `${totalUsers} usuário${totalUsers !== 1 ? 's' : ''} no total`}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                disabled={isLoading || users.length === 0}
                aria-label="Exportar CSV"
              >
                <Download className="h-4 w-4 mr-1.5" />
                Exportar CSV
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
        </div>

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <aside className="flex flex-col gap-4 xl:sticky xl:top-6">
          {/* Stats */}
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Resumo
            </p>

            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-8 rounded bg-muted animate-pulse" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Active ratio bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">Taxa de ativação</span>
                    <span className="font-semibold tabular-nums">{activeRatio}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-green-500 transition-all duration-500"
                      style={{ width: `${activeRatio}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2.5">
                  {[
                    { label: 'Total',    value: totalUsers,    dot: 'bg-muted-foreground/30' },
                    { label: 'Ativos',   value: activeCount,   dot: 'bg-green-500'           },
                    { label: 'Inativos', value: inactiveCount, dot: 'bg-muted-foreground/40' },
                    { label: 'Admins',   value: adminCount,    dot: 'bg-purple-500'          },
                  ].map(({ label, value, dot }) => (
                    <div key={label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full shrink-0 ${dot}`} />
                        <span className="text-sm text-muted-foreground">{label}</span>
                      </div>
                      <span className="text-sm font-semibold tabular-nums">{value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Quick filters */}
          {!isLoading && (
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Filtros rápidos
              </p>
              <div className="flex flex-col gap-1">
                {([
                  { label: 'Todos os usuários', action: () => setFilters({ search: '', status: 'all',      role: 'all',   profile: '' }) },
                  { label: 'Inativos',          action: () => setFilters((f) => ({ ...f, status: 'inactive', role: 'all'   })) },
                  { label: 'Apenas admins',     action: () => setFilters((f) => ({ ...f, status: 'all',      role: 'admin' })) },
                  { label: 'Não admins',        action: () => setFilters((f) => ({ ...f, status: 'all',      role: 'user'  })) },
                ] as const).map(({ label, action }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={action}
                    className="text-left px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    {label}
                  </button>
                ))}

                {availableProfiles.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setFilters((f) => ({ ...f, profile: p }))}
                    className="text-left px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    Perfil: {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

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
