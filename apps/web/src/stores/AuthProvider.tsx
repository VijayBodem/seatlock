import { useEffect, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'

import { ACCESS_TOKEN_STORAGE_KEY } from '../constants/auth'
import { ApiError } from '../services/api'
import {
  getCurrentUser,
  login as loginRequest,
  register as registerRequest,
} from '../services/auth.service'
import type {
  AuthContextValue,
  AuthUser,
  LoginRequest,
  RegisterRequest,
} from '../types/auth'
import { AuthContext } from './auth-context'

function getStoredAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [initialAccessToken] = useState(getStoredAccessToken)

  const [user, setUser] = useState<AuthUser | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(
    initialAccessToken,
  )
  const [isRestoring, setIsRestoring] = useState(
    initialAccessToken !== null,
  )

  useEffect(() => {
    if (!initialAccessToken) {
      return
    }

    const token = initialAccessToken
    let cancelled = false

    async function restoreSession() {
      try {
        const currentUser = await getCurrentUser(token)

        if (!cancelled) {
          setUser(currentUser)
        }
      } catch (error) {
        if (
          !cancelled &&
          error instanceof ApiError &&
          error.status === 401
        ) {
          localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
          setAccessToken(null)
          setUser(null)
        }
      } finally {
        if (!cancelled) {
          setIsRestoring(false)
        }
      }
    }

    void restoreSession()

    return () => {
      cancelled = true
    }
  }, [initialAccessToken])

  async function register(request: RegisterRequest): Promise<AuthUser> {
    return registerRequest(request)
  }

  async function login(request: LoginRequest): Promise<void> {
    const response = await loginRequest(request)

    localStorage.setItem(
      ACCESS_TOKEN_STORAGE_KEY,
      response.accessToken,
    )

    setAccessToken(response.accessToken)
    setUser({
      id: response.id,
      email: response.email,
    })
  }

  function logout() {
    localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
    setAccessToken(null)
    setUser(null)
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      isAuthenticated: user !== null,
      isRestoring,
      register,
      login,
      logout,
    }),
    [user, accessToken, isRestoring],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}