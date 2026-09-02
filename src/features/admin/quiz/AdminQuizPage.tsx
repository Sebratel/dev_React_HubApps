import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, ChevronDown, ChevronUp, Pencil, ToggleLeft, ToggleRight,
  Brain, CheckCircle2, XCircle, CalendarDays, Filter, X,
  Upload, Copy, Check, AlertCircle, Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHero } from '@/components/PageHero'
import { cn } from '@/lib/utils'
import {
  getAdminQuizQuestions,
  createAdminQuizQuestion,
  updateAdminQuizQuestion,
  importAdminQuizQuestions,
  deleteAdminQuizQuestion,
} from '@/services/quiz.service'
import type { QuizAdminQuestion } from '@/types/models'

// ── Seeded RNG — replica do backend para calcular perguntas desta semana ────────

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5) | 0
    t = Math.imul(t ^ (t >>> 15), 1 | t)
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Segunda-feira desta semana em Brasília (UTC-3) como número YYYYMMDD */
function weekSeed(): number {
  const now = new Date(Date.now() - 3 * 60 * 60 * 1000)
  const day = now.getUTCDay() // 0 = dom
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() - (day === 0 ? 6 : day - 1))
  return (
    monday.getUTCFullYear() * 10000 +
    (monday.getUTCMonth() + 1) * 100 +
    monday.getUTCDate()
  )
}

/** Rótulo da segunda-feira desta semana para exibição */
function weekLabel(): string {
  const now = new Date(Date.now() - 3 * 60 * 60 * 1000)
  const day = now.getUTCDay()
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() - (day === 0 ? 6 : day - 1))
  return monday.toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', timeZone: 'UTC'
  })
}

function computeWeekIds(all: QuizAdminQuestion[]): Set<number> {
  const active = all.filter(q => q.active === 1).sort((a, b) => a.id - b.id)
  if (active.length < 5) return new Set()
  const rand     = mulberry32(weekSeed())
  const shuffled = [...active].sort(() => rand() - 0.5)
  return new Set(shuffled.slice(0, 5).map(q => q.id))
}

/** Retorna as 5 perguntas selecionadas para um seed específico */
function computeQuestionsForSeed(seed: number, all: QuizAdminQuestion[]): QuizAdminQuestion[] {
  const active = all.filter(q => q.active === 1).sort((a, b) => a.id - b.id)
  if (active.length < 5) return []
  const rand = mulberry32(seed)
  return [...active].sort(() => rand() - 0.5).slice(0, 5)
}

interface WeekInfo {
  weekStart:  string  // YYYY-MM-DD
  weekEnd:    string
  seed:       number
  label:      string
  sublabel:   string  // ex: "atual" | "próxima" | "em 2 semanas"
  isCurrent:  boolean
  startLabel: string  // ex: "01 set"
  endLabel:   string  // ex: "07 set"
}

