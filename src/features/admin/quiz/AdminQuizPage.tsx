import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, ChevronDown, ChevronUp, Pencil, ToggleLeft, ToggleRight,
  Brain, CheckCircle2, XCircle, CalendarDays, Filter, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHero } from '@/components/PageHero'
import { cn } from '@/lib/utils'
import {
  getAdminQuizQuestions,
  createAdminQuizQuestion,
  updateAdminQuizQuestion,
} from '@/services/quiz.service'
import type { QuizAdminQuestion } from '@/types/models'

// ── Seeded RNG — replica do backend para calcular perguntas de hoje ────────────

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5) | 0
    t = Math.imul(t ^ (t >>> 15), 1 | t)
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function todaySeed() {
  const now = new Date(Date.now() - 3 * 60 * 60 * 1000)
  return (
    now.getUTCFullYear() * 10000 +
    (now.getUTCMonth() + 1) * 100 +
    now.getUTCDate()
  )
}

function computeTodayIds(all: QuizAdminQuestion[]): Set<number> {
  const active = all.filter(q => q.active === 1).sort((a, b) => a.id - b.id)
  if (active.length < 5) return new Set()
  const rand     = mulberry32(todaySeed())
  const shuffled = [...active].sort(() => rand() - 0.5)
  return new Set(shuffled.slice(0, 5).map(q => q.id))
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
            onValueChange={v => set('difficulty')(v)}
          >
            <SelectTrigger className="rounded-xl h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="facil">🟢 Fácil</SelectItem>
              <SelectItem value="medio">🟡 Médio</SelectItem>
              <SelectItem value="dificil">🔴 Difícil</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Ativa (só no edit) */}
      {isEdit && (
        <label className="flex items-center justify-between rounded-xl border border-border px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors">
          <div>
            <p className="text-sm font-medium text-foreground">Pergunta ativa</p>
            <p className="text-xs text-muted-foreground">Inativa não entra no sorteio diário</p>
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
  isToday,
  onEdit,
  onToggle,
  isToggling,
}: {
  q:          QuizAdminQuestion
  isToday:    boolean
  onEdit:     () => void
  onToggle:   () => void
  isToggling: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const active = q.active === 1

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-2xl border bg-card transition-colors duration-150',
        isToday
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
            {isToday && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 dark:bg-violet-950/50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-300">
                <CalendarDays className="h-2.5 w-2.5" />
                Hoje
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

  const todayIds = useMemo(() => computeTodayIds(questions), [questions])

  // ── Filters ──
  const [search,          setSearch]          = useState('')
  const [filterCategory,  setFilterCategory]  = useState('all')
  const [filterDifficulty,setFilterDifficulty]= useState('all')
  const [filterStatus,    setFilterStatus]    = useState<FilterStatus>('all')
  const [showTodayOnly,   setShowTodayOnly]   = useState(false)

  // ── Panel ──
  const [panelOpen,  setPanelOpen]  = useState(false)
  const [editingQ,   setEditingQ]   = useState<QuizAdminQuestion | null>(null)
  const [form,       setForm]       = useState<FormState>(EMPTY_FORM)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  // ── Stats ──
  const total      = questions.length
  const activeCount   = questions.filter(q => q.active === 1).length
  const inactiveCount = questions.filter(q => q.active === 0).length
  const categories = [...new Set(questions.map(q => q.category))].sort()

  // ── Filtered list ──
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return questions.filter(item => {
      if (showTodayOnly && !todayIds.has(item.id)) return false
      if (filterCategory   !== 'all' && item.category   !== filterCategory)   return false
      if (filterDifficulty !== 'all' && item.difficulty !== filterDifficulty) return false
      if (filterStatus === 'active'   && item.active !== 1) return false
      if (filterStatus === 'inactive' && item.active !== 0) return false
      if (q && !item.question.toLowerCase().includes(q) && !item.category.toLowerCase().includes(q)) return false
      return true
    })
  }, [questions, search, filterCategory, filterDifficulty, filterStatus, showTodayOnly, todayIds])

  const hasFilters = search || filterCategory !== 'all' || filterDifficulty !== 'all' || filterStatus !== 'all' || showTodayOnly

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
        title="Quiz do Dia"
        subtitle="Gerencie o banco de perguntas · seleção automática diária por sorteio semeado"
        actions={
          <Button
            onClick={openCreate}
            className="gap-2 bg-violet-600 hover:bg-violet-700 text-white border-transparent"
          >
            <Plus className="h-4 w-4" />
            Nova pergunta
          </Button>
        }
        stats={[
          { icon: Brain,        value: total,        label: 'Total',       tone: 'primary' },
          { icon: CheckCircle2, value: activeCount,   label: 'Ativas',      tone: 'green'   },
          { icon: XCircle,      value: inactiveCount, label: 'Inativas',    tone: 'muted'   },
          { icon: CalendarDays, value: todayIds.size, label: 'Hoje',        tone: 'amber'   },
        ]}
      />

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
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-40 rounded-xl h-9 text-sm">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {categories.map(c => (
              <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Dificuldade */}
        <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
          <SelectTrigger className="w-36 rounded-xl h-9 text-sm">
            <SelectValue placeholder="Dificuldade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="facil">🟢 Fácil</SelectItem>
            <SelectItem value="medio">🟡 Médio</SelectItem>
            <SelectItem value="dificil">🔴 Difícil</SelectItem>
          </SelectContent>
        </Select>

        {/* Status */}
        <Select value={filterStatus} onValueChange={v => setFilterStatus(v as FilterStatus)}>
          <SelectTrigger className="w-32 rounded-xl h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="active">Ativas</SelectItem>
            <SelectItem value="inactive">Inativas</SelectItem>
          </SelectContent>
        </Select>

        {/* Hoje */}
        <button
          onClick={() => setShowTodayOnly(o => !o)}
          className={cn(
            'flex items-center gap-1.5 rounded-xl border px-3 h-9 text-sm font-medium transition-colors',
            showTodayOnly
              ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300'
              : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          <CalendarDays className="h-3.5 w-3.5" />
          Hoje
        </button>

        {/* Limpar filtros */}
        {hasFilters && (
          <button
            onClick={() => {
              setSearch('')
              setFilterCategory('all')
              setFilterDifficulty('all')
              setFilterStatus('all')
              setShowTodayOnly(false)
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
              {hasFilters ? 'Tente ajustar os filtros.' : 'Crie a primeira pergunta do banco.'}
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
                isToday={todayIds.has(q.id)}
                onEdit={() => openEdit(q)}
                onToggle={() => handleToggle(q)}
                isToggling={togglingId === q.id && updateMutation.isPending}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Sheet de criação / edição */}
      <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>{editingQ ? `Editar #${editingQ.id}` : 'Nova pergunta'}</SheetTitle>
            <SheetDescription>
              {editingQ
                ? 'Altere os campos e salve para atualizar no banco.'
                : 'A pergunta entra no pool de sorteio assim que for criada.'}
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
