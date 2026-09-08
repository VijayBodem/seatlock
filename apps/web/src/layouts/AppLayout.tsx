import { Outlet } from 'react-router-dom'

import { AppHeader } from '../components/common/AppHeader'

export function AppLayout() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 transition-colors dark:bg-zinc-950 dark:text-zinc-100">
      <AppHeader />

      <main>
        <Outlet />
      </main>
    </div>
  )
}