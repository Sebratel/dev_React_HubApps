/**
 * OnboardingChecklist — card no dashboard que guia o usuário pelas features da plataforma.
 *
 * REGRA: TODOS os hooks devem ser chamados antes de qualquer `return` condicional.
 */
import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Circle, ChevronDown, X, Sparkles } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { getMyStats } from '@/services/user.service'
import { getPolls } from '@/services/polls.service'
import { cn } from '@/lib/utils'

// ─── Persistência ─────────────────────────────────────────────────────────────

function getDismissKey(userId: string) { return `hub_checklist_done_${userId}` }
function isDismissed(userId: string): boolean {
  try { return !!localStorage.getItem(getDismissKey(userId)) } catch { return false }
}
function markDismissed(userId: string) {
  try { localStorage.setItem(getDismissKey(userId), '1') } catch { /* storage unavailable */ }
}

// Flag "visitou o Diretório" — gravada pelo DirectoryPage ao montar
export const DIRECTORY_VISITED_KEY = 'hub_directory_visited'
// eslint-disable-next-line react-refresh/only-export-components
export function markDirectoryVisited() {
  try { localStorage.setItem(DIRECTORY_VISITED_KEY, '1') } catch { /* storage unavailable */ }
}
function hasVisitedDirectory(): boolean {
  try { return !!localStorage.getItem(DIRECTORY_VISITED_KEY) } catch { return false }
}

// ─── Linha de tarefa ──────────────────────────────────────────────────────────

interface Task {
  id: string
  emoji: string
  label: string
  tip: string
  done: boolean
  href?: string
  onClick?: () => void
}

