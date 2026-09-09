import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Heart, Loader2 } from 'lucide-react'
import { UserAvatar } from '@/components/UserAvatar'
import { getBirthdayWishes, sendBirthdayWish } from '@/services/birthday-wishes.service'
import type { BirthdayCelebrant } from '@/services/birthday-wishes.service'
import { useAuthStore } from '@/stores/auth.store'
import { cn } from '@/lib/utils'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  celebrant: Pick<BirthdayCelebrant, 'id' | 'name' | 'photoUrl'>
  onClose: () => void
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function BirthdayWishesModal({ celebrant, onClose }: Props) {
  const user        = useAuthStore((s) => s.user)
  const qc          = useQueryClient()
  const [msg, setMsg] = useState('')
  const [sent, setSent] = useState(false)

  const { data: allCelebrants = [], isLoading } = useQuery({
    queryKey: ['birthday-wishes'],
    queryFn:  getBirthdayWishes,
    staleTime: 60_000,
  })

  const celebrantData = allCelebrants.find((c) => c.id === celebrant.id)
  const wishes        = celebrantData?.wishes ?? []

  // Verifica se o usuário logado já enviou parabéns hoje
  const alreadySent = wishes.some((w) => w.from.id === user?.id)

  const mutation = useMutation({
    mutationFn: () => sendBirthdayWish(celebrant.id, msg.trim()),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['birthday-wishes'] })
      setSent(true)
      setMsg('')
      setTimeout(() => setSent(false), 3000)
    },
  })

  const handleSend = () => {
    if (!msg.trim() || mutation.isPending || alreadySent) return
    mutation.mutate()
  }

  const firstName = celebrant.name.split(' ')[0]

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Mural de parabéns de ${firstName}`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="relative z-10 w-full max-w-md mx-4 mb-4 sm:mb-0 bg-card rounded-2xl border border-border shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <div className="relative shrink-0">
            <UserAvatar name={celebrant.name} photoUrl={celebrant.photoUrl} size="md" />
            <span className="absolute -top-1 -right-1 text-base leading-none" aria-hidden>🎂</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-foreground text-sm leading-tight">Mural de Parabéns</h2>
            <p className="text-xs text-muted-foreground truncate">Feliz aniversário, {firstName}! 🎉</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Wishes list */}
        <div className="flex-1 overflow-y-auto min-h-[160px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
            </div>
          ) : wishes.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center px-5">
              <span className="text-3xl" aria-hidden>💌</span>
              <p className="text-sm font-medium text-foreground">Seja o primeiro a enviar!</p>
              <p className="text-xs text-muted-foreground">Nenhum parabéns ainda — surpreenda {firstName} 🎉</p>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {wishes.map((w) => (
                <li key={w.id} className="px-5 py-3 flex gap-3 items-start">
                  <UserAvatar name={w.from.name} photoUrl={w.from.photoUrl} size="sm" className="shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground leading-tight">
                      {w.from.name.split(' ')[0]}
                    </p>
                    <p className="text-sm text-foreground/80 leading-snug mt-0.5">{w.message}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Input area */}
        <div className="border-t border-border px-4 py-3">
          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center gap-2 py-2 text-emerald-600 dark:text-emerald-400 text-sm font-medium"
              >
                <Heart className="h-4 w-4 fill-current" />
                Parabéns enviados! 🎉
              </motion.div>
            ) : alreadySent ? (
              <motion.p
                key="already"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-xs text-muted-foreground py-2"
              >
                Você já enviou seus parabéns para {firstName} hoje 💛
              </motion.p>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
                <input
                  type="text"
                  value={msg}
                  onChange={(e) => setMsg(e.target.value.slice(0, 300))}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={`Escreva uma mensagem para ${firstName}…`}
                  className={cn(
                    'flex-1 min-w-0 rounded-xl bg-muted border border-border px-3 py-2 text-sm',
                    'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30',
                    'transition-colors'
                  )}
                  maxLength={300}
                  aria-label="Mensagem de parabéns"
                />
                <button
                  onClick={handleSend}
                  disabled={!msg.trim() || mutation.isPending}
                  className={cn(
                    'shrink-0 h-9 w-9 rounded-xl flex items-center justify-center transition-colors',
                    'bg-primary text-primary-foreground',
                    'hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed'
                  )}
                  aria-label="Enviar parabéns"
                >
                  {mutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          {mutation.isError && (
            <p className="text-xs text-red-500 mt-1 text-center">
              {(mutation.error as Error)?.message || 'Erro ao enviar parabéns'}
            </p>
          )}
        </div>
      </motion.div>
    </div>
  )
}
