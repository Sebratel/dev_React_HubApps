import { useQuery } from '@tanstack/react-query'
import { getAnnouncements } from '@/services/announcement.service'

export function useAnnouncements() {
  return useQuery({
    queryKey: ['announcements'],
    queryFn: getAnnouncements,
    staleTime: 60_000,
  })
}
