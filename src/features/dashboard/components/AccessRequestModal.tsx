import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
import {
  validateReason,
  getPendingRequestForApp,
  createAccessRequest,
} from '@/services/access-request.service'
import { useAuthStore } from '@/stores/auth.store'
import type { AppItemModel } from '@/types/models'

interface AccessRequestModalProps {
  app: AppItemModel | null
  open: boolean
  onClose: () => void
}

export function AccessRequestModal({ app, open, onClose }: AccessRequestModalProps) {
  const user = useAuthStore((s) => s.user)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const userId = user?.id
  const appId = app?.id

  const { data: pendingRequest, isLoading: checkingPending } = useQuery({
    queryKey: ['access-request-pending', userId, appId],
    queryFn: () => {
      if (!userId || !appId) return null
      return getPendingRequestForApp(userId, appId)
    },
    enabled: open && !!userId && !!appId,
    staleTime: 0,
  })

  function resetForm() {
    setReason('')
    setReasonError(null)
    setSubmitError(null)
    setSubmitSuccess(false)
  }

  function handleClose() {
    resetForm()
    onClose()
  }

  async function handleSubmit() {
    if (!user || !app) return
    const err = validateReason(reason)
    if (err) {
      setReasonError(err)
      return
    }
    setReasonError(null)
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      await createAccessRequest(user, app, reason)
      setSubmitSuccess(true)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Erro ao enviar solicitação.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!app) return null

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar acesso</DialogTitle>
          <DialogDescription>
            {app.icon} {app.name}
          </DialogDescription>
        </DialogHeader>

        {checkingPending ? (
          <p className="py-4 text-sm text-muted-foreground">Verificando solicitações...</p>
        ) : submitSuccess ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="text-4xl">✅</span>
            <p className="text-sm font-medium">Solicitação enviada com sucesso!</p>
            <p className="text-xs text-muted-foreground">
              Aguarde a aprovação de um administrador.
            </p>
          </div>
        ) : pendingRequest ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="text-4xl">⏳</span>
            <p className="text-sm font-medium">Solicitação pendente</p>
            <p className="text-xs text-muted-foreground">
              Você já possui uma solicitação em análise para este aplicativo.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="access-reason" className="text-sm font-medium">
                Por que você precisa de acesso?
              </label>
              <Textarea
                id="access-reason"
                placeholder="Descreva brevemente o motivo..."
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value)
                  setReasonError(null)
                }}
                rows={4}
                disabled={isSubmitting}
              />
              {reasonError && <p className="text-xs text-destructive">{reasonError}</p>}
            </div>
            {submitError && <p className="text-xs text-destructive">{submitError}</p>}
          </div>
        )}

        <DialogFooter>
          {submitSuccess || pendingRequest ? (
            <Button onClick={handleClose}>Fechar</Button>
          ) : !checkingPending ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Enviando...' : 'Enviar solicitação'}
              </Button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
