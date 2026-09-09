import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
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
  /** Pré-seleciona um destinatário (e.g. ao clicar "Parabenizar" no toast de aniversário) */
  initialToUserId?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_CHARS     = 200
const SUCCESS_DELAY = 1400 // ms que a tela de sucesso fica antes de fechar

// ─── Dialog ───────────────────────────────────────────────────────────────────

export function SendKudoDialog({ open, onClose, initialToUserId }: SendKudoDialogProps) {
  const [toUserId,    setToUserId]    = useState(initialToUserId || '')
  const [message,     setMessage]     = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [succeeded,   setSucceeded]   = useState(false)
  const currentUser = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()

  // Sincroniza o destinatário quando o dialog abre com um alvo pré-definido
  useEffect(() => {
    if (open) setToUserId(initialToUserId || '')
  }, [open, initialToUserId])

  const { data: directory = [] } = useQuery({
    queryKey: ['users', 'directory'],
    queryFn:  getDirectory,
    staleTime: 300_000,
    enabled:   open,
  })

  function resetForm() {
    setToUserId('')
    setMessage('')
    setIsAnonymous(false)
  }

  const mutation = useMutation({
    mutationFn: () => sendKudo(toUserId, message.trim(), isAnonymous),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['kudos', 'feed'] })
      // Atualiza stats do usuário (kudosSent) para o checklist de onboarding marcar a tarefa
      void queryClient.invalidateQueries({ queryKey: ['users', 'me', 'stats'] })
      // Mostra a tela de sucesso por SUCCESS_DELAY ms e depois fecha
      setSucceeded(true)
      setTimeout(() => {
        setSucceeded(false)
        resetForm()
        onClose()
      }, SUCCESS_DELAY)
    },
  })

  const recipients = directory.filter((u) => u.id !== currentUser?.id)
  const canSubmit  = !!toUserId && message.trim().length >= 3 && !mutation.isPending

  function handleClose() {
    if (mutation.isPending || succeeded) return
    mutation.reset()
    resetForm()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent>
        <AnimatePresence mode="wait" initial={false}>

          {/* ── Tela de sucesso ─────────────────────────────────────────────── */}
          {succeeded ? (
            <motion.div
              key="success"
              className="flex flex-col items-center justify-center gap-4 py-10"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Círculo com checkmark animado */}
              <div className="relative flex h-20 w-20 items-center justify-center">
                {/* Anel externo pulsante */}
                <motion.div
                  className="absolute inset-0 rounded-full bg-green-100 dark:bg-green-900/30"
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.15, 1] }}
                  transition={{ duration: 0.45, times: [0, 0.6, 1], ease: 'easeOut' }}
                />
                {/* Checkmark */}
                <motion.div
                  className="relative flex h-14 w-14 items-center justify-center rounded-full bg-green-500 shadow-md"
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ duration: 0.35, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Check className="h-7 w-7 text-white" strokeWidth={3} />
                </motion.div>
              </div>

              {/* Texto */}
              <motion.div
                className="text-center"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.2 }}
              >
                <p className="text-base font-semibold text-foreground">Kudo enviado! 🏆</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isAnonymous ? 'Enviado anonimamente.' : 'Seu colega vai adorar saber disso.'}
                </p>
              </motion.div>
            </motion.div>

          ) : (

            /* ── Formulário ──────────────────────────────────────────────────── */
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <DialogHeader>
                <DialogTitle>Enviar Kudo 🏆</DialogTitle>
                <DialogDescription>
                  Reconheça o trabalho incrível de um colega com uma mensagem.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-4 py-2 mt-4">
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

                {/* Toggle anônimo */}
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <div className="relative mt-0.5">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      disabled={mutation.isPending}
                      className="peer sr-only"
                      id="kudo-anonymous"
                    />
                    {/* Track */}
                    <div className="h-5 w-9 rounded-full bg-muted transition-colors peer-checked:bg-primary peer-disabled:opacity-50" />
                    {/* Thumb */}
                    <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-foreground leading-none">Enviar como anônimo</span>
                    <span className="text-xs text-muted-foreground leading-snug">
                      {isAnonymous
                        ? 'Seu nome não aparecerá no feed — só você sabe que enviou.'
                        : 'Seu nome ficará visível para todos no feed de Kudos.'}
                    </span>
                  </div>
                </label>

                {mutation.isError && (
                  <p role="alert" className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                    {mutation.error instanceof Error ? mutation.error.message : 'Erro ao enviar. Tente novamente.'}
                  </p>
                )}
              </div>

              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={handleClose} disabled={mutation.isPending}>
                  Cancelar
                </Button>
                <Button onClick={() => mutation.mutate()} disabled={!canSubmit}>
                  {mutation.isPending ? 'Enviando...' : 'Enviar Kudo 🏆'}
                </Button>
              </DialogFooter>
            </motion.div>
          )}

        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
