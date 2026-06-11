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

interface ApproveRequestDialogProps {
  request: AccessRequestModel | null
  open: boolean
  isPending: boolean
  error: string | null
  onConfirm: () => void
  onClose: () => void
}

export function ApproveRequestDialog({
  request,
  open,
  isPending,
  error,
  onConfirm,
  onClose,
}: ApproveRequestDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aprovar solicitação</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja aprovar o acesso de{' '}
            <span className="font-medium text-foreground">
              {request?.userName || request?.userId}
            </span>{' '}
            ao aplicativo <span className="font-medium text-foreground">{request?.appName}</span>?
          </DialogDescription>
        </DialogHeader>

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
          <Button onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Aprovando...' : 'Aprovar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
