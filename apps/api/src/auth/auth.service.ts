import { Injectable } from '@nestjs/common';

import { UsersService } from '../users/users.service.js';
import type { RegisterDto } from './dto/register.dto.js';
import { hashPassword } from './password.utils.js';

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const passwordHash = await hashPassword(dto.password);

    const user = await this.usersService.create({
      email,
      passwordHash,
    });

    return {
      id: user.id,
      email: user.email,
    };
  }
}
