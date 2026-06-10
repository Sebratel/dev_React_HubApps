import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AuditActionBadge } from './AuditActionBadge'
import type { AuditLogModel } from '@/types/models'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTimeFull(date: Date): string {
  return date.toLocaleString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

// Renders details as pretty JSON if parseable, plain text otherwise
function DetailsContent({ details }: { details: string }) {
  if (!details) {
    return <span className="text-sm text-muted-foreground">—</span>
  }
  try {
    const parsed = JSON.parse(details) as unknown
    return (
      <pre className="text-xs font-mono bg-muted/50 rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all">
        {JSON.stringify(parsed, null, 2)}
      </pre>
    )
  } catch {
    return <span className="text-sm break-words">{details}</span>
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface AuditLogDetailsDialogProps {
  log: AuditLogModel | null
  open: boolean
  onClose: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AuditLogDetailsDialog({
  log,
  open,
  onClose,
}: AuditLogDetailsDialogProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopyId() {
    if (!log) return
    try {
      await navigator.clipboard.writeText(log.id)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard unavailable (non-HTTPS or denied)
    }
  }

  if (!log) return null

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalhes do evento</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-1">
          {/* Event ID + copy button */}
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">ID do evento</p>
              <p className="text-xs font-mono text-foreground truncate">{log.id}</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 shrink-0"
              aria-label="Copiar ID"
              onClick={() => void handleCopyId()}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>

          {/* Action badge */}
          <div>
            <AuditActionBadge action={log.action} />
          </div>

          {/* User info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Usuário</p>
              <p className="text-sm font-medium">{log.userName || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">User ID</p>
              <p className="text-xs font-mono text-muted-foreground break-all">
                {log.userId}
              </p>
            </div>
          </div>

          {/* Timestamp */}
          <div>
            <p className="text-xs text-muted-foreground">Data e hora</p>
            <p className="text-sm">{formatDateTimeFull(log.timestamp)}</p>
          </div>

          {/* Details */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Detalhes</p>
            <DetailsContent details={log.details} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
