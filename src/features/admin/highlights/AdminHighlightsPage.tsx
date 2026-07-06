import { useState, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Eye, EyeOff, GripVertical, Sparkles, CheckCircle2, EyeOffIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { resolveAssetUrl } from '@/lib/api'
import { ApiError } from '@/types/api'
import { PageHero, type HeroStat } from '@/components/PageHero'
import {
  listAllHighlights, createHighlight, updateHighlight, deleteHighlight,
} from '@/services/highlight.service'
import { HighlightFormDialog, type HighlightFormValues } from './components/HighlightFormDialog'
import type { HighlightModel } from '@/types/models'

function formatError(err: unknown): string {
  if (err instanceof ApiError) return err.message
  return 'Ocorreu um erro inesperado. Tente novamente.'
}

export function AdminHighlightsPage() {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [selected, setSelected] = useState<HighlightModel | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<HighlightModel | null>(null)

  const { data: highlights = [], isLoading } = useQuery({
    queryKey: ['admin', 'highlights'],
    queryFn: listAllHighlights,
    staleTime: 30_000,
  })

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'highlights'] })
    void queryClient.invalidateQueries({ queryKey: ['highlights'] })
  }

  const createMutation = useMutation({
    mutationFn: (p: Parameters<typeof createHighlight>[0]) => createHighlight(p),
    onSuccess: () => { invalidate(); closeForm() },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateHighlight>[1] }) =>
      updateHighlight(id, payload),
    onSuccess: () => { invalidate(); closeForm() },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteHighlight,
    onSuccess: () => { invalidate(); setDeleteTarget(null) },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateHighlight(id, { is_active: isActive }),
    onSuccess: invalidate,
  })

  function openCreate() { setSelected(null); setFormOpen(true) }
  function openEdit(h: HighlightModel) { setSelected(h); setFormOpen(true) }
  function closeForm() { setFormOpen(false); setSelected(null); createMutation.reset(); updateMutation.reset() }

  function handleConfirm(values: HighlightFormValues) {
    if (selected) {
      const payload: Parameters<typeof updateHighlight>[1] = {
        title:           values.title,
        description:     values.description || null,
        badge_text:      values.badgeText   || null,
        cta_label:       values.ctaLabel    || null,
        cta_url:         values.ctaUrl      || null,
        object_fit:      values.objectFit,
        object_position: values.objectPosition,
        sort_order:      values.sortOrder   ?? 0,
        is_active:       values.isActive,
      }
      if (values.imageUrl !== selected.imageUrl) {
        payload.image_url = values.imageUrl
      }
      updateMutation.mutate({ id: selected.id, payload })
    } else {
      createMutation.mutate({
        title:          values.title,
        description:    values.description,
        badgeText:      values.badgeText,
        ctaLabel:       values.ctaLabel,
        ctaUrl:         values.ctaUrl,
        imageUrl:       values.imageUrl,
        objectFit:      values.objectFit,
        objectPosition: values.objectPosition,
        sortOrder:      values.sortOrder,
      })
    }
  }

  const mutationError =
    selected && updateMutation.isError ? formatError(updateMutation.error)
    : !selected && createMutation.isError ? formatError(createMutation.error)
    : null

  const activeHighlights   = useMemo(() => highlights.filter((h) => h.isActive).length, [highlights])
  const inactiveHighlights = useMemo(() => highlights.filter((h) => !h.isActive).length, [highlights])

  const heroStats: HeroStat[] = [
    { icon: Sparkles,     value: highlights.length,  label: 'cadastrados', tone: 'primary' },
    { icon: CheckCircle2, value: activeHighlights,   label: 'ativos',      tone: 'green'   },
    { icon: EyeOffIcon,   value: inactiveHighlights, label: 'inativos',    tone: 'muted'   },
  ]

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHero
        icon={Sparkles}
        title="Destaques"
        subtitle="Banners exibidos no topo do dashboard para todos os usuários."
        stats={!isLoading && highlights.length > 0 ? heroStats : undefined}
      />

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {isLoading ? 'Carregando...' : `${highlights.length} destaque${highlights.length !== 1 ? 's' : ''} no total`}
        </p>
        <Button onClick={openCreate} size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> Novo destaque
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : highlights.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-20 text-center">
          <p className="text-sm font-medium text-muted-foreground">Nenhum destaque criado ainda.</p>
          <Button variant="outline" onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Criar primeiro destaque
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {highlights.map((h) => (
            <div
              key={h.id}
              className={cn(
                'flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-opacity',
                !h.isActive && 'opacity-55',
              )}
            >
              {/* Drag handle decoration */}
              <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/40" aria-hidden />

              {/* Thumbnail */}
              <div className="h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                <img src={resolveAssetUrl(h.imageUrl)} alt="" className="h-full w-full object-cover" />
              </div>

              {/* Info */}
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  {h.badgeText && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary tracking-wide uppercase">
                      {h.badgeText}
                    </span>
                  )}
                  {!h.isActive && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      Inativo
                    </span>
                  )}
                </div>
                <p className="truncate text-sm font-semibold text-foreground">{h.title}</p>
                {h.description && (
                  <p className="truncate text-xs text-muted-foreground">{h.description}</p>
                )}
              </div>

              {/* Order */}
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">#{h.sortOrder}</span>

              {/* Actions */}
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => toggleMutation.mutate({ id: h.id, isActive: !h.isActive })}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label={h.isActive ? 'Desativar' : 'Ativar'}
                  title={h.isActive ? 'Desativar' : 'Ativar'}
                >
                  {h.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => openEdit(h)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Editar"
                  title="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDeleteTarget(h)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Excluir"
                  title="Excluir"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-card border border-border p-6 shadow-2xl flex flex-col gap-4">
            <h3 className="font-bold text-lg">Excluir destaque</h3>
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja excluir <strong className="text-foreground">"{deleteTarget.title}"</strong>?
              Esta ação não pode ser desfeita.
            </p>
            {deleteMutation.isError && (
              <p className="text-sm text-destructive">{formatError(deleteMutation.error)}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setDeleteTarget(null); deleteMutation.reset() }}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Form dialog */}
      <HighlightFormDialog
        highlight={selected ?? undefined}
        open={formOpen}
        isPending={createMutation.isPending || updateMutation.isPending}
        error={mutationError}
        onConfirm={handleConfirm}
        onClose={closeForm}
      />
    </div>
  )
}
