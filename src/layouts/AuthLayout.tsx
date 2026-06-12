import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-6 sm:px-6">
      <Outlet />
    </div>
  )
}
