import { db } from '../prisma/db.js';

const SEED_PREFIX = 'SEED:';

type SeedSeat = {
  row: string;
  number: number;
  type: 'STANDARD' | 'PREMIUM' | 'ACCESSIBLE';
};

type SeedScreen = {
  name: string;
  seats: SeedSeat[];
};

type SeedVenue = {
  name: string;
  city: string;
  address: string;
  screens: SeedScreen[];
};

type SeedShowtime = {
  title: string;
  screenName: string;
  daysFromNow: number;
  hour: number;
  minute: number;
};

function createSeats(): SeedSeat[] {
  const seats: SeedSeat[] = [];

  for (const row of ['A', 'B', 'C', 'D']) {
    for (let number = 1; number <= 8; number += 1) {
      let type: SeedSeat['type'] = 'STANDARD';

      if (row === 'D') {
        type = 'PREMIUM';
      }

      if (row === 'A' && (number === 1 || number === 8)) {
        type = 'ACCESSIBLE';
      }

      seats.push({
        row,
        number,
        type,
      });
    }
  }

  return seats;
}

const venues: SeedVenue[] = [
  {
    name: `${SEED_PREFIX} Inox Hyderabad`,
    city: 'Hyderabad',
    address: 'Banjara Hills',
    screens: [
      {
        name: `${SEED_PREFIX} Screen 1`,
        seats: createSeats(),
      },
      {
        name: `${SEED_PREFIX} Screen 2`,
        seats: createSeats(),
      },
    ],
  },
  {
    name: `${SEED_PREFIX} PVR Bengaluru`,
    city: 'Bengaluru',
    address: 'Koramangala',
    screens: [
      {
        name: `${SEED_PREFIX} Screen 1`,
        seats: createSeats(),
      },
    ],
  },
];

const showtimes: SeedShowtime[] = [
  {
    title: `${SEED_PREFIX} Avatar`,
    screenName: `${SEED_PREFIX} Screen 1`,
    daysFromNow: 1,
    hour: 18,
    minute: 30,
  },
  {
    title: `${SEED_PREFIX} Interstellar`,
    screenName: `${SEED_PREFIX} Screen 1`,
    daysFromNow: 2,
    hour: 21,
    minute: 0,
  },
  {
    title: `${SEED_PREFIX} Dune`,
    screenName: `${SEED_PREFIX} Screen 2`,
    daysFromNow: 1,
    hour: 20,
    minute: 0,
  },
];

function createFutureTimestamp(
  daysFromNow: number,
  hour: number,
  minute: number,
): string {
  const date = new Date();

  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, minute, 0, 0);

  return date.toISOString();
}

async function removeExistingSeedData() {
  const existingShowtimes = await db.orm.public.Showtime.all();

  for (const showtime of existingShowtimes) {
    if (!showtime.title.startsWith(SEED_PREFIX)) {
      continue;
    }

    const showtimeSeats = await db.orm.public.ShowtimeSeat.where({
      showtimeId: showtime.id,
    }).all();

    for (const showtimeSeat of showtimeSeats) {
      await db.orm.public.ShowtimeSeat.where({
        id: showtimeSeat.id,
      }).delete();
    }

    await db.orm.public.Showtime.where({
      id: showtime.id,
    }).delete();
  }

  const existingScreens = await db.orm.public.Screen.all();

  for (const screen of existingScreens) {
    if (!screen.name.startsWith(SEED_PREFIX)) {
      continue;
    }

    const seats = await db.orm.public.Seat.where({
      screenId: screen.id,
    }).all();

    for (const seat of seats) {
      await db.orm.public.Seat.where({
        id: seat.id,
      }).delete();
    }

    await db.orm.public.Screen.where({
      id: screen.id,
    }).delete();
  }

  const existingVenues = await db.orm.public.Venue.all();

  for (const venue of existingVenues) {
    if (!venue.name.startsWith(SEED_PREFIX)) {
      continue;
    }

    await db.orm.public.Venue.where({
      id: venue.id,
    }).delete();
  }
}

