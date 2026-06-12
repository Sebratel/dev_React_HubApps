import { useEffect, useRef } from 'react'
import { useAppsStore } from '@/stores/apps.store'
import { fetchFavorites, saveFavorites } from '@/services/favorites.service'

export function useFavoritesSync() {
  const favorites = useAppsStore((s) => s.favorites)
  const setFavorites = useAppsStore((s) => s.setFavorites)
  const readyRef = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load from server once on mount; if server is empty, migrate localStorage → server
  useEffect(() => {
    let cancelled = false
    fetchFavorites()
      .then((serverFavs) => {
        if (cancelled) return
        if (serverFavs.length > 0) {
          setFavorites(serverFavs)
        } else {
          const localFavs = useAppsStore.getState().favorites
          if (localFavs.length > 0) {
            saveFavorites(localFavs).catch(() => {})
          }
        }
        readyRef.current = true
      })
      .catch(() => {
        if (!cancelled) readyRef.current = true
      })
    return () => { cancelled = true }
  }, [setFavorites])

  // Sync to server (debounced) on every change — only after initial load
  useEffect(() => {
    if (!readyRef.current) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveFavorites(favorites).catch((err) => {
        console.warn('[favorites] sync failed:', err)
      })
    }, 600)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [favorites])
}
