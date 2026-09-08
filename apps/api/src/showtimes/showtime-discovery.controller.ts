import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';

import { ShowtimeDiscoveryService } from './showtime-discovery.service.js';

@Controller('discovery/showtimes')
export class ShowtimeDiscoveryController {
  constructor(
    private readonly showtimeDiscoveryService: ShowtimeDiscoveryService,
  ) {}

  @Get()
  findAll() {
    return this.showtimeDiscoveryService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.showtimeDiscoveryService.findOne(id);
  }

  @Get(':id/seats')
  findSeats(@Param('id', ParseIntPipe) id: number) {
    return this.showtimeDiscoveryService.findSeats(id);
  }
}
