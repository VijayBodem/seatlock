import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { DATABASE } from '../database/database.constants.js';
import type { db as DatabaseClient } from '../prisma/db.js';
import { HoldsService } from '../holds/holds.service.js';
import { CreateShowtimeDto } from './dto/create-showtime.dto.js';
import { UpdateShowtimeDto } from './dto/update-showtime.dto.js';

@Injectable()
export class ShowtimesService {
  constructor(
    @Inject(DATABASE)
    private readonly database: typeof DatabaseClient,
    private readonly holdsService: HoldsService,
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

    return this.database.transaction(async (tx) => {
      const showtime = await tx.orm.public.Showtime.create({
        title: createShowtimeDto.title,
        startsAt: createShowtimeDto.startsAt,
        screenId,
      });

      const seats = await tx.orm.public.Seat.where({
        screenId,
      }).all();

      for (const seat of seats) {
        await tx.orm.public.ShowtimeSeat.create({
          showtimeId: showtime.id,
          seatId: seat.id,
          status: 'AVAILABLE',
        });
      }

      return showtime;
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

  async findSeats(id: number) {
    await this.findOne(id);

    await this.holdsService.expireStaleHolds(id);

    return this.database.orm.public.ShowtimeSeat.where({
      showtimeId: id,
    }).all();
  }
  async update(id: number, updateShowtimeDto: UpdateShowtimeDto) {
    await this.findOne(id);

    return this.database.orm.public.Showtime.where({ id }).update(
      updateShowtimeDto,
    );
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.database.orm.public.Showtime.where({ id }).delete();
  }
}
