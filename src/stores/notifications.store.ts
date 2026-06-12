import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface NotificationsState {
  announcementsLastReadAt: number
}

interface NotificationsActions {
  markAnnouncementsRead: () => void
}

export const useNotificationsStore = create<NotificationsState & NotificationsActions>()(
  persist(
    (set) => ({
      announcementsLastReadAt: 0,
      markAnnouncementsRead: () => set({ announcementsLastReadAt: Date.now() }),
    }),
    { name: 'sebratel:notifications' }
  )
)
