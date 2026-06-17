import { useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { AccessRequestModel } from '@/types/models'
import type { AccessRequestStatus } from '@/types/enums'
import { timeBucket, TIME_BUCKET_LABELS, type TimeBucket } from '@/lib/datetime'

export type StatusFilter = 'all' | AccessRequestStatus
export type SortOrder = 'recent' | 'old'

const SORT_VALUES: SortOrder[] = ['recent', 'old']
const BUCKET_ORDER: TimeBucket[] = ['today', 'week', 'older']

export interface RequestGroup {
  bucket: TimeBucket
  label: string
  items: AccessRequestModel[]
}

interface UseRequestFiltersResult {
  q: string
  status: StatusFilter
  sort: SortOrder
  setQ: (v: string) => void
  setStatus: (v: StatusFilter) => void
  setSort: (v: SortOrder) => void
  clearFilters: () => void
  hasActiveFilters: boolean
  activeFilterCount: number
  filtered: AccessRequestModel[]
  availableStatuses: AccessRequestStatus[]
  groupByTime: (items: AccessRequestModel[]) => RequestGroup[]
}

export function useRequestFilters(requests: AccessRequestModel[]): UseRequestFiltersResult {
  const [params, setParams] = useSearchParams()

  const q = params.get('q') ?? ''
  const status = (params.get('status') ?? 'all') as StatusFilter
  const sort = (SORT_VALUES.includes(params.get('sort') as SortOrder)
    ? (params.get('sort') as SortOrder)
    : 'recent')

  const patchParam = useCallback(
    (key: string, value: string, fallback: string) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (value === fallback || value === '') next.delete(key)
          else next.set(key, value)
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const setQ = useCallback((v: string) => patchParam('q', v, ''), [patchParam])
  const setStatus = useCallback((v: StatusFilter) => patchParam('status', v, 'all'), [patchParam])
  const setSort = useCallback((v: SortOrder) => patchParam('sort', v, 'recent'), [patchParam])

  const clearFilters = useCallback(() => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('q')
        next.delete('status')
        return next
      },
      { replace: true },
    )
  }, [setParams])

  const availableStatuses = useMemo(() => {
    const present = new Set<AccessRequestStatus>()
    requests.forEach((r) => present.add(r.status))
    return Array.from(present)
  }, [requests])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    const result = requests.filter((r) => {
      if (status !== 'all' && r.status !== status) return false
      if (term) {
        const haystack = `${r.appName} ${r.reason ?? ''} ${r.teamName ?? ''}`.toLowerCase()
        if (!haystack.includes(term)) return false
      }
      return true
    })
    result.sort((a, b) =>
      sort === 'recent'
        ? b.requestedAt.getTime() - a.requestedAt.getTime()
        : a.requestedAt.getTime() - b.requestedAt.getTime(),
    )
    return result
  }, [requests, q, status, sort])

  const groupByTime = useCallback(
    (items: AccessRequestModel[]): RequestGroup[] => {
      const map = new Map<TimeBucket, AccessRequestModel[]>()
      items.forEach((r) => {
        const bucket = timeBucket(r.requestedAt)
        const arr = map.get(bucket) ?? []
        arr.push(r)
        map.set(bucket, arr)
      })
      const order = sort === 'recent' ? BUCKET_ORDER : [...BUCKET_ORDER].reverse()
      return order
        .map((bucket) => ({ bucket, label: TIME_BUCKET_LABELS[bucket], items: map.get(bucket) ?? [] }))
        .filter((group) => group.items.length > 0)
    },
    [sort],
  )

  const activeFilterCount = (q.trim() ? 1 : 0) + (status !== 'all' ? 1 : 0)
  const hasActiveFilters = activeFilterCount > 0

  return {
    q, status, sort,
    setQ, setStatus, setSort,
    clearFilters, hasActiveFilters, activeFilterCount,
    filtered, availableStatuses, groupByTime,
  }
}
