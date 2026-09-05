import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DATABASE } from '../database/database.constants.js';
import type { db as DatabaseClient } from '../prisma/db.js';
import { CreateHoldDto } from './dto/create-hold.dto.js';

const HOLD_DURATION_MS = 5 * 60 * 1000;

@Injectable()
export class HoldsService {
  constructor(
    @Inject(DATABASE)
    private readonly database: typeof DatabaseClient,
  ) {}

  async create(showtimeId: number, createHoldDto: CreateHoldDto) {
    const showtime = await this.database.orm.public.Showtime.first({
      id: showtimeId,
    });

    if (!showtime) {
      throw new NotFoundException(`Showtime with id ${showtimeId} not found`);
    }

    const seatIds = [...createHoldDto.seatIds].sort(
      (left, right) => left - right,
    );

    const now = Date.now();

    const expiresAt = new Date(now + HOLD_DURATION_MS).toISOString();

    return this.database.transaction(async (tx) => {
      const activeHolds = await tx.orm.public.SeatHold.where({
        showtimeId,
        status: 'ACTIVE',
      }).all();

      for (const activeHold of activeHolds) {
        if (new Date(activeHold.expiresAt).getTime() > now) {
          continue;
        }

        const expiredHold = await tx.orm.public.SeatHold.where({
          id: activeHold.id,
          status: 'ACTIVE',
        }).update({
          status: 'EXPIRED',
        });

        if (!expiredHold) {
          continue;
        }

        const staleSeats = await tx.orm.public.ShowtimeSeat.where({
          holdId: activeHold.id,
          status: 'HELD',
        }).all();

        for (const staleSeat of staleSeats) {
          await tx.orm.public.ShowtimeSeat.where({
            id: staleSeat.id,
            holdId: activeHold.id,
            status: 'HELD',
          }).update({
            status: 'AVAILABLE',
            holdId: null,
          });
        }
      }

      const hold = await tx.orm.public.SeatHold.create({
        showtimeId,
        status: 'ACTIVE',
        expiresAt,
      });

      for (const seatId of seatIds) {
        const claimedSeat = await tx.orm.public.ShowtimeSeat.where({
          showtimeId,
          seatId,
          status: 'AVAILABLE',
        }).update({
          status: 'HELD',
          holdId: hold.id,
        });

        if (!claimedSeat) {
          throw new ConflictException(
            `Seat with id ${seatId} is not available for showtime ${showtimeId}`,
          );
        }
      }

      return {
        id: hold.id,
        showtimeId: hold.showtimeId,
        status: hold.status,
        expiresAt: hold.expiresAt,
        seatIds,
      };
    });
  }
}
