import { Navigate, Route, Routes } from 'react-router-dom'

import { AppLayout } from '../layouts/AppLayout'
import { HomePage } from '../pages/HomePage'
import { ShowtimeSeatsPage } from '../pages/ShowtimeSeatsPage'
import { ShowtimesPage } from '../pages/ShowtimesPage'
import { LoginPage } from '../pages/auth/LoginPage'
import { RegisterPage } from '../pages/auth/RegisterPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="showtimes" element={<ShowtimesPage />} />
        <Route path="showtimes/:id" element={<ShowtimeSeatsPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}