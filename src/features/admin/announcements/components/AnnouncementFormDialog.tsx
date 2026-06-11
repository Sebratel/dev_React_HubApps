import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { SEBRATEL_PROFILES } from '@/constants/profiles'
import type { AnnouncementModel } from '@/types/models'
import type { AnnouncementType } from '@/types/enums'
import type { CreateAnnouncementPayload } from '@/services/announcement.service'

interface AnnouncementFormDialogProps {
  open: boolean
  editing: AnnouncementModel | null
  onClose: () => void
  onSave: (payload: CreateAnnouncementPayload, id?: string) => Promise<void>
  isSubmitting: boolean
}

const TYPE_OPTIONS: { value: AnnouncementType; label: string }[] = [
  { value: 'info',    label: 'Informativo' },
  { value: 'warning', label: 'Aviso'       },
  { value: 'urgent',  label: 'Urgente'     },
  { value: 'success', label: 'Concluído'   },
]

const DEFAULT: CreateAnnouncementPayload = {
  title: '',
  body: '',
  type: 'info',
  allowedProfiles: [],
}

export function AnnouncementFormDialog({
  open,
  editing,
  onClose,
  onSave,
  isSubmitting,
}: AnnouncementFormDialogProps) {
  const [form, setForm] = useState<CreateAnnouncementPayload>(DEFAULT)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setError(null)
      setForm(
        editing
          ? {
              title: editing.title,
              body: editing.body ?? '',
              type: editing.type,
              allowedProfiles: editing.allowedProfiles,
            }
          : DEFAULT
      )
    }
  }, [open, editing])

  function toggleProfile(value: string) {
    setForm((f) => ({
      ...f,
      allowedProfiles: f.allowedProfiles?.includes(value)
        ? f.allowedProfiles.filter((p) => p !== value)
        : [...(f.allowedProfiles ?? []), value],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.title.trim()) { setError('O título é obrigatório.'); return }
    try {
      await onSave(form, editing?.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar aviso.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar aviso' : 'Novo aviso'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="anno-title">
              Título <span className="text-destructive">*</span>
            </label>
            <Input
              id="anno-title"
              placeholder="Ex: Manutenção programada esta sexta"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              disabled={isSubmitting}
              maxLength={255}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="anno-body">
              Mensagem
            </label>
            <Textarea
              id="anno-body"
              placeholder="Detalhes adicionais (opcional)"
              value={form.body ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              disabled={isSubmitting}
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="anno-type">
              Tipo
            </label>
            <Select
              id="anno-type"
              value={form.type}
              onChange={(e) =>
                setForm((f) => ({ ...f, type: e.target.value as AnnouncementType }))
              }
              disabled={isSubmitting}
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground">
              Visível para <span className="text-muted-foreground font-normal">(vazio = todos)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {SEBRATEL_PROFILES.map(({ value, label }) => {
                const selected = form.allowedProfiles?.includes(value)
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleProfile(value)}
                    disabled={isSubmitting}
                    className={
                      selected
                        ? 'px-3 py-1 rounded-full text-xs font-semibold bg-primary text-primary-foreground border border-primary'
                        : 'px-3 py-1 rounded-full text-xs font-medium border border-border text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors'
                    }
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2">
              {error}
            </p>
          )}
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            disabled={isSubmitting || !form.title.trim()}
          >
            {isSubmitting ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar aviso'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
