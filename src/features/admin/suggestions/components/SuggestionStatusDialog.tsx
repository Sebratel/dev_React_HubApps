import { useEffect, useState } from 'react'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type { SuggestionModel } from '@/services/suggestion.service'
import type { SuggestionStatus } from '@/types/enums'

const STATUS_OPTIONS: { value: SuggestionStatus; label: string }[] = [
  { value: 'pending',   label: 'Aguardando' },
  { value: 'in_review', label: 'Em análise' },
  { value: 'done',      label: 'Concluída'  },
  { value: 'rejected',  label: 'Encerrada'  },
]

const TYPE_LABELS: Record<string, string> = {
  feature:     'Funcionalidade',
  improvement: 'Melhoria',
  bug:         'Bug',
  other:       'Outro',
}

interface SuggestionStatusDialogProps {
  suggestion: SuggestionModel | null
  open: boolean
  isSubmitting: boolean
  onClose: () => void
  onSave: (status: SuggestionStatus, adminNote: string | null) => Promise<void>
}

export function SuggestionStatusDialog({
  suggestion, open, isSubmitting, onClose, onSave,
}: SuggestionStatusDialogProps) {
  const [status, setStatus]       = useState<SuggestionStatus>('pending')
  const [adminNote, setAdminNote] = useState('')
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    if (suggestion && open) {
      setStatus(suggestion.status)
      setAdminNote(suggestion.adminNote ?? '')
      setError(null)
    }
  }, [suggestion, open])

  async function handleSubmit() {
    if (!suggestion) return
    setError(null)
    try {
      await onSave(status, adminNote.trim() || null)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar status.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Atualizar sugestão</DialogTitle>
          {suggestion && (
            <DialogDescription className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="border-stone-300 bg-stone-100 text-stone-700 font-normal">
                {TYPE_LABELS[suggestion.type] ?? suggestion.type}
              </Badge>
              <span className="font-medium text-foreground">{suggestion.title}</span>
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {suggestion && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
              <span className="font-medium">Enviado por:</span> {suggestion.userName}
              {suggestion.appName && (
                <span> · <span className="font-medium">{suggestion.appName}</span></span>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="sugg-status">
              Status
            </label>
            <Select
              id="sugg-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as SuggestionStatus)}
              disabled={isSubmitting}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="sugg-note">
              Resposta / nota <span className="text-muted-foreground font-normal">(opcional)</span>
            </label>
            <Textarea
              id="sugg-note"
              placeholder="Explicação, próximos passos ou motivo do encerramento..."
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              disabled={isSubmitting}
              rows={3}
              className="resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
