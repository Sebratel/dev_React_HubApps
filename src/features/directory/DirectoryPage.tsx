import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Search, Users, ChevronDown } from 'lucide-react'
import { markDirectoryVisited } from '@/features/onboarding/OnboardingChecklist'
import { UserAvatar } from '@/components/UserAvatar'
import { getPeople } from '@/services/user.service'
import type { DirectoryPerson } from '@/services/user.service'
import { BirthdayWishesModal } from './BirthdayWishesModal'
import { useAuthStore } from '@/stores/auth.store'
import { cn } from '@/lib/utils'

// ─── Badge computados por pessoa ─────────────────────────────────────────────

function computedBadges(p: DirectoryPerson): { emoji: string; label: string }[] {
  const badges: { emoji: string; label: string }[] = []
  if (p.birthdayToday)         badges.push({ emoji: '🎂', label: 'Aniversário hoje' })
  if (p.kudoCount >= 10)       badges.push({ emoji: '🌟', label: '10+ kudos recebidos' })
  else if (p.kudoCount >= 5)   badges.push({ emoji: '⭐', label: '5+ kudos recebidos' })
  else if (p.kudoCount >= 1)   badges.push({ emoji: '🏆', label: 'Primeiro kudo recebido' })
  if ((p.tenureYears ?? 0) >= 5)  badges.push({ emoji: '🏅', label: `${p.tenureYears} anos de empresa` })
  else if ((p.tenureYears ?? 0) >= 1) badges.push({ emoji: '🎖️', label: `${p.tenureYears} ano${(p.tenureYears ?? 0) > 1 ? 's' : ''} de empresa` })
  return badges
}

// ─── Card de pessoa ───────────────────────────────────────────────────────────

