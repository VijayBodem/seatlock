import {
  Inject,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { DATABASE } from '../database/database.constants.js';
import type { db as DatabaseClient } from '../prisma/db.js';
import { CreateVenueDto } from './dto/create-venue.dto.js';
import { UpdateVenueDto } from './dto/update-venue.dto.js';

@Injectable()
export class VenuesService {
  constructor(
    @Inject(DATABASE)
    private readonly database: typeof DatabaseClient,
  ) {}

  private async ensureVenueHasNoScreens(venueId: number) {
    const screen = await this.database.orm.public.Screen.first({
      venueId,
    });

    if (screen) {
      throw new ConflictException(
        `Venue with id ${venueId} cannot be deleted because it has screens`,
      );
    }
  }

  async create(createVenueDto: CreateVenueDto) {
    return this.database.orm.public.Venue.create({
      name: createVenueDto.name,
      city: createVenueDto.city,
      address: createVenueDto.address,
    });
  }

  async findAll() {
    return this.database.orm.public.Venue.all();
  }

  async findOne(id: number) {
    const venue = await this.database.orm.public.Venue.first({ id });

    if (!venue) {
      throw new NotFoundException(`Venue with id ${id} not found`);
    }

    return venue;
  }

  async update(id: number, updateVenueDto: UpdateVenueDto) {
    await this.findOne(id);

    return this.database.orm.public.Venue.where({ id }).update(updateVenueDto);
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.ensureVenueHasNoScreens(id);

    return this.database.orm.public.Venue.where({ id }).delete();
  }
}
