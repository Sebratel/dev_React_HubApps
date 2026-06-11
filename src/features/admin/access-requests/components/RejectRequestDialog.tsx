import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { AccessRequestModel } from '@/types/models'

interface RejectRequestDialogProps {
  request: AccessRequestModel | null
  open: boolean
  isPending: boolean
  error: string | null
  onConfirm: () => void
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
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
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

        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
          <p className="text-sm text-destructive font-medium">
            Esta ação é irreversível. A solicitação ficará marcada como rejeitada.
          </p>
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
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Rejeitando...' : 'Rejeitar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
