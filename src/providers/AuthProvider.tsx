import { type ReactNode } from 'react'
import { useAuthSession } from '@/hooks/useAuthSession'

interface AuthProviderProps {
  children: ReactNode
}

// Wraps the app and bootstraps the Firebase auth subscription.
// Must be rendered above <RouterProvider> so guards can read store state.
export function AuthProvider({ children }: AuthProviderProps) {
  useAuthSession()
  return <>{children}</>
}
