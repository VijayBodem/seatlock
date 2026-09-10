import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { DATABASE } from '../database/database.constants.js';
import { HoldsService } from '../holds/holds.service.js';
import type { db as DatabaseClient } from '../prisma/db.js';

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
  price: number;
};

function normalizeTimestamp(value: string): string {
  if (value.includes('T')) {
    return value;
  }

  return value.replace(' ', 'T');
}

@Injectable()
export class ShowtimeDiscoveryService {
  constructor(
    @Inject(DATABASE)
    private readonly database: typeof DatabaseClient,
    private readonly holdsService: HoldsService,
  ) {}

  async findAll() {
    const showtimes =
      (await this.database.orm.public.Showtime.all()) as ShowtimeRecord[];

    const now = Date.now();

    const upcomingShowtimes = showtimes.filter(
      (showtime) => Date.parse(normalizeTimestamp(showtime.startsAt)) > now,
    );

    for (const showtime of upcomingShowtimes) {
      await this.holdsService.expireStaleHolds(showtime.id);
    }

    const screens =
      (await this.database.orm.public.Screen.all()) as ScreenRecord[];

    const venues =
      (await this.database.orm.public.Venue.all()) as VenueRecord[];

    const showtimeSeats =
      (await this.database.orm.public.ShowtimeSeat.all()) as ShowtimeSeatRecord[];

    const screensById = new Map(screens.map((screen) => [screen.id, screen]));
    const venuesById = new Map(venues.map((venue) => [venue.id, venue]));

    const availableSeatCounts = new Map<number, number>();

    for (const showtimeSeat of showtimeSeats) {
      if (showtimeSeat.status !== 'AVAILABLE') {
        continue;
      }

      availableSeatCounts.set(
        showtimeSeat.showtimeId,
        (availableSeatCounts.get(showtimeSeat.showtimeId) ?? 0) + 1,
      );
    }

    return upcomingShowtimes
      .map((showtime) => {
        const screen = screensById.get(showtime.screenId);

        if (!screen) {
          throw new NotFoundException(
            `Screen with id ${showtime.screenId} not found`,
          );
        }

        const venue = venuesById.get(screen.venueId);

        if (!venue) {
          throw new NotFoundException(
            `Venue with id ${screen.venueId} not found`,
          );
        }

        return {
          id: showtime.id,
          title: showtime.title,
          startsAt: normalizeTimestamp(showtime.startsAt),
          availableSeats: availableSeatCounts.get(showtime.id) ?? 0,
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
        };
      })
      .sort(
        (left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt),
      );
  }

  async findOne(id: number) {
    const showtime = (await this.database.orm.public.Showtime.first({
      id,
    })) as ShowtimeRecord | null;

    if (!showtime) {
      throw new NotFoundException(`Showtime with id ${id} not found`);
    }

    await this.holdsService.expireStaleHolds(id);

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

    const showtimeSeats = (await this.database.orm.public.ShowtimeSeat.where({
      showtimeId: id,
    }).all()) as ShowtimeSeatRecord[];

    return {
      id: showtime.id,
      title: showtime.title,
      startsAt: normalizeTimestamp(showtime.startsAt),
      availableSeats: showtimeSeats.filter(
        (showtimeSeat) => showtimeSeat.status === 'AVAILABLE',
      ).length,
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
    };
  }

  async findSeats(id: number) {
    const showtime = (await this.database.orm.public.Showtime.first({
      id,
    })) as ShowtimeRecord | null;

    if (!showtime) {
      throw new NotFoundException(`Showtime with id ${id} not found`);
    }

    await this.holdsService.expireStaleHolds(id);

    const showtimeSeats = (await this.database.orm.public.ShowtimeSeat.where({
      showtimeId: id,
    }).all()) as ShowtimeSeatRecord[];

    const seats = (await this.database.orm.public.Seat.where({
      screenId: showtime.screenId,
    }).all()) as SeatRecord[];

    const seatsById = new Map(seats.map((seat) => [seat.id, seat]));

    return showtimeSeats
      .map((showtimeSeat) => {
        const seat = seatsById.get(showtimeSeat.seatId);

        if (!seat) {
          throw new NotFoundException(
            `Seat with id ${showtimeSeat.seatId} not found`,
          );
        }

        return {
          id: showtimeSeat.id,
          seatId: seat.id,
          row: seat.row,
          number: seat.number,
          type: seat.type,
          status: showtimeSeat.status,
          price: showtimeSeat.price,
        };
      })
      .sort((left, right) => {
        const rowComparison = left.row.localeCompare(right.row);

        if (rowComparison !== 0) {
          return rowComparison;
        }

        return left.number - right.number;
      });
  }
}
