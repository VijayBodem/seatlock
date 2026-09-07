import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { AuthenticatedRequest } from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { BookingsService } from './bookings.service.js';

@Controller()
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post('holds/:holdId/confirm')
  @UseGuards(JwtAuthGuard)
  confirm(
    @Param('holdId', ParseIntPipe) holdId: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.bookingsService.confirm(holdId, request.user.id);
  }

  @Get('bookings/me')
  @UseGuards(JwtAuthGuard)
  findMine(@Req() request: AuthenticatedRequest) {
    return this.bookingsService.findMine(request.user.id);
  }

  @Get('bookings/:id')
  @UseGuards(JwtAuthGuard)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.bookingsService.findOne(id, request.user.id);
  }
}
