import { api } from '@/lib/api'

export interface ProfileDistributionItem {
  profile: string
  count: number
}

export interface TopAppItem {
  appName: string
  openCount: number
}

export interface AdminStats {
  profileDistribution: ProfileDistributionItem[]
  topApps: TopAppItem[]
  pendingSuggestions: number
  pendingRequests: number
  inactiveUsers: number
  teams: { active: number; total: number }
  announcements: { active: number; total: number }
}

export async function getAdminStats(): Promise<AdminStats> {
  return api.get<AdminStats>('/admin/stats')
}
