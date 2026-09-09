import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DATABASE } from '../database/database.constants.js';
import type { db as DatabaseClient } from '../prisma/db.js';

type BookingRecord = {
  id: number;
  showtimeId: number;
  holdId: number;
  userId: number;
  createdAt: string;
};

type ShowtimeRecord = {
  id: number;
  title: string;
  startsAt: string;
  screenId: number;
};

type ScreenRecord = {
  id: number;
  name: string;
  venueId: number;
};

type VenueRecord = {
  id: number;
  name: string;
  city: string;
  address: string | null;
};

type SeatRecord = {
  id: number;
  row: string;
  number: number;
  type: string;
  screenId: number;
};

type ShowtimeSeatRecord = {
  id: number;
  showtimeId: number;
  seatId: number;
  status: string;
  bookingId: number | null;
};

function normalizeTimestamp(value: string): string {
  if (value.includes('T')) {
    return value;
  }

  return value.replace(' ', 'T');
}

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

  async findMine(userId: number) {
    const bookings = (await this.database.orm.public.Booking.where({
      userId,
    }).all()) as BookingRecord[];

    const results = [];

    for (const booking of bookings) {
      results.push(await this.buildBookingReadModel(booking));
    }

    return results.sort((left, right) => {
      const createdAtDifference =
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime();

      if (createdAtDifference !== 0) {
        return createdAtDifference;
      }

      return right.id - left.id;
    });
  }

  async findOne(id: number, userId: number) {
    const booking = (await this.database.orm.public.Booking.first({
      id,
      userId,
    })) as BookingRecord | null;

    if (!booking) {
      throw new NotFoundException(`Booking with id ${id} not found`);
    }

    return this.buildBookingReadModel(booking);
  }

  private async buildBookingReadModel(booking: BookingRecord) {
    const showtime = (await this.database.orm.public.Showtime.first({
      id: booking.showtimeId,
    })) as ShowtimeRecord | null;

    if (!showtime) {
      throw new NotFoundException(
        `Showtime with id ${booking.showtimeId} not found`,
      );
    }

    const screen = (await this.database.orm.public.Screen.first({
      id: showtime.screenId,
    })) as ScreenRecord | null;

    if (!screen) {
      throw new NotFoundException(
        `Screen with id ${showtime.screenId} not found`,
      );
    }

    const venue = (await this.database.orm.public.Venue.first({
      id: screen.venueId,
    })) as VenueRecord | null;

    if (!venue) {
      throw new NotFoundException(`Venue with id ${screen.venueId} not found`);
    }

    const bookedShowtimeSeats =
      (await this.database.orm.public.ShowtimeSeat.where({
        bookingId: booking.id,
        status: 'BOOKED',
      }).all()) as ShowtimeSeatRecord[];

    const seats = (await this.database.orm.public.Seat.where({
      screenId: showtime.screenId,
    }).all()) as SeatRecord[];

    const seatsById = new Map(seats.map((seat) => [seat.id, seat]));

    const bookedSeats = bookedShowtimeSeats
      .map((showtimeSeat) => {
        const seat = seatsById.get(showtimeSeat.seatId);

        if (!seat) {
          throw new NotFoundException(
            `Seat with id ${showtimeSeat.seatId} not found`,
          );
        }

        return {
          seatId: seat.id,
          row: seat.row,
          number: seat.number,
          type: seat.type,
        };
      })
      .sort((left, right) => {
        const rowComparison = left.row.localeCompare(right.row);

        if (rowComparison !== 0) {
          return rowComparison;
        }

        return left.number - right.number;
      });

    return {
      id: booking.id,
      showtimeId: booking.showtimeId,
      holdId: booking.holdId,
      seatIds: bookedSeats
        .map((seat) => seat.seatId)
        .sort((left, right) => {
          return left - right;
        }),
      createdAt: booking.createdAt,
      showtime: {
        title: showtime.title,
        startsAt: normalizeTimestamp(showtime.startsAt),
        screen: {
          id: screen.id,
          name: screen.name,
        },
        venue: {
          id: venue.id,
          name: venue.name,
          city: venue.city,
          address: venue.address,
        },
      },
      seats: bookedSeats,
    };
  }
}
