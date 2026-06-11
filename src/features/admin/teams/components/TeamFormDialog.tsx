import { useEffect, useState } from 'react'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { TeamModel, TeamPayload } from '@/services/team.service'

interface TeamFormDialogProps {
  open: boolean
  editing: TeamModel | null
  onClose: () => void
  onSave: (payload: TeamPayload, id?: string) => Promise<void>
  isSubmitting: boolean
}

const DEFAULT: TeamPayload = { name: '', description: '' }

export function TeamFormDialog({
  open, editing, onClose, onSave, isSubmitting,
}: TeamFormDialogProps) {
  const [form, setForm]   = useState<TeamPayload>(DEFAULT)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setError(null)
      setForm(editing ? { name: editing.name, description: editing.description ?? '' } : DEFAULT)
    }
  }, [open, editing])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.name.trim()) { setError('O nome é obrigatório.'); return }
    try {
      await onSave({ name: form.name.trim(), description: form.description?.trim() || null }, editing?.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar time.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar time' : 'Novo time'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="team-name">
              Nome <span className="text-destructive">*</span>
            </label>
            <Input
              id="team-name"
              placeholder="Ex: Infraestrutura"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              disabled={isSubmitting}
              maxLength={100}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="team-desc">
              Descrição
            </label>
            <Textarea
              id="team-desc"
              placeholder="Descrição do time (opcional)"
              value={form.description ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
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
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button onClick={handleSubmit as unknown as React.MouseEventHandler} disabled={isSubmitting || !form.name.trim()}>
            {isSubmitting ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar time'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
