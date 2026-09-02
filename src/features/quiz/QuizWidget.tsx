import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Trophy, Play, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { UserAvatar } from '@/components/UserAvatar'
import { useAuthStore } from '@/stores/auth.store'
import { getTodayQuiz, getQuizRanking } from '@/services/quiz.service'
import { cn } from '@/lib/utils'

const MEDAL = ['🥇', '🥈', '🥉']

export function QuizWidget() {
  const navigate = useNavigate()
  const user     = useAuthStore((s) => s.user)

  const { data: today, isLoading: loadingToday } = useQuery({
    queryKey:  ['quiz', 'today'],
    queryFn:   getTodayQuiz,
    enabled:   !!user,
    staleTime: 60_000,
  })

  const { data: ranking, isLoading: loadingRanking } = useQuery({
    queryKey:  ['quiz', 'ranking'],
    queryFn:   getQuizRanking,
    enabled:   !!user,
    staleTime: 30_000,
  })

  const played = today?.status === 'played'
  // Widget mostra top 3 do ranking MENSAL
  const top3   = ranking?.monthly.slice(0, 3) ?? []

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-base">🧠</span>
          <span className="text-sm font-semibold text-foreground">Quiz da Semana</span>
          {played && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="h-3 w-3" />
              Jogado
            </span>
          )}
        </div>
        {ranking?.weekScore != null && (
          <span className="text-xs font-semibold text-violet-600 dark:text-violet-400 tabular-nums">
            {ranking.weekScore} pts esta semana
          </span>
        )}
      </div>

      {/* Ranking mensal */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-2">
        {(loadingToday || loadingRanking) ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2.5 py-0.5">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-7 w-7 rounded-full shrink-0" />
              <Skeleton className="h-3 flex-1 rounded" />
              <Skeleton className="h-3 w-12 rounded" />
            </div>
          ))
        ) : top3.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Seja o primeiro a jogar esta semana!
          </p>
        ) : (
          <>
            {top3.map((entry, i) => (
              <motion.div
                key={entry.userId}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center gap-2.5"
              >
                <span className="text-sm w-4 text-center shrink-0">{MEDAL[i]}</span>
                <UserAvatar
                  name={entry.name}
                  photoUrl={entry.photoUrl}
                  size="sm"
                  className="shrink-0 h-7 w-7"
                />
                <span className={cn(
                  'text-xs flex-1 truncate',
                  entry.userId === user?.id && 'font-semibold'
                )}>
                  {entry.userId === user?.id ? 'Você' : entry.name}
                </span>
                <span className="text-xs font-semibold text-muted-foreground tabular-nums shrink-0">
                  {entry.totalScore.toLocaleString('pt-BR')} pts
                </span>
              </motion.div>
            ))}

            {/* Posição do usuário se não está no top 3 */}
            {ranking && ranking.myPosition && ranking.myPosition > 3 && (
              <div className="flex items-center gap-2.5 pt-2 mt-2 border-t border-border/60">
                <span className="text-xs text-muted-foreground w-4 text-center shrink-0">
                  {ranking.myPosition}°
                </span>
                <UserAvatar
                  name={user?.name ?? ''}
                  photoUrl={user?.photoUrl ?? null}
                  size="sm"
                  className="shrink-0 h-7 w-7"
                />
                <span className="text-xs font-semibold text-foreground flex-1 truncate">Você</span>
                <span className="text-xs font-semibold text-muted-foreground tabular-nums shrink-0">
                  {ranking.myMonthlyScore.toLocaleString('pt-BR')} pts
                </span>
              </div>
            )}

            {/* Info mês */}
            <p className="text-[11px] text-muted-foreground/70 text-center pt-1">
              Ranking mensal · reinicia todo mês
            </p>
          </>
        )}
      </div>

      {/* CTA */}
      <div className="px-4 pb-4 pt-2 shrink-0 border-t border-border/60">
        <Button
          className={cn(
            'w-full gap-2 text-sm',
            !played && 'bg-violet-600 hover:bg-violet-700 text-white border-transparent'
          )}
          variant={played ? 'outline' : 'default'}
          onClick={() => navigate('/quiz')}
        >
          {played ? (
            <>
              <Trophy className="h-4 w-4" />
              Ver ranking completo
            </>
          ) : (
            <>
              <Play className="h-4 w-4 fill-current" />
              Jogar agora
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
