import { jest } from '@jest/globals';

import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  const usersCreateMock = jest.fn();

  const usersServiceMock = {
    create: usersCreateMock,
  };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new AuthService(usersServiceMock as never);
  });

  it('normalizes email, hashes the password, and returns only public user fields', async () => {
    usersCreateMock.mockImplementation(
      (input: { email: string; passwordHash: string }) =>
        Promise.resolve({
          id: 1,
          email: input.email,
          passwordHash: input.passwordHash,
          createdAt: '2026-09-07T00:00:00.000Z',
          updatedAt: '2026-09-07T00:00:00.000Z',
        }),
    );

    const result = await service.register({
      email: '  Vijay@Example.COM  ',
      password: 'correct horse battery staple',
    });

    expect(result).toEqual({
      id: 1,
      email: 'vijay@example.com',
    });

    expect(usersCreateMock).toHaveBeenCalledTimes(1);

    const createInput = usersCreateMock.mock.calls[0]?.[0] as {
      email: string;
      passwordHash: string;
    };

    expect(createInput.email).toBe('vijay@example.com');
    expect(createInput.passwordHash).toMatch(/^scrypt\$[^$]+\$[^$]+$/);
    expect(createInput.passwordHash).not.toContain(
      'correct horse battery staple',
    );

    expect(result).not.toHaveProperty('passwordHash');
  });
});
