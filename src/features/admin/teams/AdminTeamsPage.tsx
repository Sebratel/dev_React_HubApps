import { useState } from 'react'
import { Plus, RefreshCw, Pencil, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { canAccessAdminDashboard } from '@/utils/permissions'
import { ApiError } from '@/types/api'
import { useTeamsPage } from './hooks/useTeamsPage'
import { TeamFormDialog } from './components/TeamFormDialog'
import type { TeamModel, TeamPayload } from '@/services/team.service'

function formatError(err: unknown) {
  if (err instanceof ApiError) {
    if (err.isConflict) return 'Já existe um time com esse nome.'
    return err.message
  }
  return 'Ocorreu um erro inesperado.'
}

function formatDate(d: Date) {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function AdminTeamsPage() {
  const user = useAuthStore((s) => s.user)
  const { teams, isLoading, isError, refetch, createMutation, updateMutation, deleteMutation } =
    useTeamsPage()

  const [dialogOpen, setDialogOpen]       = useState(false)
  const [editing, setEditing]             = useState<TeamModel | null>(null)
  const [mutationError, setMutationError] = useState<string | null>(null)

  if (!user || !canAccessAdminDashboard(user)) return null

  const isBusy = createMutation.isPending || updateMutation.isPending

  function openCreate() { setEditing(null); setMutationError(null); setDialogOpen(true) }
  function openEdit(t: TeamModel) { setEditing(t); setMutationError(null); setDialogOpen(true) }

  async function handleSave(payload: TeamPayload, id?: string) {
    setMutationError(null)
    try {
      if (id) {
        await updateMutation.mutateAsync({ id, payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
    } catch (err) {
      const msg = formatError(err)
      setMutationError(msg)
      throw new Error(msg)
    }
  }

  async function handleDelete(t: TeamModel) {
    if (!confirm(`Desativar o time "${t.name}"? Os membros não serão removidos.`)) return
    try {
      await deleteMutation.mutateAsync(t.id)
    } catch (err) {
      setMutationError(formatError(err))
    }
  }

  const activeTeams   = teams.filter((t) => t.isActive)
  const inactiveTeams = teams.filter((t) => !t.isActive)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Times</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeTeams.length} time{activeTeams.length !== 1 ? 's' : ''} ativo
            {activeTeams.length !== 1 ? 's' : ''} — controle quais equipes têm acesso a apps.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4 mr-1.5', isLoading && 'animate-spin')} aria-hidden />
            Atualizar
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" aria-hidden />
            Novo time
          </Button>
        </div>
      </div>

      {/* Error */}
      {(isError || mutationError) && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {mutationError ?? 'Erro ao carregar times. Tente atualizar.'}
        </div>
      )}

      {/* KPIs rápidos */}
      {!isLoading && teams.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Times ativos</p>
            <p className="text-2xl font-bold text-foreground mt-1">{activeTeams.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Total de membros</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {activeTeams.reduce((s, t) => s + t.memberCount, 0)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Maior time</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {activeTeams.length > 0
                ? Math.max(...activeTeams.map((t) => t.memberCount))
                : 0}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Times inativos</p>
            <p className="text-2xl font-bold text-muted-foreground mt-1">{inactiveTeams.length}</p>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left">
              <th className="px-4 py-3 font-medium text-muted-foreground">Nome</th>
              <th className="px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Descrição</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Membros</th>
              <th className="px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Criado em</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-muted rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : teams.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Users className="h-8 w-8 opacity-30" aria-hidden />
                    <p className="text-sm font-medium">Nenhum time cadastrado.</p>
                    <Button size="sm" variant="outline" onClick={openCreate}>
                      <Plus className="h-4 w-4 mr-1.5" />
                      Criar o primeiro time
                    </Button>
                  </div>
                </td>
              </tr>
            ) : (
              teams.map((t) => (
                <tr
                  key={t.id}
                  className={cn(
                    'border-b border-border last:border-0 hover:bg-muted/30 transition-colors',
                    !t.isActive && 'opacity-50'
                  )}
                >
                  <td className="px-4 py-3 font-medium text-foreground">{t.name}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs max-w-xs truncate">
                    {t.description ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Users className="h-3.5 w-3.5" aria-hidden />
                      {t.memberCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground tabular-nums text-xs">
                    {formatDate(t.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={
                        t.isActive
                          ? 'border-green-200 bg-green-50 text-green-700'
                          : 'border-border bg-muted text-muted-foreground'
                      }
                    >
                      {t.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(t)}
                        aria-label={`Editar time "${t.name}"`}
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                      {t.isActive && (
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(t)}
                          disabled={deleteMutation.isPending}
                          aria-label={`Desativar time "${t.name}"`}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <TeamFormDialog
        open={dialogOpen}
        editing={editing}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        isSubmitting={isBusy}
      />
    </div>
  )
}