async function createSeedData() {
  const screensByName = new Map<
    string,
    {
      id: number;
      name: string;
    }
  >();

  for (const venueDefinition of venues) {
    const venue = await db.orm.public.Venue.create({
      name: venueDefinition.name,
      city: venueDefinition.city,
      address: venueDefinition.address,
    });

    for (const screenDefinition of venueDefinition.screens) {
      const screen = await db.orm.public.Screen.create({
        name: screenDefinition.name,
        venueId: venue.id,
      });

      screensByName.set(`${venueDefinition.name}|${screenDefinition.name}`, {
        id: screen.id,
        name: screen.name,
      });

      for (const seatDefinition of screenDefinition.seats) {
        await db.orm.public.Seat.create({
          row: seatDefinition.row,
          number: seatDefinition.number,
          type: seatDefinition.type,
          screenId: screen.id,
        });
      }
    }
  }

  const hyderabadVenue = venues[0];
  const bengaluruVenue = venues[1];

  if (!hyderabadVenue || !bengaluruVenue) {
    throw new Error('Seed venue definitions are incomplete');
  }

  const showtimeAssignments = [
    {
      ...showtimes[0],
      venueName: hyderabadVenue.name,
    },
    {
      ...showtimes[1],
      venueName: bengaluruVenue.name,
    },
    {
      ...showtimes[2],
      venueName: hyderabadVenue.name,
    },
  ];

  for (const definition of showtimeAssignments) {
    if (!definition) {
      continue;
    }

    const screen = screensByName.get(
      `${definition.venueName}|${definition.screenName}`,
    );

    if (!screen) {
      throw new Error(
        `Seed screen ${definition.screenName} was not created for ${definition.venueName}`,
      );
    }

    const showtime = await db.orm.public.Showtime.create({
      title: definition.title,
      startsAt: createFutureTimestamp(
        definition.daysFromNow,
        definition.hour,
        definition.minute,
      ),
      screenId: screen.id,
    });

    const seats = await db.orm.public.Seat.where({
      screenId: screen.id,
    }).all();

    for (const seat of seats) {
      await db.orm.public.ShowtimeSeat.create({
        showtimeId: showtime.id,
        seatId: seat.id,
        status: 'AVAILABLE',
      });
    }
  }
}

async function printSummary() {
  const allVenues = await db.orm.public.Venue.all();
  const allScreens = await db.orm.public.Screen.all();
  const allSeats = await db.orm.public.Seat.all();
  const allShowtimes = await db.orm.public.Showtime.all();
  const allShowtimeSeats = await db.orm.public.ShowtimeSeat.all();

  const seedVenues = allVenues.filter((venue) =>
    venue.name.startsWith(SEED_PREFIX),
  );

  const seedVenueIds = new Set(seedVenues.map((venue) => venue.id));

  const seedScreens = allScreens.filter((screen) =>
    seedVenueIds.has(screen.venueId),
  );

  const seedScreenIds = new Set(seedScreens.map((screen) => screen.id));

  const seedSeats = allSeats.filter((seat) => seedScreenIds.has(seat.screenId));

  const seedShowtimes = allShowtimes.filter((showtime) =>
    showtime.title.startsWith(SEED_PREFIX),
  );

  const seedShowtimeIds = new Set(seedShowtimes.map((showtime) => showtime.id));

  const seedInventory = allShowtimeSeats.filter((showtimeSeat) =>
    seedShowtimeIds.has(showtimeSeat.showtimeId),
  );

  console.log('');
  console.log('SeatLock development seed complete');
  console.log(`Venues: ${seedVenues.length}`);
  console.log(`Screens: ${seedScreens.length}`);
  console.log(`Seats: ${seedSeats.length}`);
  console.log(`Showtimes: ${seedShowtimes.length}`);
  console.log(`Showtime seats: ${seedInventory.length}`);
}

async function main() {
  console.log('Refreshing SeatLock development seed data...');

  await removeExistingSeedData();
  await createSeedData();
  await printSummary();
}

main().catch((error: unknown) => {
  console.error('SeatLock seed failed');
  console.error(error);
  process.exitCode = 1;
});
