import { Skeleton } from '@/components/ui/skeleton'

/** Loading placeholder mirroring the real wide-card layout. */
export function SuggestionsListSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 pl-6">
          <span className="absolute inset-y-0 left-0 w-1 bg-muted" />
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <Skeleton className="h-5 w-28 rounded-full" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="mt-4 h-5 w-2/3" />
          <Skeleton className="mt-2 h-3.5 w-full" />
          <Skeleton className="mt-4 h-3 w-32" />
        </div>
      ))}
    </div>
  )
}
