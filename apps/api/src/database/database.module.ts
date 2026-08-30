import { Global, Module } from '@nestjs/common';
import { db } from '../prisma/db.js';
import { DATABASE } from './database.constants.js';

@Global()
@Module({
  providers: [
    {
      provide: DATABASE,
      useValue: db,
    },
  ],
  exports: [DATABASE],
})
export class DatabaseModule {}
