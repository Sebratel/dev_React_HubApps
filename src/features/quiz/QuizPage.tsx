import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, XCircle, RotateCcw, Clock, CalendarDays, Info, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { UserAvatar } from '@/components/UserAvatar'
import { useAuthStore } from '@/stores/auth.store'
import { getTodayQuiz, submitQuiz, getQuizRanking } from '@/services/quiz.service'
import type { QuizQuestion, QuizSubmitAnswer, QuizAnswerResult, QuizRanking, UserModel } from '@/types/models'
import { cn } from '@/lib/utils'

// ── Constantes ────────────────────────────────────────────────────────────────

const TIME_LIMIT_MS  = 15_000
const FEEDBACK_MS    = 1_600
const TOTAL_QUESTIONS = 5
const OPTION_KEYS    = ['a', 'b', 'c', 'd'] as const
const OPTION_LABELS  = ['A', 'B', 'C', 'D']
const MEDAL          = ['🥇', '🥈', '🥉']

type Phase = 'loading' | 'error' | 'intro' | 'playing' | 'result'

// ── Barra de timer animada ─────────────────────────────────────────────────────

function TimerBar({ timeLeft }: { timeLeft: number }) {
  const pct = (timeLeft / TIME_LIMIT_MS) * 100
  const color =
    pct > 60 ? 'bg-emerald-500' :
    pct > 30 ? 'bg-amber-400' :
               'bg-rose-500'

  return (
    <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
      <motion.div
        className={cn('h-full rounded-full transition-colors duration-300', color)}
        style={{ width: `${pct}%` }}
        layout
      />
    </div>
  )
}

// ── Tela de intro ─────────────────────────────────────────────────────────────

