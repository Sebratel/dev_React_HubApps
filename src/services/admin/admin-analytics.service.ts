import { api } from '@/lib/api'

export type AnalyticsPeriod = '7d' | '30d' | '90d' | '1y'

export interface AppAccessItem {
  appId:     string | null
  appName:   string
  openCount: number
}

export interface DailyAccessItem {
  date:  string  // YYYY-MM-DD
  count: number
}

export interface TopUserItem {
  userId:    string
  userName:  string
  openCount: number
}

export interface AppAnalytics {
  period:        AnalyticsPeriod
  totalAccesses: number
  topApps:       AppAccessItem[]
  dailyAccesses: DailyAccessItem[]
  topUsers:      TopUserItem[]
}

export async function getAppAnalytics(period: AnalyticsPeriod = '30d'): Promise<AppAnalytics> {
  return api.get<AppAnalytics>(`/admin/analytics?period=${period}`)
}
