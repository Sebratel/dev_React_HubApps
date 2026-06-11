import { api } from '@/lib/api'
import { PROFILE_LABEL } from '@/constants/profiles'

export interface OnlineUserItem {
  id: string
  name: string
  email: string
  photoUrl: string | null
  profile: string
  profileLabel: string
  lastHeartbeat: Date
}

interface OnlineUserRow {
  id: string
  name: string
  email: string
  photo_url: string | null
  profile: string
  last_heartbeat: string
}

export async function getOnlineUsers(): Promise<OnlineUserItem[]> {
  const rows = await api.get<OnlineUserRow[]>('/users/online')
  return rows.map((r) => ({
    id:            r.id,
    name:          r.name,
    email:         r.email,
    photoUrl:      r.photo_url,
    profile:       r.profile,
    profileLabel:  PROFILE_LABEL[r.profile] ?? r.profile,
    lastHeartbeat: new Date(r.last_heartbeat),
  }))
}
