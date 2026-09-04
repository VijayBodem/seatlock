import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';

import { ShowtimesService } from './showtimes.service.js';

@Controller('showtimes')
export class ShowtimeManagementController {
  constructor(private readonly showtimesService: ShowtimesService) {}

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.showtimesService.findOne(id);
  }
}
