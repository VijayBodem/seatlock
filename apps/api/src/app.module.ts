import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { BookingsModule } from './bookings/bookings.module.js';
import { DatabaseModule } from './database/database.module.js';
import { HoldsModule } from './holds/holds.module.js';
import { ScreensModule } from './screens/screens.module.js';
import { SeatsModule } from './seats/seats.module.js';
import { ShowtimesModule } from './showtimes/showtimes.module.js';
import { VenuesModule } from './venues/venues.module.js';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuthModule,
    VenuesModule,
    ScreensModule,
    SeatsModule,
    ShowtimesModule,
    HoldsModule,
    BookingsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