function PersonCard({
  person,
  onWishClick,
  onClick,
}: {
  person: DirectoryPerson
  onWishClick: (p: DirectoryPerson) => void
  onClick: (p: DirectoryPerson) => void
}) {
  const badges = computedBadges(person)

  return (
    <article
      onClick={() => onClick(person)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(person)}
      aria-label={`Ver perfil de ${person.name}`}
      className={cn(
        'group relative flex flex-col items-center gap-3 rounded-2xl border bg-card px-4 py-5 text-center transition-all cursor-pointer hover:shadow-md hover:border-primary/30',
        person.birthdayToday
          ? 'border-amber-400/60 bg-gradient-to-b from-amber-50/60 to-card dark:from-amber-900/10'
          : 'border-border'
      )}
    >
      {/* Avatar */}
      <div className="relative">
        <UserAvatar name={person.name} photoUrl={person.photoUrl} size="lg" />
        {/* Green dot if has status */}
        {person.status && (
          <span
            className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full bg-green-500 ring-2 ring-card"
            aria-hidden
          />
        )}
      </div>

      {/* Name + team */}
      <div className="min-w-0 w-full">
        <p className="font-semibold text-sm text-foreground truncate leading-tight">{person.name}</p>
        {person.teamName && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{person.teamName}</p>
        )}
        {person.profile && !person.teamName && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{person.profile}</p>
        )}
      </div>

      {/* Status */}
      {person.status && (
        <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground max-w-full truncate">
          {person.status}
        </span>
      )}

      {/* Badges */}
      {badges.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1">
          {badges.map((b) => (
            <span
              key={b.label}
              title={b.label}
              className="text-base leading-none select-none cursor-default"
              aria-label={b.label}
            >
              {b.emoji}
            </span>
          ))}
        </div>
      )}

      {/* Birthday action */}
      {person.birthdayToday && (
        <button
          onClick={(e) => { e.stopPropagation(); onWishClick(person) }}
          className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline"
        >
          🎉 Enviar parabéns
        </button>
      )}
    </article>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export function DirectoryPage() {
  const user     = useAuthStore((s) => s.user)
  const navigate = useNavigate()

  // Marca a visita para o checklist de onboarding
  useEffect(() => { markDirectoryVisited() }, [])

  const [search, setSearch] = useState('')
  const [teamFilter, setTeamFilter] = useState<string>('all')
  const [wishTarget, setWishTarget] = useState<DirectoryPerson | null>(null)

  const { data: people = [], isLoading } = useQuery({
    queryKey: ['users', 'people'],
    queryFn:  getPeople,
    staleTime: 2 * 60_000,
    enabled:  !!user,
  })

  // Lista de times únicos para o filtro
  const teams = useMemo(() => {
    const set = new Set<string>()
    people.forEach((p) => { if (p.teamName) set.add(p.teamName) })
    return Array.from(set).sort()
  }, [people])

  // Filtragem
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return people.filter((p) => {
      if (teamFilter !== 'all' && p.teamName !== teamFilter) return false
      if (q && !p.name.toLowerCase().includes(q) && !(p.teamName ?? '').toLowerCase().includes(q)) return false
      return true
    })
  }, [people, search, teamFilter])

  // Separa aniversariantes de hoje
  const todayBirthdays = filtered.filter((p) => p.birthdayToday)
  const rest           = filtered.filter((p) => !p.birthdayToday)

  return (
    <main className="min-h-full pb-12">
      {/* ── Header ── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
            <Users className="h-4 w-4 text-primary" aria-hidden />
          </div>
          <h1 className="text-xl font-bold text-foreground">Pessoas</h1>
          {!isLoading && (
            <span className="ml-1 text-sm text-muted-foreground">
              · {people.length} {people.length === 1 ? 'pessoa' : 'pessoas'}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground pl-10">
          Conheça sua equipe, veja quem está online e celebre com os aniversariantes de hoje.
        </p>
      </div>

      {/* ── Filtros ── */}
      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        {/* Busca */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou time…"
            className={cn(
              'w-full rounded-xl border border-border bg-card pl-9 pr-4 py-2 text-sm',
              'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors'
            )}
            aria-label="Buscar pessoa"
          />
        </div>

        {/* Filtro por time */}
        {teams.length > 0 && (
          <div className="relative">
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className={cn(
                'appearance-none w-full sm:w-44 rounded-xl border border-border bg-card pl-3 pr-8 py-2 text-sm',
                'text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors cursor-pointer'
              )}
              aria-label="Filtrar por time"
            >
              <option value="all">Todos os times</option>
              {teams.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" aria-hidden />
          </div>
        )}
      </div>

      {/* ── Estado de carregamento ── */}
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-card h-48 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* ── Aniversariantes de hoje ── */}
      {!isLoading && todayBirthdays.length > 0 && (
        <section className="mb-6" aria-label="Aniversariantes de hoje">
          <h2 className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-1.5">
            <span aria-hidden>🎂</span> Aniversariantes de hoje
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {todayBirthdays.map((p) => (
              <PersonCard
                key={p.id} person={p} onWishClick={setWishTarget}
                onClick={(person) => navigate(`/pessoas/${person.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Todos ── */}
      {!isLoading && rest.length > 0 && (
        <section aria-label="Todas as pessoas">
          {todayBirthdays.length > 0 && (
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">Todos</h2>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {rest.map((p) => (
              <PersonCard
                key={p.id} person={p} onWishClick={setWishTarget}
                onClick={(person) => navigate(`/pessoas/${person.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Vazio ── */}
      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <span className="text-4xl" aria-hidden>🔍</span>
          <p className="text-sm font-medium text-foreground">Nenhuma pessoa encontrada</p>
          <p className="text-xs text-muted-foreground">
            Tente outro nome ou remova o filtro de time.
          </p>
        </div>
      )}

      {/* ── Modal de parabéns ── */}
      <AnimatePresence>
        {wishTarget && (
          <BirthdayWishesModal
            celebrant={wishTarget}
            onClose={() => setWishTarget(null)}
          />
        )}
      </AnimatePresence>
    </main>
  )
}
