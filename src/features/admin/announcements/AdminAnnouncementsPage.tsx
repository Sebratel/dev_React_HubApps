import { useState, useMemo } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  Plus, RefreshCw, Pencil, Trash2, Megaphone,
  CheckCircle2, BellOff, AlertTriangle, Info, Bell, Search, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { canAccessAdminDashboard } from '@/utils/permissions'
import { ApiError } from '@/types/api'
import { PROFILE_LABEL } from '@/constants/profiles'
import { PageHero, type HeroStat } from '@/components/PageHero'
import { useAnnouncementsPage } from './hooks/useAnnouncementsPage'
import { AnnouncementFormDialog } from './components/AnnouncementFormDialog'
import type { AnnouncementModel } from '@/types/models'
import type { CreateAnnouncementPayload, UpdateAnnouncementPayload } from '@/services/announcement.service'

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  info: 'Informativo', warning: 'Aviso', urgent: 'Urgente', success: 'Concluído',
}

const TYPE_ACCENT: Record<string, string> = {
  urgent:  '#E24B4A',
  warning: '#EF9F27',
  info:    '#888780',
  success: '#639922',
}

const TYPE_BADGE: Record<string, string> = {
  info:    'bg-muted/60 text-muted-foreground border-border',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  urgent:  'bg-red-50 text-destructive border-red-200',
  success: 'bg-green-50 text-green-700 border-green-200',
}

const TYPE_ICON: Record<string, React.ElementType> = {
  info:    Info,
  warning: Bell,
  urgent:  AlertTriangle,
  success: CheckCircle2,
}

const TYPE_FILTERS = [
  { value: 'all',     label: 'Todos'        },
  { value: 'urgent',  label: 'Urgentes'     },
  { value: 'warning', label: 'Avisos'       },
  { value: 'info',    label: 'Informativos' },
  { value: 'success', label: 'Concluídos'   },
]

