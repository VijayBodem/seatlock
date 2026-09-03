import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';

import { UpdateScreenDto } from './dto/update-screen.dto.js';
import { ScreensService } from './screens.service.js';

@Controller('screens')
export class ScreenManagementController {
  constructor(private readonly screensService: ScreensService) {}

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.screensService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateScreenDto: UpdateScreenDto,
  ) {
    return this.screensService.update(id, updateScreenDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.screensService.remove(id);
  }
}
