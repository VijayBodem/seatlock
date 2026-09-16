import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CreateScreenDto } from './dto/create-screen.dto.js';
import { ScreensService } from './screens.service.js';

import { AdminGuard } from '../auth/admin.guard.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
@Controller('venues/:venueId/screens')
export class ScreensController {
  constructor(private readonly screensService: ScreensService) {}

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  create(
    @Param('venueId', ParseIntPipe) venueId: number,
    @Body() createScreenDto: CreateScreenDto,
  ) {
    return this.screensService.create(venueId, createScreenDto);
  }

  @Get()
  findAll(@Param('venueId', ParseIntPipe) venueId: number) {
    return this.screensService.findAllByVenue(venueId);
  }
}
