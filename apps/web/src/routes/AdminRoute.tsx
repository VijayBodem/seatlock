import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth'

type AdminRouteProps = {
  children: ReactNode
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, isAuthenticated, isRestoring } = useAuth()

  if (isRestoring) {
    return (
      <div className="mx-auto flex min-h-64 max-w-7xl items-center justify-center px-4 sm:px-6">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Restoring session...
        </p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />
  }

  return children
}