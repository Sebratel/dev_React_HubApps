import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { AccessRequestModel } from '@/types/models'

const MAX_NOTE = 500

interface RejectRequestDialogProps {
  request: AccessRequestModel | null
  open: boolean
  isPending: boolean
  error: string | null
  onConfirm: (reviewNote: string) => void
  onClose: () => void
}

export function RejectRequestDialog({
  request,
  open,
  isPending,
  error,
  onConfirm,
  onClose,
}: RejectRequestDialogProps) {
  const [note, setNote] = useState('')

  function handleClose() {
    setNote('')
    onClose()
  }

  function handleConfirm() {
    onConfirm(note)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rejeitar solicitação</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja rejeitar o acesso de{' '}
            <span className="font-medium text-foreground">
              {request?.userName || request?.userId}
            </span>{' '}
            ao aplicativo <span className="font-medium text-foreground">{request?.appName}</span>?
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
            <p className="text-sm text-destructive font-medium">
              Esta ação é irreversível. A solicitação ficará marcada como rejeitada.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="reject-note" className="text-sm font-medium text-foreground">
              Motivo da rejeição{' '}
              <span className="text-muted-foreground font-normal">(opcional)</span>
            </label>
            <Textarea
              id="reject-note"
              placeholder="Explique o motivo para o usuário..."
              value={note}
              onChange={(e) => {
                if (e.target.value.length <= MAX_NOTE) setNote(e.target.value)
              }}
              rows={3}
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground text-right tabular-nums">
              {note.length}/{MAX_NOTE}
            </p>
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2"
          >
            {error}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isPending}>
            {isPending ? 'Rejeitando...' : 'Rejeitar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