function IntroScreen({
  onStart,
  ranking,
  user,
}: {
  onStart:  () => void
  ranking?: QuizRanking
  user?:    UserModel | null
}) {
  // Ranking mensal — mostra o top 3 do mês na intro
  const top3Monthly = ranking?.monthly.slice(0, 3) ?? []
  const myMonthly   = ranking?.monthly.find(e => e.userId === user?.id)
  const weeksPlayed = myMonthly?.weeksPlayed ?? 0
  // Estima quantas semanas há no mês (aprox. 4–5)
  const WEEKS_IN_MONTH = 5
  const monthPct = Math.min(100, Math.round((weeksPlayed / WEEKS_IN_MONTH) * 100))

  return (
    <motion.div
      key="intro"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-3 w-full"
    >
      {/* Card principal */}
      <div className="rounded-2xl border border-border bg-card p-5">
        {/* Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <span className="text-4xl leading-none">🧠</span>
          <div>
            <h2 className="text-lg font-semibold text-foreground leading-tight">Quiz da Semana</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Ranking mensal · uma tentativa por semana</p>
          </div>
        </div>

        {/* Progresso mensal (só exibe se já jogou ao menos uma semana) */}
        {weeksPlayed > 0 && (
          <div className="mb-5">
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>Suas semanas este mês</span>
              <span>{weeksPlayed} semana{weeksPlayed !== 1 ? 's' : ''} jogada{weeksPlayed !== 1 ? 's' : ''}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
              <div
                className="h-full rounded-full bg-violet-500 transition-all duration-500"
                style={{ width: `${monthPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {([['5', 'perguntas'], ['15s', 'por questão'], ['1000', 'pts/semana']] as const).map(([n, l]) => (
            <div key={l} className="rounded-xl bg-muted/40 px-2 py-3 text-center border border-border/60">
              <span className="block text-lg font-semibold text-foreground leading-tight">{n}</span>
              <span className="block text-[11px] text-muted-foreground mt-0.5">{l}</span>
            </div>
          ))}
        </div>

        <Button
          className="w-full bg-violet-600 hover:bg-violet-700 text-white border-transparent"
          onClick={onStart}
        >
          Começar
        </Button>
      </div>

      {/* Ranking mensal preview */}
      {top3Monthly.length > 0 && (
        <div className="rounded-2xl border border-border bg-card px-4 py-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Ranking mensal
          </p>
          <div className="flex flex-col gap-2.5">
            {top3Monthly.map((entry, i) => (
              <div key={entry.userId} className="flex items-center gap-2.5">
                <span className="text-sm w-5 text-center shrink-0">{MEDAL[i]}</span>
                <UserAvatar name={entry.name} photoUrl={entry.photoUrl} size="sm" className="h-7 w-7 shrink-0" />
                <span className={cn('text-sm flex-1 truncate', entry.userId === user?.id && 'font-semibold text-violet-700 dark:text-violet-300')}>
                  {entry.userId === user?.id ? 'Você' : entry.name}
                </span>
                <span className="text-xs font-semibold text-muted-foreground tabular-nums shrink-0">
                  {entry.totalScore.toLocaleString('pt-BR')} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}

// ── Tela de resultados ─────────────────────────────────────────────────────────

function ResultScreen({
  score,
  answers,
  questions,
}: {
  score: number
  answers: QuizAnswerResult[]
  questions: QuizQuestion[]
}) {
  const user = useAuthStore((s) => s.user)
  const [rankTab,  setRankTab]  = useState<'mensal' | 'semanal'>('mensal')
  const [showInfo, setShowInfo] = useState(false)

  const { data: ranking } = useQuery({
    queryKey:  ['quiz', 'ranking'],
    queryFn:   getQuizRanking,
    enabled:   !!user,
    staleTime: 30_000,
  })

  const pct     = Math.round((score / 1000) * 100)
  const correct = answers.filter(a => a.pts > 0).length

  const emoji = pct === 100 ? '🏆' : pct >= 80 ? '🎉' : pct >= 60 ? '👏' : pct >= 40 ? '💪' : '🤔'
  const msg   = pct === 100 ? 'Perfeito!' : pct >= 80 ? 'Excelente!' : pct >= 60 ? 'Muito bom!' : pct >= 40 ? 'Continue assim!' : 'Tente na próxima!'

  // Próxima segunda-feira
  const nextMondayLabel = ranking?.weekStartDate
    ? (() => {
        const d = new Date(ranking.weekStartDate + 'T12:00:00Z')
        d.setUTCDate(d.getUTCDate() + 7)
        return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'UTC' })
      })()
    : null

  const weeksPlayedThisMonth = ranking?.monthly.find(e => e.userId === user?.id)?.weeksPlayed ?? 0

  const rankList = rankTab === 'mensal' ? (ranking?.monthly ?? []) : (ranking?.weekly ?? [])

  return (
    <motion.div
      key="result"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4 max-w-3xl mx-auto w-full"
    >

      {/* ── Hero score ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-8 text-center bg-gradient-to-b from-violet-50/70 to-transparent dark:from-violet-950/25">
          <span className="text-5xl">{emoji}</span>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-400 mt-3 mb-2">
            {msg}
          </p>
          <p className="text-5xl font-bold text-foreground tabular-nums leading-none">
            {score.toLocaleString('pt-BR')}
            <span className="text-xl text-muted-foreground font-normal"> / 1.000 pts</span>
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 divide-x divide-border border-t border-border">
          <div className="px-4 py-3.5 text-center">
            <p className="text-xl font-bold text-foreground tabular-nums">{correct}<span className="text-sm text-muted-foreground font-normal">/{TOTAL_QUESTIONS}</span></p>
            <p className="text-[11px] text-muted-foreground mt-0.5">acertos</p>
          </div>
          <div className="px-4 py-3.5 text-center">
            <p className="text-xl font-bold text-foreground tabular-nums">
              {ranking?.myPosition ? `${ranking.myPosition}°` : '—'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">posição mensal</p>
          </div>
          <div className="px-4 py-3.5 text-center">
            <p className="text-xl font-bold text-violet-600 dark:text-violet-400 tabular-nums">
              {ranking ? ranking.myMonthlyScore.toLocaleString('pt-BR') : '—'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">acumulado do mês</p>
          </div>
        </div>
      </div>

      {/* ── Próxima rodada ─────────────────────────────────────────────────── */}
      {nextMondayLabel && (
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-950/40">
            <CalendarDays className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">Próxima rodada</p>
            <p className="text-xs text-muted-foreground capitalize truncate">{nextMondayLabel} · 5 novas perguntas</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs font-semibold text-foreground">{weeksPlayedThisMonth} {weeksPlayedThisMonth === 1 ? 'semana' : 'semanas'}</p>
            <p className="text-[10px] text-muted-foreground">jogadas este mês</p>
          </div>
        </div>
      )}

      {/* ── Rankings (Mensal / Semanal) ─────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-border">
          {([['mensal', '🏆 Ranking do Mês'], ['semanal', '📅 Esta Semana']] as const).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setRankTab(tab)}
              className={cn(
                'flex-1 px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-colors',
                rankTab === tab
                  ? 'text-violet-600 dark:text-violet-400 border-b-2 border-violet-500 -mb-px bg-violet-50/50 dark:bg-violet-950/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Lista */}
        <div className="divide-y divide-border">
          {!ranking ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-3">
                <Skeleton className="h-3 w-5 rounded" />
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <Skeleton className="h-3 flex-1 rounded" />
                <Skeleton className="h-3 w-16 rounded" />
              </div>
            ))
          ) : rankList.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Sem dados para esta semana ainda.
            </p>
          ) : rankList.slice(0, 10).map((entry, i) => (
            <div
              key={entry.userId}
              className={cn(
                'px-4 py-3 flex items-center gap-3 transition-colors',
                entry.userId === user?.id && 'bg-violet-50/60 dark:bg-violet-950/20'
              )}
            >
              <span className="w-6 text-center shrink-0 tabular-nums">
                {i < 3
                  ? <span className="text-base leading-none">{MEDAL[i]}</span>
                  : <span className="text-xs font-bold text-muted-foreground">{i + 1}°</span>}
              </span>
              <UserAvatar name={entry.name} photoUrl={entry.photoUrl} size="sm" className="h-8 w-8 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-sm truncate',
                  entry.userId === user?.id ? 'font-semibold text-violet-700 dark:text-violet-300' : 'text-foreground'
                )}>
                  {entry.userId === user?.id ? 'Você' : entry.name}
                </p>
                {rankTab === 'mensal' && entry.weeksPlayed > 1 && (
                  <p className="text-[11px] text-muted-foreground">{entry.weeksPlayed} semanas jogadas</p>
                )}
              </div>
              <span className="text-sm font-semibold text-foreground tabular-nums shrink-0">
                {entry.totalScore.toLocaleString('pt-BR')} pts
              </span>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 border-t border-border bg-muted/20">
          <p className="text-[11px] text-muted-foreground text-center">
            {rankTab === 'mensal'
              ? 'Soma de todas as semanas do mês · reinicia no dia 1°'
              : 'Pontuação desta semana apenas · reinicia toda segunda-feira'}
          </p>
        </div>
      </div>

      {/* ── Gabarito ───────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Gabarito
          </p>
          <span className="text-xs text-muted-foreground">
            {correct}/{TOTAL_QUESTIONS} acertos
          </span>
        </div>
        <div className="divide-y divide-border">
          {answers.map((ans, i) => {
            const q          = questions.find(q => q.id === ans.questionId)
            const isRight    = ans.pts > 0
            const correctKey = ans.correct ?? ans.correctAnswer
            const correctTxt = q?.options[correctKey as keyof typeof q.options] ?? ''
            return (
              <div key={ans.questionId} className="px-4 py-3.5 flex items-start gap-3">
                <div className={cn(
                  'flex h-5 w-5 shrink-0 mt-0.5 items-center justify-center rounded-full',
                  isRight ? 'bg-emerald-100 dark:bg-emerald-950/40' : 'bg-rose-100 dark:bg-rose-950/40'
                )}>
                  {isRight
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    : <XCircle      className="h-3.5 w-3.5 text-rose-500"    />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground leading-snug">
                    <span className="font-medium text-muted-foreground mr-1">{i + 1}.</span>
                    {q?.question ?? ans.question}
                  </p>
                  {!isRight && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Resposta:{' '}
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 uppercase">{correctKey}</span>
                      {correctTxt && <span className="text-muted-foreground"> — {correctTxt}</span>}
                    </p>
                  )}
                </div>
                {isRight && (
                  <span className="text-sm font-bold text-emerald-600 tabular-nums shrink-0">
                    +{ans.pts}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Como funciona ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <button
          onClick={() => setShowInfo(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-violet-500 shrink-0" />
            <span className="text-sm font-medium text-foreground">Como funciona o Quiz da Semana?</span>
          </div>
          {showInfo
            ? <ChevronUp   className="h-4 w-4 text-muted-foreground shrink-0" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
        </button>
        <AnimatePresence initial={false}>
          {showInfo && (
            <motion.div
              key="info-panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="border-t border-border px-4 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {([
                  { icon: '📅', title: 'Uma vez por semana',    desc: 'As perguntas mudam toda segunda-feira. Você tem de segunda a domingo para jogar — uma única tentativa por semana.' },
                  { icon: '🎯', title: 'Como pontuar',          desc: 'Acertou? +100 pts garantidos + até 100 pts de bônus pela velocidade. Quanto mais rápido, mais pontos!' },
                  { icon: '🏆', title: 'Ranking Mensal',        desc: 'Soma de todas as suas pontuações semanais do mês. Jogar toda semana é a chave para subir no ranking!' },
                  { icon: '🔄', title: 'Renovação',             desc: 'Ranking mensal reinicia no dia 1° de cada mês. O histórico dos meses anteriores fica salvo para consulta.' },
                ] as const).map(item => (
                  <div key={item.title} className="flex gap-3 rounded-xl bg-muted/30 border border-border/60 px-3 py-3">
                    <span className="text-xl shrink-0 mt-0.5">{item.icon}</span>
                    <div>
                      <p className="text-xs font-semibold text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </motion.div>
  )
}

// ── Página principal ───────────────────────────────────────────────────────────

export function QuizPage() {
  const user        = useAuthStore((s) => s.user)
  const qClient     = useQueryClient()

  // Estado da máquina de jogo
  const [phase,       setPhase]       = useState<Phase>('loading')
  const [currentQ,    setCurrentQ]    = useState(0)
  const [questions,   setQuestions]   = useState<QuizQuestion[]>([])
  const [selected,    setSelected]    = useState<string | null>(null)
  const [feedback,    setFeedback]    = useState<'correct' | 'wrong' | null>(null)
  const [timeLeft,    setTimeLeft]    = useState(TIME_LIMIT_MS)
  const [result,      setResult]      = useState<{ score: number; answers: QuizAnswerResult[] } | null>(null)

  // Ref para acumular respostas sem efeitos colaterais em updaters de estado
  const accumulatedRef = useRef<QuizSubmitAnswer[]>([])
  const startTimeRef   = useRef<number>(0)
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null)

  // Carrega quiz do dia
  const { data: todayData, isLoading, isError } = useQuery({
    queryKey:  ['quiz', 'today'],
    queryFn:   getTodayQuiz,
    enabled:   !!user,
    staleTime: 60_000,
  })

  // Ranking — usado na intro e no resultado
  const { data: ranking } = useQuery({
    queryKey:  ['quiz', 'ranking'],
    queryFn:   getQuizRanking,
    enabled:   !!user,
    staleTime: 30_000,
  })

  useEffect(() => {
    if (isLoading) { setPhase('loading'); return }
    if (isError)   { setPhase('error');   return }
    if (!todayData) return

    if (todayData.status === 'played') {
      setResult({ score: todayData.score, answers: todayData.answers })
      setPhase('result')
    } else {
      // Não sobrescreve 'result' — pode ter vindo de submitMutation.onSuccess
      setQuestions(todayData.questions)
      setPhase(prev => prev === 'result' ? 'result' : 'intro')
    }
  }, [todayData, isLoading, isError])

  // Submissão
  const submitMutation = useMutation({
    mutationFn: submitQuiz,
    onSuccess: (data) => {
      // Só invalida o ranking — não refetch 'today' para não interferir no phase
      qClient.invalidateQueries({ queryKey: ['quiz', 'ranking'] })
      setResult({ score: data.score, answers: data.answers })
      setPhase('result')
    },
    onError: () => {
      // Se conflito 409 (já jogou hoje), força retorno ao resultado via cache
      qClient.invalidateQueries({ queryKey: ['quiz', 'today'] })
    },
  })

  // Avança para próxima pergunta ou encerra
  // Usa ref para evitar efeitos colaterais dentro de updaters de estado (React StrictMode)
  const advance = useCallback((ans: QuizSubmitAnswer) => {
    accumulatedRef.current = [...accumulatedRef.current, ans]
    const next = accumulatedRef.current

    if (next.length === TOTAL_QUESTIONS) {
      submitMutation.mutate(next)
    } else {
      setTimeout(() => {
        setCurrentQ(q => q + 1)
        setSelected(null)
        setFeedback(null)
        setTimeLeft(TIME_LIMIT_MS)
        startTimeRef.current = Date.now()
      }, FEEDBACK_MS)
    }
  }, [submitMutation])

  // Timer
  useEffect(() => {
    if (phase !== 'playing' || feedback !== null) return

    startTimeRef.current = Date.now()

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const next = Math.max(0, prev - 50)
        if (next === 0) {
          // Tempo esgotado — resposta nula
          if (timerRef.current) clearInterval(timerRef.current)
          setFeedback('wrong')
          advance({
            questionId: questions[currentQ]?.id ?? 0,
            chosen:     null,
            timeMs:     TIME_LIMIT_MS,
          })
        }
        return next
      })
    }, 50)

    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase, currentQ, feedback, advance, questions])

  // Responde pergunta
  function handleAnswer(option: string) {
    if (feedback !== null || phase !== 'playing') return
    if (timerRef.current) clearInterval(timerRef.current)

    const timeMs    = Date.now() - startTimeRef.current
    const correct   = false // desconhecido aqui — servidor valida
    setSelected(option)
    setFeedback('correct') // placeholder; será corrigido pela resposta do servidor

    advance({
      questionId: questions[currentQ]?.id ?? 0,
      chosen:     option,
      timeMs,
    })
    void correct // evita lint warning
  }

  const currentQuestion = questions[currentQ]

  return (
    <div className="flex w-full flex-col gap-6 max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-2xl">🧠</span>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Quiz da Semana</h1>
          <p className="text-xs text-muted-foreground">Ranking mensal · uma tentativa por semana</p>
        </div>
      </div>

      <AnimatePresence>

        {/* Loading */}
        {phase === 'loading' && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <Skeleton className="h-6 w-48 rounded" />
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-3/4 rounded" />
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          </motion.div>
        )}

        {/* Error */}
        {phase === 'error' && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <span className="text-4xl">😕</span>
              <p className="text-sm text-muted-foreground mt-3">
                Não foi possível carregar o quiz. Tente novamente.
              </p>
              <Button
                className="mt-4 gap-2"
                variant="outline"
                onClick={() => qClient.invalidateQueries({ queryKey: ['quiz', 'today'] })}
              >
                <RotateCcw className="h-4 w-4" />
                Tentar novamente
              </Button>
            </div>
          </motion.div>
        )}

        {/* Intro */}
        {phase === 'intro' && (
          <IntroScreen
            key="intro"
            ranking={ranking}
            user={user}
            onStart={() => {
              setCurrentQ(0)
              accumulatedRef.current = []
              setSelected(null)
              setFeedback(null)
              setTimeLeft(TIME_LIMIT_MS)
              setPhase('playing')
            }}
          />
        )}

        {/* Jogando */}
        {phase === 'playing' && (
          <motion.div
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-5"
          >
            {/* Progresso + timer — ficam fixos entre perguntas */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Pergunta {currentQ + 1} de {TOTAL_QUESTIONS}
                </span>
                <span className={cn(
                  'flex items-center gap-1 text-xs font-semibold tabular-nums transition-colors',
                  timeLeft < 5000 ? 'text-rose-500' : 'text-muted-foreground'
                )}>
                  <Clock className="h-3 w-3" />
                  {(timeLeft / 1000).toFixed(1)}s
                </span>
              </div>
              <TimerBar timeLeft={timeLeft} />

              {/* Dots de progresso */}
              <div className="flex gap-1.5 justify-center pt-1">
                {Array.from({ length: TOTAL_QUESTIONS }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-1.5 rounded-full transition-all duration-300',
                      i < currentQ  ? 'w-6 bg-violet-400' :
                      i === currentQ ? 'w-6 bg-violet-600' :
                                       'w-3 bg-border'
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Pergunta + opções — animadas com modo wait para não sobrepor */}
            <div className="overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                {currentQuestion && (
                  <motion.div
                    key={`q-${currentQ}`}
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="flex flex-col gap-3"
                  >
                    {/* Pergunta */}
                    <div className="rounded-2xl border border-border bg-card px-5 py-5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400 mb-2 block">
                        {currentQuestion.category}
                      </span>
                      <p className="text-base font-medium text-foreground leading-relaxed">
                        {currentQuestion.question}
                      </p>
                    </div>

                    {/* Opções */}
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {OPTION_KEYS.map((key, i) => {
                        const isSelected = selected === key
                        return (
                          <button
                            key={key}
                            onClick={() => handleAnswer(key)}
                            disabled={feedback !== null}
                            className={cn(
                              'flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left text-sm font-medium',
                              'transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500',
                              feedback === null && 'hover:border-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-950/20 cursor-pointer',
                              isSelected
                                ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300'
                                : 'border-border bg-card text-foreground',
                              feedback !== null && !isSelected && 'opacity-50 cursor-not-allowed',
                            )}
                          >
                            <span className={cn(
                              'flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-bold',
                              isSelected
                                ? 'bg-violet-600 text-white'
                                : 'bg-muted text-muted-foreground'
                            )}>
                              {OPTION_LABELS[i]}
                            </span>
                            <span className="leading-snug">
                              {currentQuestion.options[key]}
                            </span>
                          </button>
                        )
                      })}
                    </div>

                    {/* Feedback de tempo esgotado */}
                    {feedback === 'wrong' && !selected && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 px-4 py-3 text-sm text-rose-700 dark:text-rose-400"
                      >
                        <Clock className="h-4 w-4 shrink-0" />
                        Tempo esgotado!
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Carregando submissão */}
            {submitMutation.isPending && (
              <p className="text-xs text-muted-foreground text-center animate-pulse">
                Calculando resultado…
              </p>
            )}
          </motion.div>
        )}

        {/* Resultado */}
        {phase === 'result' && result && (
          <ResultScreen
            key="result"
            score={result.score}
            answers={result.answers}
            questions={questions.length > 0 ? questions :
              // se veio do cache (status played), questions pode estar vazio
              result.answers.map(a => ({
                id:       a.questionId,
                question: a.question ?? '',
                options:  a.options ?? { a: '', b: '', c: '', d: '' },
                category: '',
              }))
            }
          />
        )}

      </AnimatePresence>
    </div>
  )
}
