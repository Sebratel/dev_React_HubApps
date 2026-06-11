import { useState } from 'react'
import { Plus, RefreshCw, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { canAccessAdminDashboard } from '@/utils/permissions'
import { ApiError } from '@/types/api'
import { PROFILE_LABEL } from '@/constants/profiles'
import { useAnnouncementsPage } from './hooks/useAnnouncementsPage'
import { AnnouncementFormDialog } from './components/AnnouncementFormDialog'
import type { AnnouncementModel } from '@/types/models'
import type { CreateAnnouncementPayload, UpdateAnnouncementPayload } from '@/services/announcement.service'

const TYPE_LABEL: Record<string, string> = {
  info: 'Informativo', warning: 'Aviso', urgent: 'Urgente', success: 'Concluído',
}

const TYPE_BADGE: Record<string, string> = {
  info:    'border-border    bg-muted      text-muted-foreground',
  warning: 'border-amber-200 bg-amber-50   text-amber-800',
  urgent:  'border-red-200   bg-red-50     text-destructive',
  success: 'border-green-200 bg-green-50   text-green-700',
}

function formatDate(d: Date) {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatError(err: unknown) {
  if (err instanceof ApiError) return err.message
  return 'Ocorreu um erro inesperado.'
}

export function AdminAnnouncementsPage() {
  const user = useAuthStore((s) => s.user)
  const {
    announcements, isLoading, isError, refetch,
    createMutation, updateMutation, deleteMutation,
  } = useAnnouncementsPage()

  const [dialogOpen, setDialogOpen]   = useState(false)
  const [editing, setEditing]         = useState<AnnouncementModel | null>(null)
  const [mutationError, setMutationError] = useState<string | null>(null)

  if (!user || !canAccessAdminDashboard(user)) return null

  function openCreate() { setEditing(null); setMutationError(null); setDialogOpen(true) }
  function openEdit(a: AnnouncementModel) { setEditing(a); setMutationError(null); setDialogOpen(true) }

  async function handleSave(payload: CreateAnnouncementPayload, id?: string) {
    setMutationError(null)
    try {
      if (id) {
        const update: UpdateAnnouncementPayload = {
          title: payload.title,
          body: payload.body ?? null,
          type: payload.type,
          allowed_profiles: payload.allowedProfiles,
        }
        await updateMutation.mutateAsync({ id, payload: update })
      } else {
        await createMutation.mutateAsync(payload)
      }
    } catch (err) {
      setMutationError(formatError(err))
      throw err
    }
  }

  async function handleDelete(a: AnnouncementModel) {
    if (!confirm(`Desativar aviso "${a.title}"?`)) return
    try {
      await deleteMutation.mutateAsync(a.id)
    } catch (err) {
      setMutationError(formatError(err))
    }
  }

  const isBusy = createMutation.isPending || updateMutation.isPending

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Avisos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerenciar comunicados para a equipe.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4 mr-1.5', isLoading && 'animate-spin')} aria-hidden />
            Atualizar
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" aria-hidden />
            Novo aviso
          </Button>
        </div>
      </div>

      {/* Error */}
      {(isError || mutationError) && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {mutationError ?? 'Erro ao carregar avisos. Tente atualizar.'}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left">
              <th className="px-4 py-3 font-medium text-muted-foreground">Título</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Tipo</th>
              <th className="px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Visível para</th>
              <th className="px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Data</th>
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
            ) : announcements.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Nenhum aviso cadastrado.
                </td>
              </tr>
            ) : (
              announcements.map((a) => (
                <tr
                  key={a.id}
                  className={cn('border-b border-border last:border-0 hover:bg-muted/30 transition-colors', !a.isActive && 'opacity-50')}
                >
                  <td className="px-4 py-3 font-medium text-foreground max-w-xs truncate">
                    {a.title}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={cn('text-xs', TYPE_BADGE[a.type])}>
                      {TYPE_LABEL[a.type] ?? a.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">
                    {a.allowedProfiles.length === 0
                      ? 'Todos'
                      : a.allowedProfiles.map((p) => PROFILE_LABEL[p] ?? p).join(', ')}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground tabular-nums text-xs">
                    {formatDate(a.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={a.isActive ? 'border-green-200 bg-green-50 text-green-700' : 'border-border bg-muted text-muted-foreground'}>
                      {a.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(a)}
                        aria-label={`Editar aviso "${a.title}"`}
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                      {a.isActive && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(a)}
                          disabled={deleteMutation.isPending}
                          aria-label={`Desativar aviso "${a.title}"`}
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

      <AnnouncementFormDialog
        open={dialogOpen}
        editing={editing}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        isSubmitting={isBusy}
      />
    </div>
  )
}
