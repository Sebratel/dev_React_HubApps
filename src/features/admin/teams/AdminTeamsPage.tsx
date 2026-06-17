import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Plus, RefreshCw, Pencil, Trash2, Users, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { canAccessAdminDashboard } from '@/utils/permissions'
import { ApiError } from '@/types/api'
import { PageHero, type HeroStat } from '@/components/PageHero'
import { useTeamsPage } from './hooks/useTeamsPage'
import { TeamFormDialog } from './components/TeamFormDialog'
import type { TeamModel, TeamPayload } from '@/services/team.service'

// ─── Avatar palette ───────────────────────────────────────────────────────────

const TEAM_PALETTE = [
  { bg: '#E6F1FB', text: '#185FA5' },
  { bg: '#FAEEDA', text: '#854F0B' },
  { bg: '#E1F5EE', text: '#0F6E56' },
  { bg: '#EEEDFE', text: '#534AB7' },
  { bg: '#EAF3DE', text: '#3B6D11' },
  { bg: '#FCEBEB', text: '#A32D2D' },
]

function getTeamColors(name: string) {
  return TEAM_PALETTE[name.charCodeAt(0) % TEAM_PALETTE.length]
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatError(err: unknown) {
  if (err instanceof ApiError) {
    if (err.isConflict) return 'Já existe um time com esse nome.'
    return err.message
  }
  return 'Ocorreu um erro inesperado.'
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AdminTeamsPage() {
  const user = useAuthStore((s) => s.user)
  const { teams, isLoading, isError, refetch, createMutation, updateMutation, deleteMutation } =
    useTeamsPage()

  const [dialogOpen, setDialogOpen]       = useState(false)
  const [editing, setEditing]             = useState<TeamModel | null>(null)
  const [mutationError, setMutationError] = useState<string | null>(null)

  const reduced = useReducedMotion()

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
  const totalMembers  = activeTeams.reduce((s, t) => s + t.memberCount, 0)

  const heroStats: HeroStat[] = [
    { icon: Users,     value: activeTeams.length,  label: 'times ativos',   tone: 'primary' },
    { icon: UserRound, value: totalMembers,         label: 'membros',        tone: 'amber'   },
    { icon: Users,     value: inactiveTeams.length, label: 'times inativos', tone: 'muted'   },
  ]

  const skeletonCards = Array.from({ length: 4 })

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHero
        icon={Users}
        title="Times"
        subtitle="Gerencie as equipes e controle o acesso a aplicativos."
        stats={!isLoading && teams.length > 0 ? heroStats : undefined}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" aria-hidden />
            Novo time
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {isLoading
            ? 'Carregando...'
            : `${teams.length} time${teams.length !== 1 ? 's' : ''} no total`}
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={cn('h-4 w-4 mr-1.5', isLoading && 'animate-spin')} aria-hidden />
          Atualizar
        </Button>
      </div>

      {/* Error */}
      {(isError || mutationError) && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {mutationError ?? 'Erro ao carregar times. Tente atualizar.'}
        </div>
      )}

      {/* Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {skeletonCards.map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-muted animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-muted rounded animate-pulse w-32" />
                  <div className="h-3 bg-muted rounded animate-pulse w-48" />
                </div>
              </div>
              <div className="h-3 bg-muted rounded animate-pulse w-full" />
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="h-5 bg-muted rounded-full animate-pulse w-16" />
                <div className="h-5 bg-muted rounded-full animate-pulse w-20" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && teams.length === 0 && (
        <div className="rounded-xl border border-border bg-card px-6 py-16 flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <Users className="h-6 w-6 text-muted-foreground/40" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Nenhum time cadastrado.</p>
            <p className="mt-1 text-xs text-muted-foreground">Crie o primeiro time para organizar os usuários.</p>
          </div>
          <Button size="sm" variant="outline" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" aria-hidden />
            Criar o primeiro time
          </Button>
        </div>
      )}

      {/* Card grid */}
      {!isLoading && teams.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {teams.map((t, i) => {
            const colors = getTeamColors(t.name)
            const initials = getInitials(t.name)
            return (
              <motion.div
                key={t.id}
                className={cn(
                  'group relative flex flex-col rounded-xl border border-border bg-card p-4 gap-3',
                  'transition-colors hover:border-primary/35 hover:shadow-[0_2px_16px_-6px_rgba(0,0,0,0.12)]',
                  !t.isActive && 'opacity-60'
                )}
                initial={reduced ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: t.isActive ? 1 : 0.6, y: 0 }}
                transition={{ duration: 0.25, delay: reduced ? 0 : i * 0.04, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* Header: avatar + name */}
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                    style={{ background: colors.bg, color: colors.text }}
                    aria-hidden
                  >
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate leading-snug">{t.name}</p>
                    {t.description ? (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{t.description}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground/40 mt-0.5 italic">Sem descrição</p>
                    )}
                  </div>
                </div>

                {/* Footer: members + status + actions */}
                <div className="flex items-center gap-2 pt-2.5 mt-auto border-t border-border">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" aria-hidden />
                    {t.memberCount} membro{t.memberCount !== 1 ? 's' : ''}
                  </span>

                  <Badge
                    variant="outline"
                    className={cn(
                      'ml-auto text-[10px] px-1.5 py-0',
                      t.isActive
                        ? 'border-green-200 bg-green-50 text-green-700'
                        : 'border-border bg-muted text-muted-foreground'
                    )}
                  >
                    {t.isActive ? 'Ativo' : 'Inativo'}
                  </Badge>

                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => openEdit(t)}
                      aria-label={`Editar time "${t.name}"`}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                    {t.isActive && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(t)}
                        disabled={deleteMutation.isPending}
                        aria-label={`Desativar time "${t.name}"`}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

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
