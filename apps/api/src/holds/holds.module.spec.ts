import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AuthModule } from '../auth/auth.module.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { UsersService } from '../users/users.service.js';

@Module({
  imports: [AuthModule],
  providers: [JwtAuthGuard],
})
class JwtGuardConsumerModule {}

describe('JWT guard module wiring', () => {
  it('resolves JwtAuthGuard from a consuming module', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [JwtGuardConsumerModule],
    })
      .overrideProvider(UsersService)
      .useValue({})
      .compile();

    expect(moduleRef.get(JwtAuthGuard)).toBeInstanceOf(JwtAuthGuard);

    await moduleRef.close();
  });
});
