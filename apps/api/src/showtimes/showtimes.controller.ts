import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';

import { CreateShowtimeDto } from './dto/create-showtime.dto.js';
import { ShowtimesService } from './showtimes.service.js';

@Controller('screens/:screenId/showtimes')
export class ShowtimesController {
  constructor(private readonly showtimesService: ShowtimesService) {}

  @Post()
  create(
    @Param('screenId', ParseIntPipe) screenId: number,
    @Body() createShowtimeDto: CreateShowtimeDto,
  ) {
    return this.showtimesService.create(screenId, createShowtimeDto);
  }

  @Get()
  findAll(@Param('screenId', ParseIntPipe) screenId: number) {
    return this.showtimesService.findAllByScreen(screenId);
  }
}
