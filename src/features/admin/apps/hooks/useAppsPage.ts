import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createApp,
  deactivateApp,
  listAllApps,
  reactivateApp,
  updateApp,
} from '@/services/admin/admin-app.service'
import type { CreateAppPayload, UpdateAppPayload } from '@/services/admin/admin-app.service'

export interface AppFilters {
  search: string
  status: 'all' | 'active' | 'inactive'
  passToken: 'all' | 'yes' | 'no'
}

const DEFAULT_FILTERS: AppFilters = {
  search: '',
  status: 'all',
  passToken: 'all',
}

export function useAppsPage() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<AppFilters>(DEFAULT_FILTERS)

  const { data: apps = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'apps', 'list'],
    queryFn: listAllApps,
    staleTime: 60_000,
  })

  const filteredApps = useMemo(() => {
    return apps.filter(app => {
      if (filters.status === 'active' && app.status !== 'active') return false
      if (filters.status === 'inactive' && app.status === 'active') return false
      if (filters.passToken === 'yes' && !app.passToken) return false
      if (filters.passToken === 'no' && app.passToken) return false
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (
          !app.name.toLowerCase().includes(q) &&
          !(app.description ?? '').toLowerCase().includes(q) &&
          !(app.url ?? '').toLowerCase().includes(q)
        )
          return false
      }
      return true
    })
  }, [apps, filters])

  function invalidateApps() {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'apps'] })
  }

  const createMutation = useMutation({
    mutationFn: (payload: CreateAppPayload) => createApp(payload),
    onSuccess: invalidateApps,
  })

  const updateMutation = useMutation({
    mutationFn: ({ appId, payload }: { appId: string; payload: UpdateAppPayload }) =>
      updateApp(appId, payload),
    onSuccess: invalidateApps,
  })

  const deactivateMutation = useMutation({
    mutationFn: deactivateApp,
    onSuccess: invalidateApps,
  })

  const reactivateMutation = useMutation({
    mutationFn: reactivateApp,
    onSuccess: invalidateApps,
  })

  const hasFilters =
    filters.search !== '' || filters.status !== 'all' || filters.passToken !== 'all'

  return {
    apps: filteredApps,
    totalApps: apps.length,
    isLoading,
    isError,
    refetch,
    filters,
    setFilters,
    hasFilters,
    createMutation,
    updateMutation,
    deactivateMutation,
    reactivateMutation,
  }
}
