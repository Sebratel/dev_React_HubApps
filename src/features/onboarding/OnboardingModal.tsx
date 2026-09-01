import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Cake, ChevronRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { updateMyBirthDate } from '@/services/user.service'
import { useAuthStore } from '@/stores/auth.store'

// Chave de sessão — se o usuário clicar "depois", não mostra de novo nesta aba.
// Na próxima sessão (novo login) o modal volta até ele preencher.
const SESSION_KEY = 'hub_onboarding_birth_skipped'

function hasSkippedThisSession(): boolean {
  try { return !!sessionStorage.getItem(SESSION_KEY) } catch { return false }
}
function markSkippedThisSession() {
  try { sessionStorage.setItem(SESSION_KEY, '1') } catch {}
}

// ─── Hook: decide se mostra o modal ──────────────────────────────────────────

export function useOnboardingNeeded(): boolean {
  const birthDate = useAuthStore((s) => s.user?.birthDate)
  // Mostra se: (1) birthDate nunca foi preenchida E (2) não foi descartada nesta sessão
  if (birthDate) return false
  if (typeof birthDate === 'undefined') return false // ainda carregando
  return !hasSkippedThisSession()
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface OnboardingModalProps {
  open: boolean
  onClose: () => void
}

export function OnboardingModal({ open, onClose }: OnboardingModalProps) {
  const [birthDate, setBirthDate] = useState('')
  const setUser = useAuthStore((s) => s.setUser)

  const mutation = useMutation({
    mutationFn: () => updateMyBirthDate(birthDate || null),
    onSuccess: (updatedUser) => {
      setUser(updatedUser)
      onClose()
    },
  })

  function handleSkip() {
    markSkippedThisSession()
    onClose()
  }

  const canSave = birthDate.length === 10 && !mutation.isPending

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            aria-hidden
          />

          {/* Panel */}
          <motion.div
            key="panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="onboarding-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="relative w-full max-w-sm rounded-3xl border border-border bg-card shadow-xl overflow-hidden">

              {/* Decorative top strip */}
              <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-primary to-amber-500" aria-hidden />

              {/* Close (skip) button */}
              <button
                onClick={handleSkip}
                className="absolute right-4 top-5 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Preencher depois"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex flex-col items-center gap-5 px-8 py-8">
                {/* Icon */}
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/30 shadow-sm">
                  <Cake className="h-8 w-8 text-amber-600 dark:text-amber-400" aria-hidden />
                </div>

                {/* Heading */}
                <div className="text-center">
                  <h2
                    id="onboarding-title"
                    className="text-xl font-bold text-foreground"
                  >
                    Bem-vindo ao Hub! 🎉
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground leading-snug">
                    Adicione sua data de nascimento para aparecer nas{' '}
                    <span className="font-medium text-foreground">Celebrações</span>{' '}
                    e deixar seus colegas te parabenizarem no dia certo.
                  </p>
                </div>

                {/* Input */}
                <div className="w-full flex flex-col gap-1.5">
                  <label htmlFor="onboarding-birth" className="text-sm font-medium text-foreground">
                    Sua data de nascimento
                  </label>
                  <input
                    id="onboarding-birth"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
                    disabled={mutation.isPending}
                    className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    O ano não é exibido — só o dia e mês aparecem para os colegas.
                  </p>
                </div>

                {mutation.isError && (
                  <p role="alert" className="w-full text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-2.5 text-center">
                    {mutation.error instanceof Error ? mutation.error.message : 'Erro ao salvar. Tente novamente.'}
                  </p>
                )}

                {/* Actions */}
                <div className="flex w-full flex-col gap-2">
                  <Button
                    className="w-full gap-2"
                    onClick={() => mutation.mutate()}
                    disabled={!canSave}
                  >
                    {mutation.isPending ? 'Salvando...' : 'Salvar e continuar'}
                    {!mutation.isPending && <ChevronRight className="h-4 w-4" aria-hidden />}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground text-sm"
                    onClick={handleSkip}
                    disabled={mutation.isPending}
                  >
                    Preencher depois
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
