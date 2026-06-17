import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Plus, Pencil, Trash2, ExternalLink, Globe, FileText, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppIcon } from '@/components/app-icon'
import { PageHero, type HeroStat } from '@/components/PageHero'
import { getAdminManuals, createManual, updateManual, deleteManual } from '@/services/manual.service'
import { listAllApps } from '@/services/admin/admin-app.service'
import type { AppManualModel } from '@/types/models'
import type { AppItemModel } from '@/types/models'

// ── ManualFormDialog ──────────────────────────────────────────────────────────

interface ManualFormDialogProps {
  apps: AppItemModel[]
  existingAppIds: Set<string>
  manual?: AppManualModel
  onClose: () => void
  onSave: (data: { appId: string; wikiUrl: string; pdfUrl: string; description: string }) => void
  isSaving: boolean
}

function ManualFormDialog({ apps, existingAppIds, manual, onClose, onSave, isSaving }: ManualFormDialogProps) {
  const isEdit = !!manual

  const [appId,       setAppId]       = useState(manual?.appId ?? '')
  const [wikiUrl,     setWikiUrl]     = useState(manual?.wikiUrl ?? '')
  const [pdfUrl,      setPdfUrl]      = useState(manual?.pdfUrl ?? '')
  const [description, setDescription] = useState(manual?.description ?? '')
  const [errors,      setErrors]      = useState<Record<string, string>>({})

  function validate() {
    const e: Record<string, string> = {}
    if (!isEdit && !appId)                          e.appId   = 'Selecione um aplicativo'
    if (!wikiUrl.trim() && !pdfUrl.trim())          e.urls    = 'Informe pelo menos uma URL (Wiki ou PDF)'
    if (wikiUrl && !/^https?:\/\/.+/.test(wikiUrl)) e.wikiUrl = 'URL inválida'
    if (pdfUrl  && !/^https?:\/\/.+/.test(pdfUrl))  e.pdfUrl  = 'URL inválida'
    setErrors(e)
    return !Object.keys(e).length
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    onSave({ appId, wikiUrl: wikiUrl.trim(), pdfUrl: pdfUrl.trim(), description: description.trim() })
  }

  const availableApps = apps.filter((a) => !existingAppIds.has(a.id) || a.id === manual?.appId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/12">
            <BookOpen className="h-4 w-4 text-primary" aria-hidden />
          </div>
          <h2 className="text-base font-semibold text-foreground">
            {isEdit ? 'Editar manual' : 'Adicionar manual'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          {!isEdit && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Aplicativo</label>
              <select
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Selecione um aplicativo…</option>
                {availableApps.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              {errors.appId && <p className="text-xs text-destructive">{errors.appId}</p>}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              URL da Wiki
            </label>
            <input
              type="url"
              placeholder="https://wiki.empresa.com/manual-app"
              value={wikiUrl}
              onChange={(e) => setWikiUrl(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.wikiUrl && <p className="text-xs text-destructive">{errors.wikiUrl}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              URL do PDF
            </label>
            <input
              type="url"
              placeholder="https://docs.empresa.com/manual-app.pdf"
              value={pdfUrl}
              onChange={(e) => setPdfUrl(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.pdfUrl && <p className="text-xs text-destructive">{errors.pdfUrl}</p>}
          </div>

          {errors.urls && (
            <p className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {errors.urls}
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">
              Descrição <span className="text-muted-foreground font-normal">(opcional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Breve descrição do conteúdo do manual…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Adicionar manual'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── DeleteDialog ──────────────────────────────────────────────────────────────

interface DeleteDialogProps {
  manual: AppManualModel
  onClose: () => void
  onConfirm: () => void
  isDeleting: boolean
}

function DeleteDialog({ manual, onClose, onConfirm, isDeleting }: DeleteDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl bg-card border border-border shadow-2xl p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-destructive/12">
            <Trash2 className="h-4 w-4 text-destructive" aria-hidden />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Remover manual</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              O manual de <strong>{manual.appName}</strong> será removido permanentemente.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isDeleting}>Cancelar</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? 'Removendo…' : 'Remover'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function AdminManualsPage() {
  const qc = useQueryClient()

  const { data: manuals = [], isLoading, error } = useQuery({
    queryKey: ['admin', 'manuals'],
    queryFn: getAdminManuals,
  })

  const { data: apps = [] } = useQuery({
    queryKey: ['admin', 'apps-all'],
    queryFn: listAllApps,
  })

  const [addOpen,      setAddOpen]      = useState(false)
  const [editTarget,   setEditTarget]   = useState<AppManualModel | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AppManualModel | null>(null)

  const existingAppIds = new Set(manuals.map((m) => m.appId))

  const withWiki   = manuals.filter((m) => m.wikiUrl).length
  const withPdf    = manuals.filter((m) => m.pdfUrl).length
  const withBoth   = manuals.filter((m) => m.wikiUrl && m.pdfUrl).length

  const heroStats: HeroStat[] = [
    { icon: BookOpen,  value: manuals.length, label: 'manuais',    tone: 'muted'  },
    { icon: Globe,     value: withWiki,        label: 'com wiki',   tone: 'primary' },
    { icon: FileText,  value: withPdf,         label: 'com PDF',    tone: 'amber'  },
  ]

  const createMut = useMutation({
    mutationFn: createManual,
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['admin', 'manuals'] }); setAddOpen(false) },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateManual>[1] }) =>
      updateManual(id, data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['admin', 'manuals'] }); setEditTarget(null) },
  })

  const deleteMut = useMutation({
    mutationFn: deleteManual,
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['admin', 'manuals'] }); setDeleteTarget(null) },
  })

  function handleSave(data: { appId: string; wikiUrl: string; pdfUrl: string; description: string }) {
    if (editTarget) {
      updateMut.mutate({
        id: editTarget.id,
        data: {
          wiki_url:    data.wikiUrl    || null,
          pdf_url:     data.pdfUrl     || null,
          description: data.description || null,
        },
      })
    } else {
      createMut.mutate({
        appId:       data.appId,
        wikiUrl:     data.wikiUrl    || undefined,
        pdfUrl:      data.pdfUrl     || undefined,
        description: data.description || undefined,
      })
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">

      <PageHero
        icon={BookOpen}
        title="Manuais dos Aplicativos"
        subtitle="Gerencie os links de wiki e PDF para cada aplicativo."
        stats={!isLoading && manuals.length > 0 ? heroStats : undefined}
        actions={
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" aria-hidden />
            Adicionar manual
          </Button>
        }
      />

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          Erro ao carregar manuais
        </div>
      )}

      {/* Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-muted animate-pulse shrink-0" />
                <div className="h-4 w-32 bg-muted rounded animate-pulse" />
              </div>
              <div className="h-3 w-full bg-muted rounded animate-pulse" />
              <div className="flex gap-2 pt-2 border-t border-border">
                <div className="h-6 w-20 bg-muted rounded-full animate-pulse" />
                <div className="h-6 w-16 bg-muted rounded-full animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && manuals.length === 0 && (
        <div className="rounded-xl border border-border bg-card px-6 py-16 flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <BookOpen className="h-6 w-6 text-muted-foreground/40" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Nenhum manual cadastrado ainda</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Clique em "Adicionar manual" para vincular um manual a um aplicativo.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" aria-hidden />
            Adicionar manual
          </Button>
        </div>
      )}

      {/* Card grid */}
      {!isLoading && !error && manuals.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {manuals.map((manual) => (
            <div
              key={manual.id}
              className="group flex flex-col rounded-xl border border-border bg-card p-4 gap-3
                         transition-colors hover:border-primary/35 hover:shadow-[0_2px_16px_-6px_rgba(0,0,0,0.12)]"
            >
              {/* App header */}
              <div className="flex items-center gap-2.5">
                <AppIcon icon={manual.appIcon ?? '📦'} name={manual.appName} size="sm" showBackground />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{manual.appName}</p>
                  {manual.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{manual.description}</p>
                  )}
                </div>
                {/* Action buttons */}
                <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditTarget(manual)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    aria-label={`Editar manual de ${manual.appName}`}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(manual)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    aria-label={`Remover manual de ${manual.appName}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              </div>

              {/* Links */}
              <div className="flex flex-col gap-1.5 pt-2.5 border-t border-border">
                {manual.wikiUrl ? (
                  <a
                    href={manual.wikiUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline truncate"
                  >
                    <Globe className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{manual.wikiUrl}</span>
                    <ExternalLink className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
                  </a>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
                    <Globe className="h-3.5 w-3.5" aria-hidden />
                    Sem wiki
                  </span>
                )}

                {manual.pdfUrl ? (
                  <a
                    href={manual.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline truncate"
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{manual.pdfUrl}</span>
                    <ExternalLink className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
                  </a>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
                    <FileText className="h-3.5 w-3.5" aria-hidden />
                    Sem PDF
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {!isLoading && manuals.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {withBoth} com wiki e PDF · {withWiki - withBoth} só wiki · {withPdf - withBoth} só PDF
        </p>
      )}

      {/* Dialogs */}
      {(addOpen || editTarget) && (
        <ManualFormDialog
          apps={apps}
          existingAppIds={existingAppIds}
          manual={editTarget ?? undefined}
          onClose={() => { setAddOpen(false); setEditTarget(null) }}
          onSave={handleSave}
          isSaving={createMut.isPending || updateMut.isPending}
        />
      )}

      {deleteTarget && (
        <DeleteDialog
          manual={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => deleteMut.mutate(deleteTarget.id)}
          isDeleting={deleteMut.isPending}
        />
      )}
    </div>
  )
}
