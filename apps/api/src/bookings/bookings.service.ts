import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DATABASE } from '../database/database.constants.js';
import type { db as DatabaseClient } from '../prisma/db.js';

@Injectable()
export class BookingsService {
  constructor(
    @Inject(DATABASE)
    private readonly database: typeof DatabaseClient,
  ) {}

  async confirm(holdId: number, userId: number) {
    const now = Date.now();

    return this.database.transaction(async (tx) => {
      const hold = await tx.orm.public.SeatHold.first({
        id: holdId,
        userId,
      });

      if (!hold) {
        throw new NotFoundException(`Seat hold with id ${holdId} not found`);
      }

      if (
        hold.status !== 'ACTIVE' ||
        new Date(hold.expiresAt).getTime() <= now
      ) {
        throw new ConflictException(
          `Seat hold with id ${holdId} cannot be confirmed`,
        );
      }

      const heldSeats = await tx.orm.public.ShowtimeSeat.where({
        holdId,
        status: 'HELD',
      }).all();

      if (heldSeats.length === 0) {
        throw new ConflictException(
          `Seat hold with id ${holdId} has no held seats`,
        );
      }

      const completedHold = await tx.orm.public.SeatHold.where({
        id: holdId,
        userId,
        status: 'ACTIVE',
      }).update({
        status: 'COMPLETED',
      });

      if (!completedHold) {
        throw new ConflictException(
          `Seat hold with id ${holdId} cannot be confirmed`,
        );
      }

      const booking = await tx.orm.public.Booking.create({
        showtimeId: hold.showtimeId,
        holdId,
        userId,
      });

      const seatIds: number[] = [];

      for (const seat of heldSeats) {
        const bookedSeat = await tx.orm.public.ShowtimeSeat.where({
          id: seat.id,
          holdId,
          status: 'HELD',
        }).update({
          status: 'BOOKED',
          holdId: null,
          bookingId: booking.id,
        });

        if (!bookedSeat) {
          throw new ConflictException(
            `Seat with id ${seat.seatId} could not be booked`,
          );
        }

        seatIds.push(seat.seatId);
      }

      return {
        id: booking.id,
        showtimeId: booking.showtimeId,
        holdId: booking.holdId,
        seatIds,
        createdAt: booking.createdAt,
      };
    });
  }

  async findOne(id: number, userId: number) {
    const booking = await this.database.orm.public.Booking.first({
      id,
      userId,
    });

    if (!booking) {
      throw new NotFoundException(`Booking with id ${id} not found`);
    }

    const bookedSeats = await this.database.orm.public.ShowtimeSeat.where({
      bookingId: id,
      status: 'BOOKED',
    }).all();

    const seatIds = bookedSeats
      .map((seat) => seat.seatId)
      .sort((left, right) => left - right);

    return {
      id: booking.id,
      showtimeId: booking.showtimeId,
      holdId: booking.holdId,
      seatIds,
      createdAt: booking.createdAt,
    };
  }
}