function TaskRow({ task }: { task: Task }) {
  const inner = (
    <div className={cn(
      'flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors group/task',
      task.done ? 'opacity-60' : 'hover:bg-muted cursor-pointer'
    )}>
      <span className="shrink-0">
        {task.done
          ? <CheckCircle2 className="h-5 w-5 text-emerald-500" aria-hidden />
          : <Circle className="h-5 w-5 text-muted-foreground/40 group-hover/task:text-primary transition-colors" aria-hidden />
        }
      </span>
      <span className="text-base leading-none select-none shrink-0" aria-hidden>{task.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium leading-tight', task.done ? 'line-through text-muted-foreground' : 'text-foreground')}>
          {task.label}
        </p>
        {!task.done && (
          <p className="text-xs text-muted-foreground leading-tight mt-0.5">{task.tip}</p>
        )}
      </div>
      {!task.done && (
        <ChevronDown className="-rotate-90 h-3.5 w-3.5 text-muted-foreground/50 group-hover/task:text-primary shrink-0 transition-colors" aria-hidden />
      )}
    </div>
  )

  if (task.done)      return inner
  if (task.href)      return <Link to={task.href} className="block no-underline">{inner}</Link>
  if (task.onClick)   return <button type="button" onClick={task.onClick} className="w-full text-left">{inner}</button>
  return inner
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface Props {
  onOpenSendKudo?: () => void
}

export function OnboardingChecklist({ onOpenSendKudo }: Props) {
  // ── Todos os hooks primeiro, sem nenhum return antes deles ─────────────────
  const user = useAuthStore((s) => s.user)

  const [visible,   setVisible]   = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [allDone,   setAllDone]   = useState(false)
  const [dirVisited, setDirVisited] = useState(false)

  // Inicializa após montar (lê localStorage só no cliente)
  useEffect(() => {
    if (!user?.id) return
    if (isDismissed(user.id)) return
    setVisible(true)
    setDirVisited(hasVisitedDirectory())
  }, [user?.id])

  // Sincroniza flag de diretório entre abas
  useEffect(() => {
    const handler = () => setDirVisited(hasVisitedDirectory())
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  const { data: stats } = useQuery({
    queryKey: ['users', 'me', 'stats'],
    queryFn:  getMyStats,
    staleTime: 5 * 60_000,
    enabled:   visible && !!user,
  })

  const { data: polls = [] } = useQuery({
    queryKey: ['polls'],
    queryFn:  getPolls,
    staleTime: 30_000,
    enabled:   visible && !!user,
  })

  const dismiss = useCallback(() => {
    if (!user?.id) return
    markDismissed(user.id)
    setVisible(false)
  }, [user?.id])

  // Calcula tarefas e status (com guard para quando user === null)
  const hasVotedPoll = polls.some((p) => p.myVote !== null)
  const hasSentKudo  = (stats?.kudosSent ?? 0) >= 1

  const tasks: Task[] = user ? [
    {
      id: 'profile', emoji: '👤',
      label: 'Complete seu perfil',
      tip:   'Adicione nome e foto para que seus colegas te reconheçam',
      done:  !!(user.name && user.photoUrl),
      href:  '/perfil',
    },
    {
      id: 'birthday', emoji: '🎂',
      label: 'Adicione sua data de aniversário',
      tip:   'Apareça nas celebrações e receba parabéns no seu dia!',
      done:  !!user.birthDate,
      href:  '/perfil',
    },
    {
      id: 'status', emoji: '✅',
      label: 'Defina seu Status do Momento',
      tip:   'Clique no ícone de status no menu lateral para escolher',
      done:  !!user.status,
    },
    {
      id: 'kudo', emoji: '💌',
      label: 'Envie seu primeiro Kudo',
      tip:   'Reconheça um colega — anônimo se preferir',
      done:  hasSentKudo,
      onClick: onOpenSendKudo,
    },
    {
      id: 'poll', emoji: '🗳️',
      label: 'Vote em uma enquete',
      tip:   'Role a página e participe de uma enquete ativa',
      done:  hasVotedPoll,
    },
    {
      id: 'directory', emoji: '👥',
      label: 'Explore o Diretório de Pessoas',
      tip:   'Conheça sua equipe, veja status e envie parabéns',
      done:  dirVisited,
      href:  '/pessoas',
    },
  ] : []

  const doneCount = tasks.filter((t) => t.done).length
  const total     = tasks.length
  const progress  = total > 0 ? Math.round((doneCount / total) * 100) : 0
  const isAllDone = total > 0 && doneCount === total

  // Auto-dispensa quando tudo estiver concluído (mantém colapsado — só o header aparece)
  // ⚠️ DEVE ficar antes do return condicional
  useEffect(() => {
    if (!visible || !isAllDone || allDone) return
    setAllDone(true)
    setCollapsed(true)   // mantém fechado: só o banner "🎉 Tudo pronto!" fica visível
    const t = setTimeout(dismiss, 3000)
    return () => clearTimeout(t)
  }, [visible, isAllDone, allDone, dismiss])

  // ── Retorno condicional apenas após todos os hooks ─────────────────────────
  if (!user || !visible) return null

  return (
    <AnimatePresence>
      <motion.div
        key="checklist"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: -8 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'rounded-2xl border bg-card overflow-hidden',
          isAllDone
            ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-900/10'
            : 'border-border'
        )}
      >
        {/* ── Header ── */}
        <button
          type="button"
          onClick={() => !isAllDone && setCollapsed((c) => !c)}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-3 text-left',
            !isAllDone && 'hover:bg-muted/40 transition-colors'
          )}
          aria-expanded={!collapsed}
        >
          <div className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg',
            isAllDone ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-primary/10'
          )}>
            {isAllDone
              ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
              : <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
            }
          </div>

          <div className="flex-1 min-w-0">
            <p className={cn(
              'text-sm font-semibold leading-tight',
              isAllDone ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'
            )}>
              {isAllDone ? '🎉 Tudo pronto! Aproveite o Hub.' : 'Primeiros passos'}
            </p>
            {!isAllDone && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {doneCount} de {total} concluídos
              </p>
            )}
          </div>

          {!isAllDone && (
            <div
              className="shrink-0 h-1.5 w-20 rounded-full bg-muted overflow-hidden"
              role="progressbar"
              aria-valuenow={doneCount}
              aria-valuemax={total}
            >
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          )}

          {!isAllDone && (
            <ChevronDown
              className={cn('h-4 w-4 text-muted-foreground transition-transform shrink-0', collapsed && 'rotate-180')}
              aria-hidden
            />
          )}

          {!isAllDone && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Dispensar checklist"
              onClick={(e) => { e.stopPropagation(); dismiss() }}
              onKeyDown={(e) => e.key === 'Enter' && (e.stopPropagation(), dismiss())}
              className="shrink-0 h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
        </button>

        {/* ── Body ── */}
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              key="body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              {isAllDone ? (
                <div className="flex flex-col items-center gap-3 px-5 pb-6 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500" aria-hidden />
                  </div>
                  <p className="text-sm text-muted-foreground leading-snug max-w-xs">
                    Você descobriu todas as funcionalidades do Hub. Continue explorando e conectando-se com a equipe! 🚀
                  </p>
                </div>
              ) : (
                <div className="px-3 pb-3 flex flex-col gap-0.5 border-t border-border pt-2">
                  {tasks.map((task) => (
                    <TaskRow key={task.id} task={task} />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  )
}
