import { Controller, Param, ParseIntPipe, Post } from '@nestjs/common';

import { BookingsService } from './bookings.service.js';

@Controller('holds/:holdId')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post('confirm')
  confirm(@Param('holdId', ParseIntPipe) holdId: number) {
    return this.bookingsService.confirm(holdId);
  }
}
