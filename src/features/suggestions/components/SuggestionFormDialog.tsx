import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { getApps } from '@/services/app.service'
import type { SuggestionType } from '@/types/enums'
import type { CreateSuggestionPayload } from '@/services/suggestion.service'

const TYPE_OPTIONS: { value: SuggestionType; label: string }[] = [
  { value: 'feature',     label: 'Nova funcionalidade' },
  { value: 'improvement', label: 'Melhoria'            },
  { value: 'bug',         label: 'Bug / problema'      },
  { value: 'other',       label: 'Outro'               },
]

interface SuggestionFormDialogProps {
  open: boolean
  onClose: () => void
  onSave: (payload: CreateSuggestionPayload) => Promise<void>
  isSubmitting: boolean
}

const DEFAULT = { title: '', body: '', type: 'feature' as SuggestionType, appId: '', appName: '' }

export function SuggestionFormDialog({
  open, onClose, onSave, isSubmitting,
}: SuggestionFormDialogProps) {
  const [form, setForm]   = useState(DEFAULT)
  const [error, setError] = useState<string | null>(null)

  const { data: apps = [] } = useQuery({
    queryKey: ['apps'],
    queryFn:  getApps,
    staleTime: 300_000,
    enabled:  open,
  })

  useEffect(() => {
    if (open) { setForm(DEFAULT); setError(null) }
  }, [open])

  function handleAppChange(appId: string) {
    const app = apps.find((a) => a.id === appId)
    setForm((f) => ({ ...f, appId, appName: app?.name ?? '' }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.title.trim()) { setError('O título é obrigatório.'); return }
    try {
      await onSave({
        title:   form.title.trim(),
        body:    form.body.trim() || null,
        type:    form.type,
        appId:   form.appId || null,
        appName: form.appName || null,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar sugestão.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova sugestão</DialogTitle>
          <DialogDescription>
            Compartilhe uma ideia, melhoria ou problema que identificou.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="sugg-app">
              Aplicativo <span className="text-muted-foreground font-normal">(opcional)</span>
            </label>
            <Select
              id="sugg-app"
              value={form.appId}
              onChange={(e) => handleAppChange(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="">— Geral —</option>
              {apps.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="sugg-type">
              Tipo <span className="text-destructive">*</span>
            </label>
            <Select
              id="sugg-type"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as SuggestionType }))}
              disabled={isSubmitting}
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="sugg-title">
              Título <span className="text-destructive">*</span>
            </label>
            <Input
              id="sugg-title"
              placeholder="Descreva brevemente sua sugestão"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              disabled={isSubmitting}
              maxLength={255}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="sugg-body">
              Detalhes <span className="text-muted-foreground font-normal">(opcional)</span>
            </label>
            <Textarea
              id="sugg-body"
              placeholder="Explique com mais detalhes, contexto ou exemplos"
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              disabled={isSubmitting}
              rows={4}
              className="resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2">
              {error}
            </p>
          )}
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            disabled={isSubmitting || !form.title.trim()}
          >
            {isSubmitting ? 'Enviando...' : 'Enviar sugestão'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
