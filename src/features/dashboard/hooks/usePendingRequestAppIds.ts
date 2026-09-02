import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'
import { getUserAccessRequests } from '@/services/access-request.service'

export function usePendingRequestAppIds(): Set<string> {
  const user = useAuthStore((s) => s.user)

  const { data: requests = [] } = useQuery({
    queryKey: ['access-requests', 'me'],
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    queryFn: () => getUserAccessRequests(user!.id),
    enabled: !!user,
    staleTime: 60_000,
  })

  return useMemo(
    () => new Set(requests.filter((r) => r.status === 'pending').map((r) => r.appId)),
    [requests]
  )
}
