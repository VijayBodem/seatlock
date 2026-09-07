import { UnauthorizedException } from '@nestjs/common';
import { jest } from '@jest/globals';

import { AuthService } from './auth.service.js';
import { hashPassword } from './password.utils.js';

describe('AuthService', () => {
  const usersCreateMock = jest.fn();
  const usersFindByEmailMock = jest.fn();
  const signAsyncMock = jest.fn();

  const usersServiceMock = {
    create: usersCreateMock,
    findByEmail: usersFindByEmailMock,
  };

  const jwtServiceMock = {
    signAsync: signAsyncMock,
  };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new AuthService(
      usersServiceMock as never,
      jwtServiceMock as never,
    );
  });

  describe('register', () => {
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
      expect(signAsyncMock).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('returns an access token for valid credentials', async () => {
      const password = 'correct horse battery staple';
      const passwordHash = await hashPassword(password);

      usersFindByEmailMock.mockResolvedValue({
        id: 1,
        email: 'vijay@example.com',
        passwordHash,
        createdAt: '2026-09-07T00:00:00.000Z',
        updatedAt: '2026-09-07T00:00:00.000Z',
      });

      signAsyncMock.mockResolvedValue('signed-access-token');

      const result = await service.login({
        email: '  Vijay@Example.COM  ',
        password,
      });

      expect(usersFindByEmailMock).toHaveBeenCalledWith('vijay@example.com');

      expect(signAsyncMock).toHaveBeenCalledWith({
        sub: 1,
        email: 'vijay@example.com',
      });

      expect(result).toEqual({
        id: 1,
        email: 'vijay@example.com',
        accessToken: 'signed-access-token',
      });

      expect(result).not.toHaveProperty('passwordHash');
    });

    it('throws UnauthorizedException when the user does not exist', async () => {
      usersFindByEmailMock.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'missing@example.com',
          password: 'correct horse battery staple',
        }),
      ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));

      expect(signAsyncMock).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when the password is incorrect', async () => {
      const passwordHash = await hashPassword('correct horse battery staple');

      usersFindByEmailMock.mockResolvedValue({
        id: 1,
        email: 'vijay@example.com',
        passwordHash,
        createdAt: '2026-09-07T00:00:00.000Z',
        updatedAt: '2026-09-07T00:00:00.000Z',
      });

      await expect(
        service.login({
          email: 'vijay@example.com',
          password: 'wrong password value',
        }),
      ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));

      expect(signAsyncMock).not.toHaveBeenCalled();
    });
  });
});
