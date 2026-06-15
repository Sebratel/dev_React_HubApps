import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Loader2, CheckCircle2, Clock3 } from 'lucide-react'
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

const MAX_REASON_LENGTH = 500

interface AccessRequestModalProps {
  app: AppItemModel | null
  open: boolean
  onClose: () => void
}

export function AccessRequestModal({ app, open, onClose }: AccessRequestModalProps) {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const reduced = useReducedMotion()

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
      void queryClient.invalidateQueries({ queryKey: ['access-requests', 'me'] })
      setSubmitSuccess(true)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Erro ao enviar solicitação.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!app) return null

  // Determina qual "estado" o corpo do modal está
  const bodyState = checkingPending
    ? 'loading'
    : submitSuccess
    ? 'success'
    : pendingRequest
    ? 'pending'
    : 'form'

  const enterTransition = { duration: reduced ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }
  const exitTransition = { duration: reduced ? 0 : 0.14, ease: [0.4, 0, 1, 1] }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar acesso</DialogTitle>
          <DialogDescription>
            {app.icon} {app.name}
          </DialogDescription>
        </DialogHeader>

        {/* Corpo animado entre estados */}
        <AnimatePresence mode="wait" initial={false}>
          {bodyState === 'loading' && (
            <motion.div
              key="loading"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={enterTransition}
              className="flex items-center gap-2 py-4 text-sm text-muted-foreground"
            >
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Verificando solicitações...
            </motion.div>
          )}

          {bodyState === 'success' && (
            <motion.div
              key="success"
              initial={reduced ? false : { opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={enterTransition}
              className="flex flex-col items-center gap-3 py-6 text-center"
            >
              <motion.div
                initial={reduced ? false : { scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.22, delay: 0.04, ease: [0.22, 1, 0.36, 1] }}
              >
                <CheckCircle2 className="h-10 w-10 text-green-500" aria-hidden />
              </motion.div>
              <p className="text-sm font-medium">Solicitação enviada com sucesso!</p>
              <p className="text-xs text-muted-foreground">
                Aguarde a aprovação de um administrador.
              </p>
            </motion.div>
          )}

          {bodyState === 'pending' && (
            <motion.div
              key="pending"
              initial={reduced ? false : { opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={enterTransition}
              className="flex flex-col items-center gap-3 py-6 text-center"
            >
              <motion.div
                initial={reduced ? false : { scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2, delay: 0.04, ease: [0.22, 1, 0.36, 1] }}
              >
                <Clock3 className="h-10 w-10 text-amber-500" aria-hidden />
              </motion.div>
              <p className="text-sm font-medium">Solicitação pendente</p>
              <p className="text-xs text-muted-foreground">
                Você já possui uma solicitação em análise para este aplicativo.
              </p>
            </motion.div>
          )}

          {bodyState === 'form' && (
            <motion.div
              key="form"
              initial={reduced ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0 }}
              transition={{ ...enterTransition, exit: exitTransition }}
              className="flex flex-col gap-3"
            >
              <div className="flex flex-col gap-1.5">
                <label htmlFor="access-reason" className="text-sm font-medium">
                  Por que você precisa de acesso?
                </label>
                <Textarea
                  id="access-reason"
                  placeholder="Descreva brevemente o motivo..."
                  value={reason}
                  onChange={(e) => {
                    if (e.target.value.length <= MAX_REASON_LENGTH) {
                      setReason(e.target.value)
                      setReasonError(null)
                    }
                  }}
                  rows={4}
                  disabled={isSubmitting}
                  aria-describedby={reasonError ? 'reason-error' : 'reason-count'}
                />
                <div className="flex items-center justify-between">
                  {reasonError ? (
                    <p id="reason-error" className="text-xs text-destructive" role="alert">
                      {reasonError}
                    </p>
                  ) : (
                    <span />
                  )}
                  <span
                    id="reason-count"
                    className="text-xs text-muted-foreground tabular-nums ml-auto"
                  >
                    {reason.length}/{MAX_REASON_LENGTH}
                  </span>
                </div>
              </div>
              {submitError && (
                <p className="text-xs text-destructive" role="alert">
                  {submitError}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <DialogFooter>
          {submitSuccess || pendingRequest ? (
            <Button onClick={handleClose}>Fechar</Button>
          ) : !checkingPending ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" aria-hidden />}
                {isSubmitting ? 'Enviando...' : 'Enviar solicitação'}
              </Button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
