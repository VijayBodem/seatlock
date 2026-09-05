import { Body, Controller, Param, ParseIntPipe, Post } from '@nestjs/common';

import { CreateHoldDto } from './dto/create-hold.dto.js';
import { HoldsService } from './holds.service.js';

@Controller('showtimes/:showtimeId/holds')
export class HoldsController {
  constructor(private readonly holdsService: HoldsService) {}

  @Post()
  create(
    @Param('showtimeId', ParseIntPipe) showtimeId: number,
    @Body() createHoldDto: CreateHoldDto,
  ) {
    return this.holdsService.create(showtimeId, createHoldDto);
  }
}
