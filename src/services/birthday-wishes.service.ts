import { api } from '@/lib/api'

export interface BirthdayWish {
  id: string
  message: string
  createdAt: string
  from: { id: string; name: string; photoUrl: string | null }
}

export interface BirthdayCelebrant {
  id: string
  name: string
  photoUrl: string | null
  wishes: BirthdayWish[]
}

export async function getBirthdayWishes(): Promise<BirthdayCelebrant[]> {
  return api.get<BirthdayCelebrant[]>('/birthday-wishes')
}

export async function sendBirthdayWish(toUserId: string, message: string): Promise<{ id: string }> {
  return api.post<{ id: string }>('/birthday-wishes', { toUserId, message })
}
