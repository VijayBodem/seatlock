import type { Request } from 'express';

export type UserRole = 'CUSTOMER' | 'ADMIN';

export type AuthUser = {
  id: number;
  email: string;
  role: UserRole;
};

export type AccessTokenPayload = {
  sub: number;
  email: string;
  role: UserRole;
};

export type AuthenticatedRequest = Request & {
  user: AuthUser;
};
