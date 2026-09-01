import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';

import { CreateScreenDto } from './dto/create-screen.dto.js';
import { ScreensService } from './screens.service.js';

@Controller('venues/:venueId/screens')
export class ScreensController {
  constructor(private readonly screensService: ScreensService) {}

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
