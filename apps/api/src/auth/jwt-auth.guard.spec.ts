import { UnauthorizedException } from '@nestjs/common';
import { jest } from '@jest/globals';

import { JwtAuthGuard } from './jwt-auth.guard.js';

describe('JwtAuthGuard', () => {
  const verifyAsyncMock = jest.fn();

  const jwtServiceMock = {
    verifyAsync: verifyAsyncMock,
  };

  let guard: JwtAuthGuard;

  function createContext(authorization?: string) {
    const request = {
      headers:
        authorization === undefined
          ? {}
          : {
              authorization,
            },
    };

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    };

    return {
      context: context as never,
      request,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();

    guard = new JwtAuthGuard(jwtServiceMock as never);
  });

  it('authenticates a customer token and attaches the role', async () => {
    verifyAsyncMock.mockResolvedValue({
      sub: 1,
      email: 'vijay@example.com',
      role: 'CUSTOMER',
    });

    const { context, request } = createContext('Bearer valid-access-token');

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(verifyAsyncMock).toHaveBeenCalledWith('valid-access-token');

    expect(request).toHaveProperty('user', {
      id: 1,
      email: 'vijay@example.com',
      role: 'CUSTOMER',
    });
  });

  it('authenticates an administrator token and attaches the role', async () => {
    verifyAsyncMock.mockResolvedValue({
      sub: 2,
      email: 'admin@example.com',
      role: 'ADMIN',
    });

    const { context, request } = createContext('Bearer admin-access-token');

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(request).toHaveProperty('user', {
      id: 2,
      email: 'admin@example.com',
      role: 'ADMIN',
    });
  });

  it('rejects a missing Authorization header', async () => {
    const { context } = createContext();

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Authentication required'),
    );

    expect(verifyAsyncMock).not.toHaveBeenCalled();
  });

  it('rejects a malformed Authorization header', async () => {
    const { context } = createContext('Basic abc123');

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Authentication required'),
    );

    expect(verifyAsyncMock).not.toHaveBeenCalled();
  });

  it('rejects an invalid or expired token', async () => {
    verifyAsyncMock.mockRejectedValue(new Error('invalid token'));

    const { context } = createContext('Bearer invalid-access-token');

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Invalid access token'),
    );
  });

  it('rejects a token with an invalid payload shape', async () => {
    verifyAsyncMock.mockResolvedValue({
      sub: '1',
      email: 'vijay@example.com',
      role: 'CUSTOMER',
    });

    const { context } = createContext('Bearer malformed-payload-token');

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Invalid access token'),
    );
  });

  it('rejects a token without a role', async () => {
    verifyAsyncMock.mockResolvedValue({
      sub: 1,
      email: 'vijay@example.com',
    });

    const { context } = createContext('Bearer missing-role-token');

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Invalid access token'),
    );
  });

  it('rejects a token with an unsupported role', async () => {
    verifyAsyncMock.mockResolvedValue({
      sub: 1,
      email: 'vijay@example.com',
      role: 'SUPER_ADMIN',
    });

    const { context } = createContext('Bearer invalid-role-token');

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Invalid access token'),
    );
  });
});