function getUpcomingWeeks(count = 5): WeekInfo[] {
  const now = new Date(Date.now() - 3 * 60 * 60 * 1000)
  const day = now.getUTCDay()
  const base = new Date(now)
  base.setUTCDate(now.getUTCDate() - (day === 0 ? 6 : day - 1))

  const sublabels = ['Atual', 'Próxima', 'Em 2 sem.', 'Em 3 sem.', 'Em 4 sem.']

  return Array.from({ length: count }, (_, i) => {
    const start = new Date(base)
    start.setUTCDate(base.getUTCDate() + i * 7)
    const end = new Date(start)
    end.setUTCDate(start.getUTCDate() + 6)

    const fmt = (d: Date) =>
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`

    const ws = fmt(start)
    return {
      weekStart:  ws,
      weekEnd:    fmt(end),
      seed:       parseInt(ws.replace(/-/g, ''), 10),
      label:      start.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' })
                + ' – '
                + end.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' }),
      sublabel:   sublabels[i] ?? `Em ${i} sem.`,
      isCurrent:  i === 0,
      startLabel: start.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' }),
      endLabel:   end.toLocaleDateString('pt-BR',   { day: '2-digit', month: 'short', timeZone: 'UTC' }),
    }
  })
}

// ── Componente: calendário semanal ────────────────────────────────────────────

function WeekCalendar({ questions }: { questions: QuizAdminQuestion[] }) {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [expandedId,  setExpandedId]  = useState<number | null>(null)

  const weeks       = useMemo(() => getUpcomingWeeks(5), [])
  const weekQuestions = useMemo(
    () => weeks.map(w => computeQuestionsForSeed(w.seed, questions)),
    [weeks, questions],
  )

  const activeCount = questions.filter(q => q.active === 1).length
  const current     = weeks[selectedIdx]
  const currentQs   = weekQuestions[selectedIdx]

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-violet-500 shrink-0" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Planejamento semanal
          </p>
        </div>
        <p className="text-[11px] text-muted-foreground hidden sm:block">
          Seleção determinística · muda ao ativar/desativar perguntas
        </p>
      </div>

      {/* Warning: insufficient questions */}
      {activeCount < 5 && (
        <div className="px-4 py-3.5 flex items-center gap-3 bg-amber-50/60 dark:bg-amber-950/15 border-b border-amber-200 dark:border-amber-900">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-800 dark:text-amber-300">
            <span className="font-semibold">Atenção:</span> são necessárias pelo menos 5 perguntas ativas.
            Há apenas {activeCount} ativa{activeCount !== 1 ? 's' : ''} no momento.
          </p>
        </div>
      )}

      {/* Week tabs — scroll horizontal em mobile */}
      <div className="flex border-b border-border overflow-x-auto scrollbar-none">
        {weeks.map((w, i) => (
          <button
            key={w.weekStart}
            onClick={() => { setSelectedIdx(i); setExpandedId(null) }}
            className={cn(
              'flex flex-col items-start px-4 py-3 text-left transition-colors shrink-0 min-w-[130px] relative',
              selectedIdx === i
                ? 'bg-violet-50/70 dark:bg-violet-950/20'
                : 'hover:bg-muted/30',
            )}
          >
            {/* Active indicator underline */}
            {selectedIdx === i && (
              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-violet-500" />
            )}
            <div className="flex items-center gap-1.5 mb-0.5">
              {w.isCurrent && (
                <span className="h-1.5 w-1.5 rounded-full bg-violet-500 shrink-0" />
              )}
              <span className={cn(
                'text-[11px] font-bold uppercase tracking-wider',
                selectedIdx === i
                  ? 'text-violet-700 dark:text-violet-300'
                  : w.isCurrent
                  ? 'text-foreground'
                  : 'text-muted-foreground',
              )}>
                {w.sublabel}
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              {w.startLabel} – {w.endLabel}
            </span>
          </button>
        ))}
      </div>

      {/* Questions for selected week */}
      {activeCount < 5 ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          Adicione perguntas ativas para ver a seleção.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {currentQs.map((q, i) => {
            const isExpanded = expandedId === q.id
            return (
              <div key={q.id} className="group">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : q.id)}
                  className="w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-muted/20 transition-colors"
                >
                  {/* Número */}
                  <span className="flex h-5 w-5 shrink-0 mt-0.5 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-950/40 text-[10px] font-bold text-violet-600 dark:text-violet-400">
                    {i + 1}
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm text-foreground leading-snug', !isExpanded && 'line-clamp-1')}>
                      {q.question}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground capitalize">
                        {q.category}
                      </span>
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', DIFF_COLOR[q.difficulty] ?? DIFF_COLOR.facil)}>
                        {DIFF_LABEL[q.difficulty] ?? q.difficulty}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 mt-0.5">
                    <span className="text-[11px] font-mono text-muted-foreground/50">#{q.id}</span>
                    {isExpanded
                      ? <ChevronUp   className="h-3.5 w-3.5 text-muted-foreground" />
                      : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
                  </div>
                </button>

                {/* Alternativas expandidas */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      key="opts"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-3 pl-12 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {(['a', 'b', 'c', 'd'] as const).map(key => {
                          const isCorrect = q.correct === key
                          return (
                            <div
                              key={key}
                              className={cn(
                                'flex items-start gap-2 rounded-xl px-3 py-2 text-xs border',
                                isCorrect
                                  ? 'bg-violet-50 dark:bg-violet-950/30 border-violet-300 dark:border-violet-700'
                                  : 'bg-muted/30 border-border/60',
                              )}
                            >
                              <span className={cn(
                                'flex h-4 w-4 shrink-0 items-center justify-center rounded-md text-[10px] font-bold mt-0.5',
                                isCorrect ? 'bg-violet-600 text-white' : 'bg-muted text-muted-foreground',
                              )}>
                                {key.toUpperCase()}
                              </span>
                              <span className={cn(
                                'leading-snug',
                                isCorrect ? 'text-violet-700 dark:text-violet-300 font-medium' : 'text-foreground',
                              )}>
                                {q[`option_${key}` as keyof QuizAdminQuestion] as string}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-border bg-muted/20 flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">
          {current.isCurrent ? '🟢 Rodada em andamento' : `🔮 Previsão para ${current.startLabel}`}
        </p>
        <p className="text-[11px] text-muted-foreground hidden sm:block">
          Ativar ou desativar perguntas altera a seleção futura
        </p>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const DIFF_LABEL: Record<string, string>  = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' }
const DIFF_COLOR: Record<string, string>  = {
  facil:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  medio:   'bg-amber-100   text-amber-700   dark:bg-amber-950/50   dark:text-amber-400',
  dificil: 'bg-rose-100    text-rose-700    dark:bg-rose-950/50    dark:text-rose-400',
}
const OPTION_KEY  = ['a', 'b', 'c', 'd'] as const
const OPTION_LABEL = { a: 'A', b: 'B', c: 'C', d: 'D' }

// ── Formulário de pergunta ────────────────────────────────────────────────────

interface FormState {
  question:   string
  option_a:   string
  option_b:   string
  option_c:   string
  option_d:   string
  correct:    'a' | 'b' | 'c' | 'd'
  category:   string
  difficulty: 'facil' | 'medio' | 'dificil'
  active:     boolean
}

const EMPTY_FORM: FormState = {
  question:   '',
  option_a:   '',
  option_b:   '',
  option_c:   '',
  option_d:   '',
  correct:    'a',
  category:   '',
  difficulty: 'facil',
  active:     true,
}

function toForm(q: QuizAdminQuestion): FormState {
  return {
    question:   q.question,
    option_a:   q.option_a,
    option_b:   q.option_b,
    option_c:   q.option_c,
    option_d:   q.option_d,
    correct:    q.correct,
    category:   q.category,
    difficulty: q.difficulty,
    active:     q.active === 1,
  }
}

function QuestionForm({
  form,
  setForm,
  categories,
  onSave,
  onCancel,
  isSaving,
  isEdit,
}: {
  form:       FormState
  setForm:    (f: FormState) => void
  categories: string[]
  onSave:     () => void
  onCancel:   () => void
  isSaving:   boolean
  isEdit:     boolean
}) {
  const set = (k: keyof FormState) => (v: string | boolean) =>
    setForm({ ...form, [k]: v })

  const valid =
    form.question.trim().length >= 5 &&
    form.option_a.trim() && form.option_b.trim() &&
    form.option_c.trim() && form.option_d.trim() &&
    form.category.trim()

  return (
    <div className="flex flex-col gap-5 px-1">

      {/* Enunciado */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-foreground">Enunciado</label>
        <textarea
          value={form.question}
          onChange={e => set('question')(e.target.value)}
          rows={3}
          placeholder="Digite a pergunta..."
          className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50"
        />
      </div>

      {/* Alternativas + gabarito */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-foreground">
          Alternativas <span className="text-muted-foreground font-normal">(clique para marcar o gabarito)</span>
        </label>
        {OPTION_KEY.map(key => {
          const isCorrect = form.correct === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => set('correct')(key)}
              className={cn(
                'flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-sm transition-all duration-150',
                isCorrect
                  ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30'
                  : 'border-border bg-background hover:border-border/80 hover:bg-muted/40',
              )}
            >
              <span className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors',
                isCorrect
                  ? 'bg-violet-600 text-white'
                  : 'bg-muted text-muted-foreground',
              )}>
                {OPTION_LABEL[key]}
              </span>
              <input
                value={form[`option_${key}`]}
                onChange={e => {
                  e.stopPropagation()
                  set(`option_${key}` as keyof FormState)(e.target.value)
                }}
                onClick={e => e.stopPropagation()}
                placeholder={`Alternativa ${OPTION_LABEL[key]}`}
                className={cn(
                  'flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground',
                  isCorrect && 'text-violet-700 dark:text-violet-300 font-medium',
                )}
              />
              {isCorrect && (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-violet-500" />
              )}
            </button>
          )
        })}
      </div>

      {/* Categoria + Dificuldade */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-foreground">Categoria</label>
          <input
            list="categories-list"
            value={form.category}
            onChange={e => set('category')(e.target.value)}
            placeholder="ex: tecnologia"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          />
          <datalist id="categories-list">
            {categories.map(c => <option key={c} value={c} />)}
          </datalist>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-foreground">Dificuldade</label>
          <Select
            value={form.difficulty}
            onChange={e => set('difficulty')(e.target.value)}
            className="rounded-xl h-9 text-sm"
          >
            <option value="facil">🟢 Fácil</option>
            <option value="medio">🟡 Médio</option>
            <option value="dificil">🔴 Difícil</option>
          </Select>
        </div>
      </div>

      {/* Ativa (só no edit) */}
      {isEdit && (
        <label className="flex items-center justify-between rounded-xl border border-border px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors">
          <div>
            <p className="text-sm font-medium text-foreground">Pergunta ativa</p>
            <p className="text-xs text-muted-foreground">Inativa não entra no sorteio semanal</p>
          </div>
          <button
            type="button"
            onClick={() => set('active')(!form.active)}
            className="focus:outline-none"
            aria-label="Alternar status"
          >
            {form.active
              ? <ToggleRight className="h-7 w-7 text-violet-600" />
              : <ToggleLeft  className="h-7 w-7 text-muted-foreground" />}
          </button>
        </label>
      )}

      {/* Ações */}
      <div className="flex gap-2 pt-1 border-t border-border">
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          className="flex-1 bg-violet-600 hover:bg-violet-700 text-white border-transparent"
          onClick={onSave}
          disabled={!valid || isSaving}
        >
          {isSaving ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Criar pergunta'}
        </Button>
      </div>
    </div>
  )
}

// ── Card de pergunta ──────────────────────────────────────────────────────────

function QuestionCard({
  q,
  isWeek,
  onEdit,
  onToggle,
  onDelete,
  isToggling,
  isDeleting,
}: {
  q:          QuizAdminQuestion
  isWeek:     boolean
  onEdit:     () => void
  onToggle:   () => void
  onDelete:   () => void
  isToggling: boolean
  isDeleting: boolean
}) {
  const [expanded,   setExpanded]   = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const active = q.active === 1

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-2xl border bg-card transition-colors duration-150',
        isWeek
          ? 'border-violet-400/60 ring-1 ring-violet-400/30 dark:border-violet-600/50'
          : 'border-border',
        !active && 'opacity-60',
      )}
    >
      {/* Row principal */}
      <div className="flex items-start gap-3 px-4 py-3.5">
        {/* ID */}
        <span className="text-[11px] font-mono text-muted-foreground/70 mt-0.5 w-8 shrink-0 tabular-nums">
          #{q.id}
        </span>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-sm text-foreground leading-snug',
            !expanded && 'line-clamp-2',
          )}>
            {q.question}
          </p>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {isWeek && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 dark:bg-violet-950/50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-300">
                <CalendarDays className="h-2.5 w-2.5" />
                Esta semana
              </span>
            )}
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground capitalize">
              {q.category}
            </span>
            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', DIFF_COLOR[q.difficulty] ?? DIFF_COLOR.facil)}>
              {DIFF_LABEL[q.difficulty] ?? q.difficulty}
            </span>
            {active
              ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-2.5 w-2.5" />Ativa
                </span>
              : <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                  <XCircle className="h-2.5 w-2.5" />Inativa
                </span>
            }
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Editar"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onToggle}
            disabled={isToggling}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
            title={active ? 'Desativar' : 'Reativar'}
          >
            {active
              ? <ToggleRight className="h-4 w-4 text-emerald-600" />
              : <ToggleLeft  className="h-4 w-4" />}
          </button>
          {/* Delete com confirmação inline */}
          {confirmDel ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => { onDelete(); setConfirmDel(false) }}
                disabled={isDeleting}
                className="flex items-center gap-1 rounded-lg bg-rose-600 hover:bg-rose-700 px-2 h-7 text-[11px] font-semibold text-white transition-colors disabled:opacity-50"
                title="Confirmar exclusão"
              >
                {isDeleting ? '…' : 'Excluir'}
              </button>
              <button
                onClick={() => setConfirmDel(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent"
                title="Cancelar"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDel(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600"
              title="Excluir permanentemente"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title={expanded ? 'Recolher' : 'Ver alternativas'}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Alternativas expandidas */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="opts"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {OPTION_KEY.map(key => {
                const isCorrect = q.correct === key
                return (
                  <div
                    key={key}
                    className={cn(
                      'flex items-start gap-2 rounded-xl px-3 py-2 text-xs',
                      isCorrect
                        ? 'bg-violet-50 dark:bg-violet-950/30 border border-violet-300 dark:border-violet-700'
                        : 'bg-muted/40 border border-border/60',
                    )}
                  >
                    <span className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold mt-0.5',
                      isCorrect ? 'bg-violet-600 text-white' : 'bg-muted text-muted-foreground',
                    )}>
                      {OPTION_LABEL[key]}
                    </span>
                    <span className={cn(
                      'leading-snug',
                      isCorrect ? 'text-violet-700 dark:text-violet-300 font-medium' : 'text-foreground',
                    )}>
                      {q[`option_${key}`]}
                    </span>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Prompt template para ChatGPT ─────────────────────────────────────────────

function buildPrompt(topic: string, count: number): string {
  return `Crie ${count} perguntas de múltipla escolha sobre "${topic}" para um quiz corporativo.

Retorne APENAS um array JSON válido, sem texto antes ou depois, neste formato exato:

[
  {
    "question": "Texto completo da pergunta?",
    "option_a": "Primeira alternativa",
    "option_b": "Segunda alternativa",
    "option_c": "Terceira alternativa",
    "option_d": "Quarta alternativa",
    "correct": "a",
    "category": "${topic.toLowerCase().replace(/\s+/g, '-')}",
    "difficulty": "facil"
  }
]

Regras obrigatórias:
- "correct" deve ser exatamente "a", "b", "c" ou "d" (letra minúscula)
- "difficulty" deve ser exatamente "facil", "medio" ou "dificil"
- "category" deve ser uma palavra ou expressão curta em minúsculo
- Cada pergunta deve ter apenas uma resposta correta
- Retorne SOMENTE o JSON puro, sem bloco de código markdown, sem explicações`
}

// ── Sheet de importação ───────────────────────────────────────────────────────

type ParsedQuestion = Omit<QuizAdminQuestion, 'id' | 'active'>
type ParseState = 'idle' | 'ok' | 'error'

function ImportSheet({
  open,
  onClose,
  onImported,
}: {
  open:       boolean
  onClose:    () => void
  onImported: (count: number) => void
}) {
  const [raw,       setRaw]       = useState('')
  const [topic,     setTopic]     = useState('')
  const [count,     setCount]     = useState('10')
  const [parseState,setParseState]= useState<ParseState>('idle')
  const [parsed,    setParsed]    = useState<ParsedQuestion[]>([])
  const [parseError,setParseError]= useState('')
  const [copied,    setCopied]    = useState(false)
  const [imported,  setImported]  = useState(false)

  const importMutation = useMutation({
    mutationFn: importAdminQuizQuestions,
    onSuccess: (data) => {
      setImported(true)
      setTimeout(() => {
        onImported(data.imported)
        onClose()
        reset()
      }, 1200)
    },
  })

  function reset() {
    setRaw(''); setTopic(''); setCount('10')
    setParseState('idle'); setParsed([]); setParseError('')
    setCopied(false); setImported(false)
  }

  // Valida o JSON colado
  function validate(text: string) {
    setRaw(text)
    const trimmed = text.trim()
    if (!trimmed) { setParseState('idle'); setParsed([]); setParseError(''); return }

    try {
      const data = JSON.parse(trimmed)
      if (!Array.isArray(data)) throw new Error('O JSON deve ser um array [ ].')
      if (data.length === 0) throw new Error('O array está vazio.')
      if (data.length > 200) throw new Error('Máximo de 200 perguntas por importação.')

      const REQUIRED = ['question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct']
      const VALID_C  = ['a', 'b', 'c', 'd']
      const VALID_D  = ['facil', 'medio', 'dificil']

      for (let i = 0; i < data.length; i++) {
        const q = data[i]
        for (const f of REQUIRED) {
          if (!q[f] || typeof q[f] !== 'string') throw new Error(`Pergunta ${i + 1}: campo "${f}" obrigatório.`)
        }
        if (!VALID_C.includes(q.correct)) throw new Error(`Pergunta ${i + 1}: "correct" deve ser a, b, c ou d.`)
        if (q.difficulty && !VALID_D.includes(q.difficulty)) throw new Error(`Pergunta ${i + 1}: "difficulty" inválido — use facil, medio ou dificil.`)
      }

      setParsed(data as ParsedQuestion[])
      setParseState('ok')
      setParseError('')
    } catch (e) {
      setParsed([])
      setParseState('error')
      setParseError(e instanceof Error ? e.message : 'JSON inválido.')
    }
  }

  function copyPrompt() {
    navigator.clipboard.writeText(buildPrompt(topic || 'tecnologia', Number(count) || 10))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const DIFF_LABEL_MAP: Record<string, string> = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' }

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) { onClose(); reset() } }}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col overflow-hidden p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-violet-600" />
            Importar perguntas
          </SheetTitle>
          <SheetDescription>
            Gere perguntas com o ChatGPT e cole o JSON aqui para importar em lote.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

          {/* Gerador de prompt */}
          <div className="rounded-2xl border border-violet-200 dark:border-violet-800 bg-violet-50/60 dark:bg-violet-950/20 p-4">
            <p className="text-xs font-semibold text-violet-700 dark:text-violet-300 mb-3 uppercase tracking-wider">
              1 · Gere o prompt para o ChatGPT
            </p>
            <div className="flex gap-2 mb-3">
              <input
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="Tema (ex: telecomunicações, vendas…)"
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              />
              <input
                type="number"
                value={count}
                onChange={e => setCount(e.target.value)}
                min={1} max={50}
                className="w-16 rounded-xl border border-border bg-background px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                title="Quantidade de perguntas"
              />
            </div>
            <button
              onClick={copyPrompt}
              className={cn(
                'w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-150',
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-violet-600 hover:bg-violet-700 text-white',
              )}
            >
              {copied
                ? <><Check className="h-4 w-4" />Copiado! Cole no ChatGPT</>
                : <><Copy className="h-4 w-4" />Copiar prompt para o ChatGPT</>}
            </button>
          </div>

          {/* Cola o JSON */}
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
              2 · Cole o JSON gerado
            </p>
            <textarea
              value={raw}
              onChange={e => validate(e.target.value)}
              rows={10}
              placeholder={'[\n  {\n    "question": "...",\n    "option_a": "...",\n    ...\n  }\n]'}
              spellCheck={false}
              className={cn(
                'w-full resize-none rounded-xl border bg-background px-3 py-2.5 text-xs font-mono text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 transition-colors',
                parseState === 'ok'    && 'border-emerald-400 focus:ring-emerald-400/40',
                parseState === 'error' && 'border-rose-400    focus:ring-rose-400/40',
                parseState === 'idle'  && 'border-border      focus:ring-violet-500/40',
              )}
            />
            {/* Feedback de validação */}
            {parseState === 'ok' && (
              <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {parsed.length} pergunta{parsed.length !== 1 ? 's' : ''} válida{parsed.length !== 1 ? 's' : ''} — pronto para importar
              </p>
            )}
            {parseState === 'error' && (
              <p className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {parseError}
              </p>
            )}
          </div>

          {/* Preview das perguntas */}
          {parseState === 'ok' && parsed.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
                3 · Pré-visualização
              </p>
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                {parsed.map((q, i) => (
                  <div key={i} className="rounded-xl border border-border bg-muted/30 px-3 py-2.5">
                    <div className="flex items-start gap-2 mb-1.5">
                      <span className="text-[10px] font-mono text-muted-foreground mt-0.5 shrink-0">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <p className="text-xs text-foreground leading-snug flex-1">{q.question}</p>
                    </div>
                    <div className="flex flex-wrap gap-1 pl-5">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground capitalize">
                        {q.category}
                      </span>
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', DIFF_COLOR[q.difficulty] ?? DIFF_COLOR.facil)}>
                        {DIFF_LABEL_MAP[q.difficulty] ?? q.difficulty}
                      </span>
                      <span className="rounded-full bg-violet-100 dark:bg-violet-950/50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-300">
                        ✓ {OPTION_LABEL[q.correct as keyof typeof OPTION_LABEL]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Erro da API */}
          {importMutation.isError && (
            <p className="flex items-center gap-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 px-3 py-2.5 text-xs text-rose-700 dark:text-rose-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {importMutation.error instanceof Error ? importMutation.error.message : 'Erro ao importar.'}
            </p>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border shrink-0 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => { onClose(); reset() }}>
            Cancelar
          </Button>
          <Button
            className={cn(
              'flex-1 gap-2 border-transparent text-white transition-colors',
              imported
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-violet-600 hover:bg-violet-700',
            )}
            disabled={parseState !== 'ok' || importMutation.isPending || imported}
            onClick={() => importMutation.mutate(parsed)}
          >
            {imported ? (
              <><Check className="h-4 w-4" />Importado!</>
            ) : importMutation.isPending ? (
              'Importando…'
            ) : (
              <><Upload className="h-4 w-4" />Importar {parsed.length > 0 ? parsed.length : ''} pergunta{parsed.length !== 1 ? 's' : ''}</>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

type FilterStatus = 'all' | 'active' | 'inactive'

export function AdminQuizPage() {
  const qClient = useQueryClient()

  // ── Data ──
  const { data: questions = [], isLoading } = useQuery({
    queryKey:  ['admin', 'quiz', 'questions'],
    queryFn:   getAdminQuizQuestions,
    staleTime: 30_000,
  })

  const weekIds  = useMemo(() => computeWeekIds(questions), [questions])
  const weekLbl  = useMemo(() => weekLabel(), [])

  // ── Filters ──
  const [search,           setSearch]           = useState('')
  const [filterCategory,   setFilterCategory]   = useState('all')
  const [filterDifficulty, setFilterDifficulty] = useState('all')
  const [filterStatus,     setFilterStatus]     = useState<FilterStatus>('all')
  const [showWeekOnly,     setShowWeekOnly]     = useState(false)

  // ── Panel ──
  const [panelOpen,   setPanelOpen]   = useState(false)
  const [importOpen,  setImportOpen]  = useState(false)
  const [editingQ,    setEditingQ]    = useState<QuizAdminQuestion | null>(null)
  const [form,        setForm]        = useState<FormState>(EMPTY_FORM)
  const [togglingId,  setTogglingId]  = useState<number | null>(null)
  const [deletingId,  setDeletingId]  = useState<number | null>(null)

  // ── Stats ──
  const total      = questions.length
  const activeCount   = questions.filter(q => q.active === 1).length
  const inactiveCount = questions.filter(q => q.active === 0).length
  const categories = [...new Set(questions.map(q => q.category))].sort()

  // ── Filtered list ──
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return questions.filter(item => {
      if (showWeekOnly && !weekIds.has(item.id)) return false
      if (filterCategory   !== 'all' && item.category   !== filterCategory)   return false
      if (filterDifficulty !== 'all' && item.difficulty !== filterDifficulty) return false
      if (filterStatus === 'active'   && item.active !== 1) return false
      if (filterStatus === 'inactive' && item.active !== 0) return false
      if (q && !item.question.toLowerCase().includes(q) && !item.category.toLowerCase().includes(q)) return false
      return true
    })
  }, [questions, search, filterCategory, filterDifficulty, filterStatus, showWeekOnly, weekIds])

  const hasFilters = search || filterCategory !== 'all' || filterDifficulty !== 'all' || filterStatus !== 'all' || showWeekOnly

  // ── Mutations ──
  const createMutation = useMutation({
    mutationFn: createAdminQuizQuestion,
    onSuccess: () => {
      qClient.invalidateQueries({ queryKey: ['admin', 'quiz', 'questions'] })
      setPanelOpen(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Omit<QuizAdminQuestion, 'id'>> }) =>
      updateAdminQuizQuestion(id, data),
    onSuccess: () => {
      qClient.invalidateQueries({ queryKey: ['admin', 'quiz', 'questions'] })
      setPanelOpen(false)
      setTogglingId(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAdminQuizQuestion,
    onSuccess: () => {
      qClient.invalidateQueries({ queryKey: ['admin', 'quiz', 'questions'] })
      setDeletingId(null)
    },
    onError: () => {
      setDeletingId(null)
    },
  })

  function handleDelete(q: QuizAdminQuestion) {
    setDeletingId(q.id)
    deleteMutation.mutate(q.id)
  }

  function openCreate() {
    setEditingQ(null)
    setForm(EMPTY_FORM)
    setPanelOpen(true)
  }

  function openEdit(q: QuizAdminQuestion) {
    setEditingQ(q)
    setForm(toForm(q))
    setPanelOpen(true)
  }

  function handleToggle(q: QuizAdminQuestion) {
    setTogglingId(q.id)
    updateMutation.mutate({ id: q.id, data: { active: q.active === 1 ? 0 : 1 } })
  }

  function handleSave() {
    const payload = {
      question:   form.question.trim(),
      option_a:   form.option_a.trim(),
      option_b:   form.option_b.trim(),
      option_c:   form.option_c.trim(),
      option_d:   form.option_d.trim(),
      correct:    form.correct,
      category:   form.category.trim().toLowerCase(),
      difficulty: form.difficulty,
    }
    if (editingQ) {
      updateMutation.mutate({ id: editingQ.id, data: { ...payload, active: form.active ? 1 : 0 } })
    } else {
      createMutation.mutate(payload)
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="flex flex-col gap-6">

      {/* Hero */}
      <PageHero
        icon={Brain}
        title="Quiz da Semana"
        subtitle={`Gerencie o banco de perguntas · 5 perguntas sorteiadas toda segunda-feira · semana de ${weekLbl}`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setImportOpen(true)}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Importar
            </Button>
            <Button
              onClick={openCreate}
              className="gap-2 bg-violet-600 hover:bg-violet-700 text-white border-transparent"
            >
              <Plus className="h-4 w-4" />
              Nova pergunta
            </Button>
          </div>
        }
        stats={[
          { icon: Brain,        value: total,        label: 'Total',         tone: 'primary' },
          { icon: CheckCircle2, value: activeCount,   label: 'Ativas',        tone: 'green'   },
          { icon: XCircle,      value: inactiveCount, label: 'Inativas',      tone: 'muted'   },
          { icon: CalendarDays, value: weekIds.size,  label: 'Esta semana',   tone: 'amber'   },
        ]}
      />

      {/* Calendário semanal */}
      <WeekCalendar questions={questions} />

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar pergunta ou categoria…"
            className="pl-9 rounded-xl h-9"
          />
        </div>

        {/* Categoria */}
        <Select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="w-40 rounded-xl h-9 text-sm"
        >
          <option value="all">Todas categorias</option>
          {categories.map(c => (
            <option key={c} value={c} className="capitalize">{c}</option>
          ))}
        </Select>

        {/* Dificuldade */}
        <Select
          value={filterDifficulty}
          onChange={e => setFilterDifficulty(e.target.value)}
          className="w-36 rounded-xl h-9 text-sm"
        >
          <option value="all">Todas dific.</option>
          <option value="facil">🟢 Fácil</option>
          <option value="medio">🟡 Médio</option>
          <option value="dificil">🔴 Difícil</option>
        </Select>

        {/* Status */}
        <Select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as FilterStatus)}
          className="w-32 rounded-xl h-9 text-sm"
        >
          <option value="all">Todas</option>
          <option value="active">Ativas</option>
          <option value="inactive">Inativas</option>
        </Select>

        {/* Esta semana */}
        <button
          onClick={() => setShowWeekOnly(o => !o)}
          className={cn(
            'flex items-center gap-1.5 rounded-xl border px-3 h-9 text-sm font-medium transition-colors',
            showWeekOnly
              ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300'
              : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          <CalendarDays className="h-3.5 w-3.5" />
          Esta semana
        </button>

        {/* Limpar filtros */}
        {hasFilters && (
          <button
            onClick={() => {
              setSearch('')
              setFilterCategory('all')
              setFilterDifficulty('all')
              setFilterStatus('all')
              setShowWeekOnly(false)
            }}
            className="flex items-center gap-1 rounded-xl border border-border px-3 h-9 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Limpar
          </button>
        )}

        <span className="ml-auto text-xs text-muted-foreground tabular-nums shrink-0">
          {filtered.length} {filtered.length === 1 ? 'pergunta' : 'perguntas'}
        </span>
      </div>

      {/* Lista de perguntas */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card px-4 py-3.5 flex items-center gap-3">
              <Skeleton className="h-3 w-8 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card py-16 text-center">
          <Filter className="h-10 w-10 text-muted-foreground/40" />
          <div>
            <p className="text-sm font-medium text-foreground">Nenhuma pergunta encontrada</p>
            <p className="text-xs text-muted-foreground mt-1">
              {hasFilters ? 'Tente ajustar os filtros.' : 'Adicione perguntas ao banco para o quiz funcionar.'}
            </p>
          </div>
          {!hasFilters && (
            <Button onClick={openCreate} className="mt-2 gap-2 bg-violet-600 hover:bg-violet-700 text-white border-transparent">
              <Plus className="h-4 w-4" />
              Nova pergunta
            </Button>
          )}
        </div>
      ) : (
        <motion.div className="flex flex-col gap-2" layout>
          <AnimatePresence mode="popLayout">
            {filtered.map(q => (
              <QuestionCard
                key={q.id}
                q={q}
                isWeek={weekIds.has(q.id)}
                onEdit={() => openEdit(q)}
                onToggle={() => handleToggle(q)}
                onDelete={() => handleDelete(q)}
                isToggling={togglingId === q.id && updateMutation.isPending}
                isDeleting={deletingId === q.id && deleteMutation.isPending}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Sheet de importação */}
      <ImportSheet
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={(n) => {
          qClient.invalidateQueries({ queryKey: ['admin', 'quiz', 'questions'] })
          void n
        }}
      />

      {/* Sheet de criação / edição */}
      <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>{editingQ ? `Editar #${editingQ.id}` : 'Nova pergunta'}</SheetTitle>
            <SheetDescription>
              {editingQ
                ? 'Altere os campos e salve para atualizar no banco.'
                : 'A pergunta entra no pool de sorteio semanal assim que for criada.'}
            </SheetDescription>
          </SheetHeader>
          <QuestionForm
            form={form}
            setForm={setForm}
            categories={categories}
            onSave={handleSave}
            onCancel={() => setPanelOpen(false)}
            isSaving={isSaving}
            isEdit={!!editingQ}
          />
        </SheetContent>
      </Sheet>

    </div>
  )
}
