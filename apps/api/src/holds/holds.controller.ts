import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { AuthenticatedRequest } from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CreateHoldDto } from './dto/create-hold.dto.js';
import { HoldsService } from './holds.service.js';

@Controller('showtimes/:showtimeId/holds')
export class HoldsController {
  constructor(private readonly holdsService: HoldsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Param('showtimeId', ParseIntPipe) showtimeId: number,
    @Body() createHoldDto: CreateHoldDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.holdsService.create(showtimeId, createHoldDto, request.user.id);
  }
}
