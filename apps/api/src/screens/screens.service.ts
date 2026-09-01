import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { DATABASE } from '../database/database.constants.js';
import type { db as DatabaseClient } from '../prisma/db.js';
import { CreateScreenDto } from './dto/create-screen.dto.js';

@Injectable()
export class ScreensService {
  constructor(
    @Inject(DATABASE)
    private readonly database: typeof DatabaseClient,
  ) {}

  private async ensureVenueExists(venueId: number) {
    const venue = await this.database.orm.public.Venue.first({
      id: venueId,
    });

    if (!venue) {
      throw new NotFoundException(`Venue with id ${venueId} not found`);
    }
  }

  async create(venueId: number, createScreenDto: CreateScreenDto) {
    await this.ensureVenueExists(venueId);

    return this.database.orm.public.Screen.create({
      name: createScreenDto.name,
      venueId,
    });
  }

  async findAllByVenue(venueId: number) {
    await this.ensureVenueExists(venueId);

    return this.database.orm.public.Screen.where({
      venueId,
    }).all();
  }
}
