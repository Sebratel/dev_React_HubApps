import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { getApps } from '@/services/app.service'
import { getTeams } from '@/services/team.service'
import { getUserApps } from '@/utils/permissions'
import { useAuthStore } from '@/stores/auth.store'
import { cn } from '@/lib/utils'
import type { SuggestionType } from '@/types/enums'
import type { CreateSuggestionPayload } from '@/services/suggestion.service'

const BODY_MAX = 3000

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

const DEFAULT = {
  title: '',
  body: '',
  type: 'feature' as SuggestionType,
  sector: '',
  appId: '',
  appName: '',
}

export function SuggestionFormDialog({
  open, onClose, onSave, isSubmitting,
}: SuggestionFormDialogProps) {
  const [form, setForm]   = useState(DEFAULT)
  const [error, setError] = useState<string | null>(null)

  const user = useAuthStore((s) => s.user)

  const { data: allApps = [] } = useQuery({
    queryKey: ['apps'],
    queryFn: getApps,
    staleTime: 300_000,
    enabled: open && !!user,
  })

  const { data: teams = [], isLoading: loadingTeams } = useQuery({
    queryKey: ['teams'],
    queryFn: getTeams,
    staleTime: 300_000,
    enabled: open,
  })

  const apps = useMemo(
    () => (user ? getUserApps(user, allApps) : []),
    [user, allApps]
  )

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
    if (!form.sector.trim()) { setError('Selecione o setor.'); return }
    if (!form.title.trim()) { setError('O título é obrigatório.'); return }
    if (form.body.length > BODY_MAX) { setError(`Os detalhes não podem ultrapassar ${BODY_MAX} caracteres.`); return }
    try {
      await onSave({
        title:   form.title.trim(),
        body:    form.body.trim() || null,
        type:    form.type,
        sector:  form.sector.trim(),
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
            <label className="text-sm font-medium text-foreground" htmlFor="sugg-sector">
              Setor <span className="text-destructive">*</span>
            </label>
            <Select
              id="sugg-sector"
              value={form.sector}
              onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))}
              disabled={isSubmitting || loadingTeams}
            >
              <option value="">
                {loadingTeams ? 'Carregando setores...' : 'Selecione seu setor'}
              </option>
              {teams.map((team) => (
                <option key={team.id} value={team.name}>{team.name}</option>
              ))}
            </Select>
          </div>

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
              maxLength={BODY_MAX}
              className={cn('resize-none', form.body.length > BODY_MAX * 0.9 && 'border-amber-400 focus-visible:ring-amber-400')}
            />
            <p className={cn(
              'text-xs text-right tabular-nums',
              form.body.length >= BODY_MAX ? 'text-destructive font-medium' :
              form.body.length > BODY_MAX * 0.9 ? 'text-amber-500' :
              'text-muted-foreground',
            )}>
              {form.body.length} / {BODY_MAX}
            </p>
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
            disabled={isSubmitting || !form.title.trim() || !form.sector.trim() || form.body.length > BODY_MAX}
          >
            {isSubmitting ? 'Enviando...' : 'Enviar sugestão'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
