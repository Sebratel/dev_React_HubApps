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

interface AppReactivateDialogProps {
  app: AppItemModel | null
  open: boolean
  isPending: boolean
  error: string | null
  onConfirm: () => void
  onClose: () => void
}

export function AppReactivateDialog({
  app,
  open,
  isPending,
  error,
  onConfirm,
  onClose,
}: AppReactivateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reativar aplicativo</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja reativar{' '}
            <span className="font-medium text-foreground">{app?.name}</span>? O aplicativo voltará a
            aparecer para os usuários com permissão de acesso.
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
            {isPending ? 'Reativando...' : 'Reativar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
