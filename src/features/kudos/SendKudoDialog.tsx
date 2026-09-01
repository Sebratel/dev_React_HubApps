import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { sendKudo, getDirectory } from '@/services/kudos.service'
import { useAuthStore } from '@/stores/auth.store'

// ─── Props ────────────────────────────────────────────────────────────────────

interface SendKudoDialogProps {
  open: boolean
  onClose: () => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_CHARS = 200

// ─── Dialog ───────────────────────────────────────────────────────────────────

export function SendKudoDialog({ open, onClose }: SendKudoDialogProps) {
  const [toUserId, setToUserId] = useState('')
  const [message,  setMessage]  = useState('')
  const currentUser = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()

  const { data: directory = [] } = useQuery({
    queryKey: ['users', 'directory'],
    queryFn:  getDirectory,
    staleTime: 300_000,
    enabled:   open,
  })

  const mutation = useMutation({
    mutationFn: () => sendKudo(toUserId, message.trim()),
    onSuccess:  () => {
      void queryClient.invalidateQueries({ queryKey: ['kudos', 'feed'] })
      handleClose()
    },
  })

  const recipients = directory.filter((u) => u.id !== currentUser?.id)
  const canSubmit  = !!toUserId && message.trim().length >= 3 && !mutation.isPending

  function handleClose() {
    if (mutation.isPending) return
    mutation.reset()
    setToUserId('')
    setMessage('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar Kudo 🏆</DialogTitle>
          <DialogDescription>
            Reconheça o trabalho incrível de um colega com uma mensagem.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Destinatário */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="kudo-to" className="text-sm font-medium">Para</label>
            <Select
              id="kudo-to"
              value={toUserId}
              onChange={(e) => setToUserId(e.target.value)}
              disabled={mutation.isPending}
            >
              <option value="">— Selecione um colega —</option>
              {recipients.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </Select>
          </div>

          {/* Mensagem */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="kudo-message" className="text-sm font-medium">Mensagem</label>
              <span className="text-xs text-muted-foreground">
                {message.length}/{MAX_CHARS}
              </span>
            </div>
            <textarea
              id="kudo-message"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX_CHARS))}
              placeholder="Ex: Incrível como você resolveu aquele problema hoje. Muito obrigado!"
              rows={3}
              disabled={mutation.isPending}
              className="flex min-h-[80px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {mutation.isError && (
            <p role="alert" className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              {mutation.error instanceof Error ? mutation.error.message : 'Erro ao enviar. Tente novamente.'}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!canSubmit}>
            {mutation.isPending ? 'Enviando...' : 'Enviar Kudo 🏆'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
