import { api } from '@/lib/api'

export async function fetchFavorites(): Promise<string[]> {
  const res = await api.get<{ favorites: string[] }>('/users/me/favorites')
  return res.favorites
}

export async function saveFavorites(favorites: string[]): Promise<void> {
  await api.patch<void>('/users/me/favorites', { favorites })
}
