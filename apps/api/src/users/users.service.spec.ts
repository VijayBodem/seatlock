import { ConflictException } from '@nestjs/common';
import { jest } from '@jest/globals';

import { UsersService } from './users.service.js';

describe('UsersService', () => {
  const userCreateMock = jest.fn();

  const databaseMock = {
    orm: {
      public: {
        User: {
          create: userCreateMock,
        },
      },
    },
  };

  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new UsersService(databaseMock as never);
  });

  it('creates a user', async () => {
    userCreateMock.mockResolvedValue({
      id: 1,
      email: 'vijay@example.com',
      passwordHash: 'scrypt$abc$def',
      createdAt: '2026-09-07T00:00:00.000Z',
      updatedAt: '2026-09-07T00:00:00.000Z',
    });

    await expect(
      service.create({
        email: 'vijay@example.com',
        passwordHash: 'scrypt$abc$def',
      }),
    ).resolves.toEqual({
      id: 1,
      email: 'vijay@example.com',
      passwordHash: 'scrypt$abc$def',
      createdAt: '2026-09-07T00:00:00.000Z',
      updatedAt: '2026-09-07T00:00:00.000Z',
    });

    expect(userCreateMock).toHaveBeenCalledWith({
      email: 'vijay@example.com',
      passwordHash: 'scrypt$abc$def',
    });
  });

  it('maps a duplicate email database error to ConflictException', async () => {
    userCreateMock.mockRejectedValue({
      kind: 'sql_query',
      sqlState: '23505',
      constraint: 'user_email_key',
      table: 'user',
    });

    await expect(
      service.create({
        email: 'vijay@example.com',
        passwordHash: 'scrypt$abc$def',
      }),
    ).rejects.toThrow(
      new ConflictException('An account with this email already exists'),
    );
  });

  it('rethrows unrelated database errors', async () => {
    const databaseError = new Error('database unavailable');

    userCreateMock.mockRejectedValue(databaseError);

    await expect(
      service.create({
        email: 'vijay@example.com',
        passwordHash: 'scrypt$abc$def',
      }),
    ).rejects.toBe(databaseError);
  });
});
