import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { MvpWidget } from '@/features/dashboard/components/MvpWidget'
import { OnlineNowWidget } from '@/features/dashboard/components/OnlineNowWidget'
import { KudosWidget } from '@/features/kudos/KudosWidget'
import { CelebrationsWidget } from '@/features/celebrations/CelebrationsWidget'
import { PollsWidget } from '@/features/polls/PollsWidget'
import { BoardWidget } from '@/features/board/BoardWidget'
import { QuizWidget } from '@/features/quiz/QuizWidget'
import { cn } from '@/lib/utils'

type SocialTab = 'mvp' | 'online' | 'kudos' | 'celebr' | 'poll' | 'mural' | 'quiz'

const TABS: { id: SocialTab; emoji: string; label: string }[] = [
  { id: 'mvp',    emoji: '🏆', label: 'MVP'          },
  { id: 'online', emoji: '🟢', label: 'Online'       },
  { id: 'kudos',  emoji: '💌', label: 'Kudos'        },
  { id: 'celebr', emoji: '🎂', label: 'Aniversários' },
  { id: 'poll',   emoji: '🗳️',  label: 'Enquetes'    },
  { id: 'mural',  emoji: '📋', label: 'Mural'        },
  { id: 'quiz',   emoji: '🧠', label: 'Quiz'         },
]

export function SocialPanel() {
  const [open, setOpen]           = useState(false)
  const [activeTab, setActiveTab] = useState<SocialTab>('mvp')
  const panelRef                  = useRef<HTMLDivElement>(null)

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Fecha no Escape
  useEffect(() => {
    if (!open) return
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  return (
    <div ref={panelRef} className="fixed bottom-6 right-16 z-40 flex flex-col items-end gap-3">

      {/* ── Painel popup ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 16 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="flex w-[440px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            style={{ transformOrigin: 'bottom right', maxHeight: 'calc(100vh - 120px)' }}
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-lg leading-none" aria-hidden>💬</span>
                <span className="text-sm font-semibold text-foreground">Hub Social</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Fechar painel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs */}
            <div
              className="flex shrink-0 gap-0.5 overflow-x-auto border-b border-border px-3 pt-2 scrollbar-none"
              role="tablist"
              aria-label="Áreas sociais"
            >
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex shrink-0 flex-col items-center gap-1 rounded-t-lg border-b-2 px-3 py-2 pb-2.5 text-[11px] whitespace-nowrap transition-colors',
                    activeTab === tab.id
                      ? 'border-primary font-semibold text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  <span className="text-base leading-none">{tab.emoji}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Conteúdo */}
            <div className="flex-1 overflow-y-auto p-3">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                >
                  {activeTab === 'mvp'    && <MvpWidget />}
                  {activeTab === 'online' && <OnlineNowWidget />}
                  {activeTab === 'kudos'  && <KudosWidget />}
                  {activeTab === 'celebr' && <CelebrationsWidget />}
                  {activeTab === 'poll'   && <PollsWidget />}
                  {activeTab === 'mural'  && <BoardWidget />}
                  {activeTab === 'quiz'   && <QuizWidget />}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Pill flutuante ────────────────────────────────────────────────────── */}
      <motion.button
        onClick={() => setOpen((o) => !o)}
        whileHover={{ scale: 1.04, y: -1 }}
        whileTap={{ scale: 0.96 }}
        className="flex items-center gap-2 rounded-full px-4 py-2.5 text-primary-foreground"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--primary) / 0.95) 0%, hsl(var(--primary)) 100%)',
          boxShadow: '0 4px 20px hsl(var(--primary) / 0.45), 0 1px 4px hsl(var(--primary) / 0.3), inset 0 1px 0 rgba(255,255,255,0.18)',
        }}
        aria-label={open ? 'Fechar Hub Social' : 'Abrir Hub Social'}
        aria-expanded={open}
      >
        {/* Ícone com fundo semi-translúcido */}
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm leading-none">
          <AnimatePresence mode="wait" initial={false}>
            {open ? (
              <motion.span
                key="close-icon"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0,   opacity: 1 }}
                exit={{ rotate: 90,    opacity: 0 }}
                transition={{ duration: 0.16 }}
                className="flex items-center"
              >
                <X className="h-3.5 w-3.5" />
              </motion.span>
            ) : (
              <motion.span
                key="open-icon"
                initial={{ rotate: 90,  opacity: 0 }}
                animate={{ rotate: 0,   opacity: 1 }}
                exit={{ rotate: -90,   opacity: 0 }}
                transition={{ duration: 0.16 }}
              >
                💬
              </motion.span>
            )}
          </AnimatePresence>
        </span>

        <span className="text-sm font-semibold leading-none tracking-tight">
          {open ? 'Fechar' : 'Hub Social'}
        </span>
      </motion.button>

    </div>
  )
}
