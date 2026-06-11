import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { formatRelativeTime } from '@/utils/relative-time'
import type { AccessRequestModel } from '@/types/models'
import { AccessRequestStatusBadge } from './AccessRequestStatusBadge'

interface AccessRequestDetailsDialogProps {
  request: AccessRequestModel | null
  open: boolean
  onClose: () => void
  onApprove?: () => void
  onReject?: () => void
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground break-words">{value}</span>
    </div>
  )
}

export function AccessRequestDetailsDialog({
  request,
  open,
  onClose,
  onApprove,
  onReject,
}: AccessRequestDetailsDialogProps) {
  if (!request) return null

  const isPending = request.status === 'pending'

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalhes da solicitação</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-1">
          <div className="flex items-center gap-2">
            <AccessRequestStatusBadge status={request.status} />
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(request.requestedAt.toISOString())}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Row label="Usuário" value={request.userName || request.userId} />
            <Row label="E-mail" value={request.email} />
            <Row label="Time" value={request.teamName} />
            <Row label="Aplicativo" value={request.appName} />
          </div>

          {request.reason && (
            <div className="rounded-md bg-muted/50 px-3 py-2">
              <p className="text-xs text-muted-foreground mb-1">Motivo</p>
              <p className="text-sm text-foreground">{request.reason}</p>
            </div>
          )}

          {!isPending && (
            <div className="rounded-md border border-border px-3 py-2 flex flex-col gap-1">
              <p className="text-xs text-muted-foreground">Revisado por</p>
              <p className="text-sm font-medium">
                {request.reviewedByName ?? request.reviewedByUserId ?? '—'}
              </p>
              {request.reviewedAt && (
                <p className="text-xs text-muted-foreground">
                  {formatRelativeTime(request.reviewedAt.toISOString())}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          {isPending && onReject && (
            <Button variant="destructive" onClick={onReject}>
              Rejeitar
            </Button>
          )}
          {isPending && onApprove && <Button onClick={onApprove}>Aprovar</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
