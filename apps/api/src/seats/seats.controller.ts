import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CreateSeatDto } from './dto/create-seat.dto.js';
import { SeatsService } from './seats.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { AdminGuard } from '../auth/admin.guard.js';

@Controller('screens/:screenId/seats')
export class SeatsController {
  constructor(private readonly seatsService: SeatsService) {}

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  create(
    @Param('screenId', ParseIntPipe) screenId: number,
    @Body() createSeatDto: CreateSeatDto,
  ) {
    return this.seatsService.create(screenId, createSeatDto);
  }

  @Get()
  findAll(@Param('screenId', ParseIntPipe) screenId: number) {
    return this.seatsService.findAllByScreen(screenId);
  }
}
