export type AuthUser = {
  id: number
  email: string
}

export type RegisterRequest = {
  email: string
  password: string
}

export type LoginRequest = {
  email: string
  password: string
}

export type LoginResponse = AuthUser & {
  accessToken: string
}

export type AuthContextValue = {
  user: AuthUser | null
  accessToken: string | null
  isAuthenticated: boolean
  isRestoring: boolean
  register: (request: RegisterRequest) => Promise<AuthUser>
  login: (request: LoginRequest) => Promise<void>
  logout: () => void
}