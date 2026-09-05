import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { VenuesModule } from './venues/venues.module.js';
import { ScreensModule } from './screens/screens.module.js';
import { SeatsModule } from './seats/seats.module.js';
import { ShowtimesModule } from './showtimes/showtimes.module.js';
import { HoldsModule } from './holds/holds.module.js';

@Module({
  imports: [
    DatabaseModule,
    VenuesModule,
    ScreensModule,
    SeatsModule,
    ShowtimesModule,
    HoldsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
