import { ConflictException, Inject, Injectable } from '@nestjs/common';

import { DATABASE } from '../database/database.constants.js';
import { isUniqueConstraintViolation } from '../database/database-error.utils.js';
import type { db as DatabaseClient } from '../prisma/db.js';

const USER_EMAIL_UNIQUE_CONSTRAINT = 'user_email_key';

type CreateUserInput = {
  email: string;
  passwordHash: string;
};

@Injectable()
export class UsersService {
  constructor(
    @Inject(DATABASE)
    private readonly database: typeof DatabaseClient,
  ) {}

  async create(input: CreateUserInput) {
    try {
      return await this.database.orm.public.User.create({
        email: input.email,
        passwordHash: input.passwordHash,
      });
    } catch (error) {
      if (isUniqueConstraintViolation(error, USER_EMAIL_UNIQUE_CONSTRAINT)) {
        throw new ConflictException(
          'An account with this email already exists',
        );
      }

      throw error;
    }
  }

  async findByEmail(email: string) {
    return this.database.orm.public.User.first({
      email,
    });
  }
}
