import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';

import { UpdateSeatDto } from './dto/update-seat.dto.js';
import { SeatsService } from './seats.service.js';

@Controller('seats')
export class SeatManagementController {
  constructor(private readonly seatsService: SeatsService) {}

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.seatsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSeatDto: UpdateSeatDto,
  ) {
    return this.seatsService.update(id, updateSeatDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.seatsService.remove(id);
  }
}
