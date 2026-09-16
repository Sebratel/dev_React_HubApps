import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { MvpWidget } from '@/features/dashboard/components/MvpWidget'
import { OnlineNowWidget } from '@/features/dashboard/components/OnlineNowWidget'
import { KudosWidget } from '@/features/kudos/KudosWidget'
import { CelebrationsWidget } from '@/features/celebrations/CelebrationsWidget'
import { PollsWidget } from '@/features/polls/PollsWidget'
import { BoardWidget } from '@/features/board/BoardWidget'
import { QuizWidget } from '@/features/quiz/QuizWidget'
import { cn } from '@/lib/utils'
import { getBoardPosts } from '@/services/board-posts.service'

const LAST_SEEN_KEY = 'sebratel:social:lastSeen'

function getLastSeen(): number {
  try { return Number(localStorage.getItem(LAST_SEEN_KEY) ?? 0) } catch { return 0 }
}
function saveLastSeen() {
  try { localStorage.setItem(LAST_SEEN_KEY, String(Date.now())) } catch { /* noop — localStorage pode estar bloqueado */ }
}

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
  const [lastSeen, setLastSeen]   = useState<number>(getLastSeen)

  const { data: boardPosts } = useQuery({
    queryKey: ['board'],
    queryFn: getBoardPosts,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const unreadCount = useMemo(() => {
    if (!boardPosts) return 0
    return boardPosts.filter(p => new Date(p.createdAt).getTime() > lastSeen).length
  }, [boardPosts, lastSeen])

  function handleTabClick(tabId: SocialTab) {
    setActiveTab(tabId)
    // Marca o mural como visto apenas quando o usuário acessa a aba
    if (tabId === 'mural') {
      saveLastSeen()
      setLastSeen(Date.now())
    }
  }

  // Fecha ao clicar fora — mas NÃO fecha se o clique foi dentro de um
  // diálogo/modal (portais Radix renderizam fora do panelRef no document.body)
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      const target = e.target as Element
      // Se o clique foi dentro de qualquer dialog/modal aberto, ignora
      if (target.closest('[role="dialog"]')) return
      if (panelRef.current && !panelRef.current.contains(target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Fecha no Escape — mas NÃO fecha se um dialog/modal está aberto
  // (o Radix já trata o Escape do próprio modal e não deve fechar o painel junto)
  useEffect(() => {
    if (!open) return
    function handler(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (document.querySelector('[role="dialog"]')) return
      setOpen(false)
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
            style={{ transformOrigin: 'bottom right', height: 520, maxHeight: 'calc(100vh - 120px)' }}
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
                  onClick={() => handleTabClick(tab.id)}
                  className={cn(
                    'relative flex shrink-0 flex-col items-center gap-1 rounded-t-lg border-b-2 px-3 py-2 pb-2.5 text-[11px] whitespace-nowrap transition-colors',
                    activeTab === tab.id
                      ? 'border-primary font-semibold text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  <span className="relative text-base leading-none">
                    {tab.emoji}
                    {tab.id === 'mural' && unreadCount > 0 && (
                      <span className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-red-500 ring-1 ring-background" />
                    )}
                  </span>
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
      <div className="relative inline-flex">
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

        {/* Badge de canto — visível apenas quando fechado e há posts novos */}
        <AnimatePresence>
          {!open && unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 28 }}
              className="pointer-events-none absolute -right-1.5 -top-1.5 flex min-w-[18px] items-center justify-center rounded-full border-2 border-background bg-red-500 px-1 text-[10px] font-bold leading-none text-white"
              style={{ height: 18 }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

    </div>
  )
}
