import { Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';

import { BookingsService } from './bookings.service.js';

@Controller()
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post('holds/:holdId/confirm')
  confirm(@Param('holdId', ParseIntPipe) holdId: number) {
    return this.bookingsService.confirm(holdId);
  }

  @Get('bookings/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.bookingsService.findOne(id);
  }
}
