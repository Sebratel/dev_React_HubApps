import { Skeleton } from '@/components/ui/skeleton'

export function AdminMetricsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4">
          <Skeleton className="h-3.5 w-24 mb-3" />
          <Skeleton className="h-8 w-14" />
        </div>
      ))}
    </div>
  )
}

export function AdminListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
          <div className="flex-1">
            <Skeleton className="h-3.5 w-32 mb-1.5" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-5 w-20 shrink-0" />
        </div>
      ))}
    </div>
  )
}
