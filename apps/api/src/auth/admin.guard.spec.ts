import { ForbiddenException } from '@nestjs/common';

import { AdminGuard } from './admin.guard.js';

describe('AdminGuard', () => {
  const guard = new AdminGuard();

  function createContext(role: 'CUSTOMER' | 'ADMIN') {
    const request = {
      user: {
        id: 1,
        email: 'user@example.com',
        role,
      },
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as never;
  }

  it('allows an administrator', () => {
    expect(guard.canActivate(createContext('ADMIN'))).toBe(true);
  });

  it('rejects an authenticated customer', () => {
    expect(() => guard.canActivate(createContext('CUSTOMER'))).toThrow(
      new ForbiddenException('Administrator access required'),
    );
  });
});