function formatDate(d: Date) {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatError(err: unknown) {
  if (err instanceof ApiError) return err.message
  return 'Ocorreu um erro inesperado.'
}

// ── Card ──────────────────────────────────────────────────────────────────────

interface CardProps {
  a: AnnouncementModel
  onEdit: (a: AnnouncementModel) => void
  onDelete: (a: AnnouncementModel) => void
  deleting: boolean
  index: number
  reduced: boolean
}

function AnnouncementCard({ a, onEdit, onDelete, deleting, index, reduced }: CardProps) {
  const Icon = TYPE_ICON[a.type] ?? Info
  const accent = TYPE_ACCENT[a.type] ?? '#888780'
  const profiles = a.allowedProfiles.length === 0
    ? 'Todos os perfis'
    : a.allowedProfiles.map((p) => PROFILE_LABEL[p] ?? p).join(', ')

  return (
    <motion.div
      layout
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: a.isActive ? 1 : 0.5, y: 0 }}
      exit={reduced ? undefined : { opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2, delay: reduced ? 0 : index * 0.04 }}
      className="group flex rounded-xl border border-border bg-card overflow-hidden transition-shadow hover:shadow-sm"
    >
      <div className="w-[3px] flex-shrink-0" style={{ background: accent }} />
      <div className="flex flex-1 min-w-0 items-start gap-3 px-4 py-3.5">
        <div
          className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
          style={{ background: `${accent}18` }}
        >
          <Icon className="h-[18px] w-[18px]" style={{ color: accent }} aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[15px] leading-snug text-foreground">{a.title}</p>
              {a.body && (
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2 leading-relaxed">{a.body}</p>
              )}
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className={cn('text-[11px] px-2 py-0 h-5', TYPE_BADGE[a.type])}>
                  {TYPE_LABEL[a.type] ?? a.type}
                </Badge>
                <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground">
                  {profiles}
                </span>
                <span className="text-[11px] text-muted-foreground tabular-nums">{formatDate(a.createdAt)}</span>
                <Badge
                  variant="outline"
                  className={cn('ml-auto text-[11px] px-2 py-0 h-5', a.isActive
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-muted/60 text-muted-foreground border-border'
                  )}
                >
                  {a.isActive ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <Button
                variant="ghost" size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => onEdit(a)}
                aria-label={`Editar "${a.title}"`}
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden />
              </Button>
              {a.isActive && (
                <Button
                  variant="ghost" size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => onDelete(a)}
                  disabled={deleting}
                  aria-label={`Desativar "${a.title}"`}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function SkeletonCard() {
  return (
    <div className="flex h-[108px] rounded-xl border border-border bg-card overflow-hidden animate-pulse">
      <div className="w-[3px] bg-muted" />
      <div className="flex flex-1 items-start gap-3 px-4 py-3.5">
        <div className="mt-0.5 h-9 w-9 flex-shrink-0 rounded-xl bg-muted" />
        <div className="flex-1 space-y-2 pt-0.5">
          <div className="h-4 bg-muted rounded w-3/5" />
          <div className="h-3 bg-muted rounded w-full" />
          <div className="h-3 bg-muted rounded w-4/6" />
          <div className="mt-1 flex gap-2">
            <div className="h-5 w-16 bg-muted rounded-full" />
            <div className="h-5 w-24 bg-muted rounded-full" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function AdminAnnouncementsPage() {
  const user = useAuthStore((s) => s.user)
  const {
    announcements, isLoading, isError, refetch,
    createMutation, updateMutation, deleteMutation,
  } = useAnnouncementsPage()

  const [dialogOpen, setDialogOpen]       = useState(false)
  const [editing, setEditing]             = useState<AnnouncementModel | null>(null)
  const [mutationError, setMutationError] = useState<string | null>(null)
  const [search, setSearch]               = useState('')
  const [typeFilter, setTypeFilter]       = useState<string>('all')
  const reduced = useReducedMotion()

  const activeCount   = useMemo(() => announcements.filter((a) => a.isActive).length,  [announcements])
  const urgentCount   = useMemo(() => announcements.filter((a) => a.type === 'urgent' && a.isActive).length, [announcements])
  const inactiveCount = useMemo(() => announcements.filter((a) => !a.isActive).length, [announcements])

  const typeCounts = useMemo(() => ({
    urgent:  announcements.filter((a) => a.type === 'urgent').length,
    warning: announcements.filter((a) => a.type === 'warning').length,
    info:    announcements.filter((a) => a.type === 'info').length,
    success: announcements.filter((a) => a.type === 'success').length,
  }), [announcements])

  const urgentActive = useMemo(() =>
    announcements.filter((a) => a.type === 'urgent' && a.isActive), [announcements])

  const filtered = useMemo(() =>
    announcements.filter((a) => {
      const q = search.toLowerCase()
      if (q && !a.title.toLowerCase().includes(q) && !a.body?.toLowerCase().includes(q)) return false
      if (typeFilter !== 'all' && a.type !== typeFilter) return false
      return true
    }), [announcements, search, typeFilter])

  const hasFilter = search !== '' || typeFilter !== 'all'

  const heroStats: HeroStat[] = [
    { icon: Megaphone,     value: activeCount,   label: 'ativos',   tone: 'primary' },
    { icon: AlertTriangle, value: urgentCount,   label: 'urgentes', tone: 'red'     },
    { icon: BellOff,       value: inactiveCount, label: 'inativos', tone: 'muted'   },
  ]

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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <PageHero
        icon={Megaphone}
        title="Avisos"
        subtitle="Publique e gerencie comunicados para a equipe."
        stats={!isLoading && announcements.length > 0 ? heroStats : undefined}
      />

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {isLoading ? 'Carregando...' : `${announcements.length} aviso${announcements.length !== 1 ? 's' : ''} no total`}
        </p>
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

      {/* Search + type filter */}
      {!isLoading && announcements.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-3 flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden />
            <Input
              placeholder="Buscar por título ou conteúdo..."
              className="pl-9 h-9 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setSearch('')}
                aria-label="Limpar busca"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TYPE_FILTERS.map((f) => {
              const count = f.value === 'all'
                ? announcements.length
                : (typeCounts[f.value as keyof typeof typeCounts] ?? 0)
              const active = typeFilter === f.value
              return (
                <button
                  key={f.value}
                  onClick={() => setTypeFilter(f.value)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  {f.value !== 'all' && (
                    <span
                      className="h-2 w-2 rounded-full flex-shrink-0"
                      style={{ background: active ? 'currentColor' : TYPE_ACCENT[f.value] }}
                    />
                  )}
                  {f.label}
                  <span className={cn(
                    'rounded-full px-1.5 text-[10px] font-semibold leading-5 min-w-[18px] text-center',
                    active ? 'bg-white/20 text-current' : 'bg-muted text-muted-foreground'
                  )}>
                    {count}
                  </span>
                </button>
              )
            })}
            {hasFilter && (
              <button
                className="flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => { setSearch(''); setTypeFilter('all') }}
              >
                <X className="h-3 w-3" aria-hidden />
                Limpar filtros
              </button>
            )}
          </div>
        </div>
      )}

      {/* Urgent active alert */}
      {!isLoading && urgentActive.length > 0 && !hasFilter && (
        <div className="rounded-xl overflow-hidden border border-red-200">
          <div className="flex items-center gap-2 px-4 py-2 bg-red-100 border-b border-red-200">
            <AlertTriangle className="h-3.5 w-3.5 text-red-600 flex-shrink-0" aria-hidden />
            <span className="text-xs font-semibold text-red-800">
              {urgentActive.length} aviso{urgentActive.length !== 1 ? 's urgentes ativos' : ' urgente ativo'} — revisão recomendada
            </span>
          </div>
          <div>
            {urgentActive.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5 bg-red-50 border-b border-red-100 last:border-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-red-900 truncate">{a.title}</p>
                  <p className="text-xs text-red-600">{formatDate(a.createdAt)}</p>
                </div>
                <Button
                  variant="ghost" size="sm"
                  className="h-7 shrink-0 text-xs text-red-700 hover:bg-red-100"
                  onClick={() => openEdit(a)}
                >
                  <Pencil className="h-3 w-3 mr-1" aria-hidden />
                  Editar
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        hasFilter ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card px-6 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <Search className="h-5 w-5 text-muted-foreground/50" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Nenhum aviso encontrado</p>
              <p className="mt-1 text-xs text-muted-foreground">Tente ajustar a busca ou os filtros aplicados.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setTypeFilter('all') }}>
              Limpar filtros
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <Megaphone className="h-6 w-6 text-muted-foreground/40" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Nenhum aviso cadastrado</p>
              <p className="mt-1 text-xs text-muted-foreground">Crie o primeiro comunicado para a equipe.</p>
            </div>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1.5" aria-hidden />
              Novo aviso
            </Button>
          </div>
        )
      ) : (
        <div className="flex flex-col gap-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((a, index) => (
              <AnnouncementCard
                key={a.id}
                a={a}
                onEdit={openEdit}
                onDelete={handleDelete}
                deleting={deleteMutation.isPending}
                index={index}
                reduced={!!reduced}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

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
