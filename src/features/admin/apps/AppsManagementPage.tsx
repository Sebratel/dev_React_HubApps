import { useState } from 'react'
import { Plus, RefreshCw, Search, LayoutGrid, CheckCircle2, XCircle, Globe, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { canAccessAdminDashboard } from '@/utils/permissions'
import { ApiError } from '@/types/api'
import { PageHero, type HeroStat } from '@/components/PageHero'
import { useAppsPage } from './hooks/useAppsPage'
import { AppsTable, AppsTableEmpty, AppsTableSkeleton } from './components/AppsTable'
import { AppFormDialog, type AppFormValues } from './components/AppFormDialog'
import { AppDeactivateDialog } from './components/AppDeactivateDialog'
import { AppReactivateDialog } from './components/AppReactivateDialog'
import { AppDeleteDialog } from './components/AppDeleteDialog'
import type { AppItemModel } from '@/types/models'

type DialogKind = 'create' | 'edit' | 'deactivate' | 'reactivate' | 'delete' | null

function formatMutationError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.isForbidden) return 'Acesso negado. Você não tem permissão para esta operação.'
    if (err.isConflict) return 'Conflito detectado. Tente novamente.'
    if (err.isRateLimited) return 'Muitas requisições. Aguarde um momento e tente novamente.'
    return err.message
  }
  return 'Ocorreu um erro inesperado. Tente novamente.'
}

// ─── Mini insights panel ──────────────────────────────────────────────────────

function InsightBar({ label, value, total, color }: {
  label: string; value: number; total: number; color: string
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-foreground w-20 truncate">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-xs font-medium tabular-nums text-muted-foreground w-5 text-right">{value}</span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AppsManagementPage() {
  const currentUser = useAuthStore((s) => s.user)

  const {
    apps,
    totalApps,
    activeAppsCount,
    inactiveAppsCount,
    passTokenCount,
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
    deleteMutation,
  } = useAppsPage()

  const heroStats: HeroStat[] = [
    { icon: LayoutGrid,   value: totalApps,         label: 'cadastrados', tone: 'muted'  },
    { icon: CheckCircle2, value: activeAppsCount,   label: 'ativos',      tone: 'green'  },
    { icon: XCircle,      value: inactiveAppsCount, label: 'inativos',    tone: 'red'    },
  ]

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
    deleteMutation.reset()
  }

  function handleFormConfirm(values: AppFormValues) {
    const iconVal = values.iconUrl?.trim() || undefined

    if (dialog === 'create') {
      createMutation.mutate(
        {
          name: values.name,
          url: values.url,
          description: values.description,
          iconUrl: iconVal,
          ...(values.cardColor ? { cardColor: values.cardColor } : {}),
          passToken: values.passToken,
          passUser: values.passUser,
          status: values.status,
          allowedProfiles: values.allowedProfiles,
          allowedUsers: values.allowedUsers,
          allowedTeams: values.allowedTeams,
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
            ...(values.cardColor ? { card_color: values.cardColor } : {}),
            pass_token: values.passToken,
            pass_user: values.passUser,
            status: values.status,
            allowed_profiles: values.allowedProfiles,
            allowed_users: values.allowedUsers,
            allowed_teams: values.allowedTeams,
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

  const showInsights = !isLoading && totalApps >= 2

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHero
        icon={LayoutGrid}
        title="Aplicativos"
        subtitle="Cadastre e gerencie os aplicativos disponíveis no portal."
        stats={!isLoading ? heroStats : undefined}
        actions={
          <Button size="sm" onClick={() => openDialog('create')}>
            <Plus className="h-4 w-4 mr-1.5" aria-hidden />
            Criar app
          </Button>
        }
      />

      {/* Insights */}
      {showInsights && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-card px-4 py-3.5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-3">
              Distribuição por status
            </p>
            <div className="space-y-2.5">
              <InsightBar label="Ativos" value={activeAppsCount} total={totalApps} color="#22c55e" />
              <InsightBar label="Inativos" value={inactiveAppsCount} total={totalApps} color="#f87171" />
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3.5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-3">
              Tipo de acesso
            </p>
            <div className="space-y-2.5">
              <InsightBar
                label="Acesso livre"
                value={totalApps - passTokenCount}
                total={totalApps}
                color="#60a5fa"
              />
              <InsightBar
                label="Com token"
                value={passTokenCount}
                total={totalApps}
                color="#f59e0b"
              />
            </div>
          </div>
        </div>
      )}

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

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden />
          <Input
            placeholder="Buscar por nome, descrição ou URL..."
            className="pl-9"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
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

      {/* Filter chips */}
      <div className="flex flex-wrap gap-4">
        {/* Status chips */}
        <div className="flex items-center gap-1.5">
          {(
            [
              { value: 'all',      label: 'Todos',    count: totalApps         },
              { value: 'active',   label: 'Ativos',   count: activeAppsCount   },
              { value: 'inactive', label: 'Inativos', count: inactiveAppsCount },
            ] as const
          ).map(({ value, label, count }) => (
            <button
              key={value}
              onClick={() => setFilters((f) => ({ ...f, status: value }))}
              className={cn(
                'inline-flex items-center gap-1.5 h-7 px-3 rounded-full border text-xs font-medium transition-colors',
                filters.status === value
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'bg-card border-border text-muted-foreground hover:bg-muted/50'
              )}
            >
              {label}
              {value !== 'all' && (
                <span className="tabular-nums opacity-70">{count}</span>
              )}
            </button>
          ))}
        </div>

        <div className="w-px bg-border self-stretch" aria-hidden />

        {/* Access type chips */}
        <div className="flex items-center gap-1.5">
          {(
            [
              { value: 'all', label: 'Todos', icon: null,   count: null           },
              { value: 'no',  label: 'Livre', icon: Globe,  count: totalApps - passTokenCount },
              { value: 'yes', label: 'Token', icon: Lock,   count: passTokenCount },
            ] as const
          ).map(({ value, label, icon: Icon, count }) => (
            <button
              key={value}
              onClick={() => setFilters((f) => ({ ...f, passToken: value }))}
              className={cn(
                'inline-flex items-center gap-1.5 h-7 px-3 rounded-full border text-xs font-medium transition-colors',
                filters.passToken === value
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'bg-card border-border text-muted-foreground hover:bg-muted/50'
              )}
            >
              {Icon && <Icon className="h-3 w-3" aria-hidden />}
              {label}
              {count !== null && (
                <span className="tabular-nums opacity-70">{count}</span>
              )}
            </button>
          ))}
        </div>

        {hasFilters && (
          <button
            onClick={() => setFilters({ search: '', status: 'all', passToken: 'all' })}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Grid */}
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
          onDelete={(app) => openDialog('delete', app)}
        />
      )}

      {/* Results summary */}
      {!isLoading && !isError && apps.length > 0 && hasFilters && (
        <p className="text-xs text-muted-foreground text-right">
          Exibindo {apps.length} de {totalApps} aplicativos
        </p>
      )}

      {/* ── Dialogs ──────────────────────────────────────────────────────────── */}

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

      <AppDeleteDialog
        app={selectedApp}
        open={dialog === 'delete'}
        isPending={deleteMutation.isPending}
        error={deleteMutation.isError ? formatMutationError(deleteMutation.error) : null}
        onConfirm={() => {
          if (!selectedApp) return
          deleteMutation.mutate(selectedApp.id, { onSuccess: closeDialog })
        }}
        onClose={closeDialog}
      />
    </div>
  )
}
