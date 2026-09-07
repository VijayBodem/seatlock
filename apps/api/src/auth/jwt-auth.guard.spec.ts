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

  it('authenticates a valid bearer token and attaches the user', async () => {
    verifyAsyncMock.mockResolvedValue({
      sub: 1,
      email: 'vijay@example.com',
    });

    const { context, request } = createContext('Bearer valid-access-token');

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(verifyAsyncMock).toHaveBeenCalledWith('valid-access-token');

    expect(request).toHaveProperty('user', {
      id: 1,
      email: 'vijay@example.com',
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
    });

    const { context } = createContext('Bearer malformed-payload-token');

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Invalid access token'),
    );
  });
});
