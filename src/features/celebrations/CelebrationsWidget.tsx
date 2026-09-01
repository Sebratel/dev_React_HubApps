import { useQuery } from '@tanstack/react-query'
import { Gift, Loader2 } from 'lucide-react'
import { UserAvatar } from '@/components/UserAvatar'
import { getCelebrations } from '@/services/kudos.service'
import type { CelebrationItem } from '@/services/kudos.service'

// ─── Celebration row ──────────────────────────────────────────────────────────

function CelebrationRow({ item }: { item: CelebrationItem }) {
  const firstName = item.name.split(' ')[0]
  const labels: string[] = []

  if (item.isBirthday) {
    labels.push('🎂 Aniversário')
  }
  if (item.isAnniversary && item.anniversaryYears) {
    const n = item.anniversaryYears
    labels.push(`🎉 ${n} ano${n !== 1 ? 's' : ''} de empresa`)
  }

  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <UserAvatar name={item.name} photoUrl={item.photoUrl} size="xs" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground truncate">{firstName}</p>
        <p className="text-xs text-muted-foreground">{labels.join(' · ')}</p>
      </div>
    </li>
  )
}

// ─── Widget ───────────────────────────────────────────────────────────────────

export function CelebrationsWidget() {
  const { data: celebrations = [], isLoading } = useQuery({
    queryKey:  ['celebrations', 'today'],
    queryFn:   getCelebrations,
    staleTime: 60 * 60_000, // 1h — muda no máximo uma vez por dia
  })

  return (
    <div className="rounded-2xl border border-border bg-card flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900/30">
          <Gift className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" aria-hidden />
        </div>
        <h2 className="text-sm font-semibold text-foreground">Celebrações</h2>
        {celebrations.length > 0 && (
          <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {celebrations.length}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 min-h-[200px] flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
          </div>
        ) : celebrations.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 py-10 text-center px-5">
            <span className="text-3xl select-none" aria-hidden>📅</span>
            <p className="text-sm font-medium text-foreground">Nenhuma celebração hoje</p>
            <p className="text-xs text-muted-foreground leading-snug">
              Aniversários e datas de empresa aparecem aqui
            </p>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border" role="list" aria-label="Celebrações do dia">
            {celebrations.map((item) => (
              <CelebrationRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
