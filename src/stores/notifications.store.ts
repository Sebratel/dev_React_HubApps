import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Read/unread state for announcements.
 *
 * NOTE: The backend currently has no per-announcement read endpoint
 * (`GET /announcements` returns the list; there is no `read` flag nor a
 * `PATCH .../read` route). Read state is therefore tracked client-side and
 * persisted locally. When a backend endpoint becomes available, replace
 * `markRead`/`markManyRead` with the API calls and hydrate
 * `readAnnouncementIds` from the server response — the UI already consumes
 * these via a stable interface.
 */
interface NotificationsState {
  readAnnouncementIds: string[]
}

interface NotificationsActions {
  markRead: (id: string) => void
  markUnread: (id: string) => void
  markManyRead: (ids: string[]) => void
}

export const useNotificationsStore = create<NotificationsState & NotificationsActions>()(
  persist(
    (set) => ({
      readAnnouncementIds: [],
      markRead: (id) =>
        set((s) =>
          s.readAnnouncementIds.includes(id)
            ? s
            : { readAnnouncementIds: [...s.readAnnouncementIds, id] },
        ),
      markUnread: (id) =>
        set((s) => ({ readAnnouncementIds: s.readAnnouncementIds.filter((x) => x !== id) })),
      markManyRead: (ids) =>
        set((s) => {
          const merged = new Set(s.readAnnouncementIds)
          ids.forEach((id) => merged.add(id))
          return { readAnnouncementIds: Array.from(merged) }
        }),
    }),
    { name: 'sebratel:notifications', version: 2 },
  ),
)
