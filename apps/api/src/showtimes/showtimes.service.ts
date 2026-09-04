import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { DATABASE } from '../database/database.constants.js';
import type { db as DatabaseClient } from '../prisma/db.js';
import { CreateShowtimeDto } from './dto/create-showtime.dto.js';

@Injectable()
export class ShowtimesService {
  constructor(
    @Inject(DATABASE)
    private readonly database: typeof DatabaseClient,
  ) {}

  private async ensureScreenExists(screenId: number) {
    const screen = await this.database.orm.public.Screen.first({
      id: screenId,
    });

    if (!screen) {
      throw new NotFoundException(`Screen with id ${screenId} not found`);
    }
  }

  async create(screenId: number, createShowtimeDto: CreateShowtimeDto) {
    await this.ensureScreenExists(screenId);

    return this.database.orm.public.Showtime.create({
      title: createShowtimeDto.title,
      startsAt: createShowtimeDto.startsAt,
      screenId,
    });
  }

  async findAllByScreen(screenId: number) {
    await this.ensureScreenExists(screenId);

    return this.database.orm.public.Showtime.where({
      screenId,
    }).all();
  }

  async findOne(id: number) {
    const showtime = await this.database.orm.public.Showtime.first({
      id,
    });

    if (!showtime) {
      throw new NotFoundException(`Showtime with id ${id} not found`);
    }

    return showtime;
  }
}
