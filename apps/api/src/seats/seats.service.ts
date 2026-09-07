import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DATABASE } from '../database/database.constants.js';
import { isUniqueConstraintViolation } from '../database/database-error.utils.js';
import type { db as DatabaseClient } from '../prisma/db.js';
import { CreateSeatDto } from './dto/create-seat.dto.js';
import { UpdateSeatDto } from './dto/update-seat.dto.js';

const SEAT_POSITION_UNIQUE_CONSTRAINT = 'seat_screenId_row_number_key';

@Injectable()
export class SeatsService {
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

  async create(screenId: number, createSeatDto: CreateSeatDto) {
    await this.ensureScreenExists(screenId);

    const existingSeat = await this.database.orm.public.Seat.first({
      screenId,
      row: createSeatDto.row,
      number: createSeatDto.number,
    });

    if (existingSeat) {
      throw new ConflictException(
        `Seat ${createSeatDto.row}${createSeatDto.number} already exists for screen ${screenId}`,
      );
    }

    try {
      return await this.database.orm.public.Seat.create({
        row: createSeatDto.row,
        number: createSeatDto.number,
        type: createSeatDto.type,
        screenId,
      });
    } catch (error) {
      if (isUniqueConstraintViolation(error, SEAT_POSITION_UNIQUE_CONSTRAINT)) {
        throw new ConflictException(
          `Seat ${createSeatDto.row}${createSeatDto.number} already exists for screen ${screenId}`,
        );
      }

      throw error;
    }
  }

  async findAllByScreen(screenId: number) {
    await this.ensureScreenExists(screenId);

    return this.database.orm.public.Seat.where({
      screenId,
    }).all();
  }

  async findOne(id: number) {
    const seat = await this.database.orm.public.Seat.first({
      id,
    });

    if (!seat) {
      throw new NotFoundException(`Seat with id ${id} not found`);
    }

    return seat;
  }

  async update(id: number, updateSeatDto: UpdateSeatDto) {
    const seat = await this.findOne(id);

    const row = updateSeatDto.row ?? seat.row;
    const number = updateSeatDto.number ?? seat.number;

    const conflictingSeat = await this.database.orm.public.Seat.first({
      screenId: seat.screenId,
      row,
      number,
    });

    if (conflictingSeat && conflictingSeat.id !== id) {
      throw new ConflictException(
        `Seat ${row}${number} already exists for screen ${seat.screenId}`,
      );
    }

    try {
      return await this.database.orm.public.Seat.where({ id }).update(
        updateSeatDto,
      );
    } catch (error) {
      if (isUniqueConstraintViolation(error, SEAT_POSITION_UNIQUE_CONSTRAINT)) {
        throw new ConflictException(
          `Seat ${row}${number} already exists for screen ${seat.screenId}`,
        );
      }

      throw error;
    }
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.database.orm.public.Seat.where({ id }).delete();
  }
}
