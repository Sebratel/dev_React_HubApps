import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { AppItemModel } from '@/types/models'

interface AppDeactivateDialogProps {
  app: AppItemModel | null
  open: boolean
  isPending: boolean
  error: string | null
  onConfirm: () => void
  onClose: () => void
}

export function AppDeactivateDialog({
  app,
  open,
  isPending,
  error,
  onConfirm,
  onClose,
}: AppDeactivateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Desativar aplicativo</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja desativar{' '}
            <span className="font-medium text-foreground">{app?.name}</span>? O aplicativo ficará
            inacessível para todos os usuários.
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
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Desativando...' : 'Desativar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
