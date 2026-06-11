import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  adminGetAllAnnouncements,
  adminCreateAnnouncement,
  adminUpdateAnnouncement,
  adminDeleteAnnouncement,
  type CreateAnnouncementPayload,
  type UpdateAnnouncementPayload,
} from '@/services/announcement.service'

export function useAnnouncementsPage() {
  const queryClient = useQueryClient()

  const {
    data: announcements = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'announcements'],
    queryFn: adminGetAllAnnouncements,
    staleTime: 30_000,
  })

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'announcements'] })
    void queryClient.invalidateQueries({ queryKey: ['announcements'] })
  }

  const createMutation = useMutation({
    mutationFn: (payload: CreateAnnouncementPayload) => adminCreateAnnouncement(payload),
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAnnouncementPayload }) =>
      adminUpdateAnnouncement(id, payload),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: adminDeleteAnnouncement,
    onSuccess: invalidate,
  })

  return {
    announcements,
    isLoading,
    isError,
    refetch,
    createMutation,
    updateMutation,
    deleteMutation,
  }
}
