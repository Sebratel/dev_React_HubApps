import { Trash2 } from 'lucide-react'
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

interface AppDeleteDialogProps {
  app: AppItemModel | null
  open: boolean
  isPending: boolean
  error: string | null
  onConfirm: () => void
  onClose: () => void
}

export function AppDeleteDialog({
  app,
  open,
  isPending,
  error,
  onConfirm,
  onClose,
}: AppDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-destructive" aria-hidden />
            Excluir aplicativo
          </DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir permanentemente{' '}
            <span className="font-medium text-foreground">{app?.name}</span>? Esta ação não pode
            ser desfeita e removerá o aplicativo para todos os usuários.
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
            {isPending ? 'Excluindo...' : 'Excluir permanentemente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
