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

  async create(
    showtimeId: number,
    createHoldDto: CreateHoldDto,
    userId: number,
  ) {
    const showtime = await this.database.orm.public.Showtime.first({
      id: showtimeId,
    });

    if (!showtime) {
      throw new NotFoundException(`Showtime with id ${showtimeId} not found`);
    }

    await this.expireStaleHolds(showtimeId);

    const seatIds = [...createHoldDto.seatIds].sort(
      (left, right) => left - right,
    );

    const expiresAt = new Date(Date.now() + HOLD_DURATION_MS).toISOString();

    return this.database.transaction(async (tx) => {
      const hold = await tx.orm.public.SeatHold.create({
        showtimeId,
        userId,
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

  async expireStaleHolds(showtimeId: number) {
    await this.expireActiveHolds(showtimeId);
  }

  async expireAllStaleHolds() {
    await this.expireActiveHolds();
  }

  private async expireActiveHolds(showtimeId?: number) {
    const now = Date.now();

    await this.database.transaction(async (tx) => {
      const activeHolds =
        showtimeId === undefined
          ? await tx.orm.public.SeatHold.where({
              status: 'ACTIVE',
            }).all()
          : await tx.orm.public.SeatHold.where({
              showtimeId,
              status: 'ACTIVE',
            }).all();

      for (const hold of activeHolds) {
        if (new Date(hold.expiresAt).getTime() > now) {
          continue;
        }

        const expiredHold = await tx.orm.public.SeatHold.where({
          id: hold.id,
          status: 'ACTIVE',
        }).update({
          status: 'EXPIRED',
        });

        if (!expiredHold) {
          continue;
        }

        const heldSeats = await tx.orm.public.ShowtimeSeat.where({
          holdId: hold.id,
          status: 'HELD',
        }).all();

        for (const seat of heldSeats) {
          await tx.orm.public.ShowtimeSeat.where({
            id: seat.id,
            holdId: hold.id,
            status: 'HELD',
          }).update({
            status: 'AVAILABLE',
            holdId: null,
          });
        }
      }
    });
  }
}
