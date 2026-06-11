import { useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getApps } from '@/services/app.service'
import { getUserApps, getAppsWithoutAccess } from '@/utils/permissions'
import { useAuthStore } from '@/stores/auth.store'
import { useAppsStore } from '@/stores/apps.store'
import type { AppItemModel } from '@/types/models'

export function useApps() {
  const user = useAuthStore((s) => s.user)
  const favorites = useAppsStore((s) => s.favorites)
  const recent = useAppsStore((s) => s.recent)

  const {
    data: allApps = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['apps', user?.id],
    queryFn: getApps,
    enabled: !!user,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  })

  const userApps = useMemo(() => (user ? getUserApps(user, allApps) : []), [user, allApps])

  const blockedApps = useMemo(() => getAppsWithoutAccess(allApps, userApps), [allApps, userApps])

  const favoriteApps = useMemo(
    () => userApps.filter((app) => favorites.includes(app.id)),
    [userApps, favorites]
  )

  const recentApps = useMemo(
    () =>
      recent
        .map((id) => userApps.find((app) => app.id === id))
        .filter((app): app is AppItemModel => app !== undefined),
    [userApps, recent]
  )

  // Prune stale IDs from persisted store when the app list is loaded
  useEffect(() => {
    if (allApps.length > 0) {
      useAppsStore.getState().pruneStoredAppRefs(new Set(allApps.map((a) => a.id)))
    }
  }, [allApps])

  return { allApps, userApps, blockedApps, favoriteApps, recentApps, isLoading, error }
}
