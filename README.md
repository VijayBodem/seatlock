# SeatLock

SeatLock is a full-stack real-time seat reservation and booking platform built to demonstrate the design and implementation of a modern transactional web application.

The project focuses on one of the more interesting problems in booking systems: allowing multiple users to view the same seat inventory while preventing the same seat from being reserved or booked concurrently.

SeatLock includes customer booking flows, temporary seat holds, real-time seat availability updates, payment processing, role-based administration, and transactional booking logic.

## Features

### Customer

- User registration and authentication
- Browse upcoming showtimes
- Navigate directly to showtime discovery from the application header
- View venue and screen information
- View real-time seat availability
- Select one or more seats
- Temporarily hold selected seats
- Automatic expiration of stale holds
- Stripe payment workflow
- Confirm bookings
- View personal booking history
- Real-time seat status updates between connected clients
- Switch between English, Hindi, and Telugu
- Use light or dark theme

### Administration

Administrators can manage:

- Venues
- Screens
- Seats
- Showtimes

The administrative interface follows the same application-wide localization and theme system as the customer interface. Venue, screen, seat, and showtime management support English, Hindi, and Telugu and work in both light and dark themes.

Administrative routes are protected using JWT authentication and role-based authorization.

Deletion rules protect historical booking and hold data from destructive administrative operations.

## Technology Stack

### Frontend

- React
- TypeScript
- Vite
- React Router
- Tailwind CSS
- Socket.IO Client
- Stripe.js / React Stripe.js
- i18next

### Backend

- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL
- Socket.IO
- Redis
- Kafka
- Stripe
- JWT authentication
- NestJS Scheduler

## Localization and Themes

SeatLock supports application-wide internationalization using i18next.

The web application currently supports:

- English (`en`)
- Hindi (`hi`)
- Telugu (`te`)

Localization is applied across both customer and administrative workflows, including navigation, authentication, showtime discovery, booking history, and venue, screen, seat, and showtime management.

The frontend also supports light and dark themes. Theme-aware styling is applied consistently across customer and administrative interfaces.

### Testing and Quality

- Jest
- Supertest
- ESLint
- Prettier
- TypeScript

## Repository Structure

```text
seatlock/
├── apps/
│   ├── api/        # NestJS backend
│   └── web/        # React frontend
├── docs/           # Architecture and project documentation
├── package.json
└── README.md
```

The project is organized primarily around business features rather than separating the entire application into generic technical layers.

## Core Booking Flow

A typical SeatLock booking follows this sequence:

```text
Discover Showtime
       |
       v
View Seat Inventory
       |
       v
Select Seats
       |
       v
Create Temporary Hold
       |
       v
Seats become HELD
       |
       +----------------------+
       |                      |
       v                      v
Payment succeeds        Hold expires
       |                      |
       v                      v
Create Booking          Seats AVAILABLE
       |
       v
Seats become BOOKED
```

Seat holds are persisted transactionally. A hold has an expiration time, and stale holds are periodically cleaned up so that seats become available again when a customer does not complete the booking.

## Real-Time Seat Updates

SeatLock uses Socket.IO to synchronize seat availability between connected clients.

When seat state changes, the API emits a seat-status event for the relevant showtime.

Examples include:

- `AVAILABLE -> HELD`
- `HELD -> AVAILABLE`
- `HELD -> BOOKED`

This allows two users viewing the same showtime to see seat changes without manually refreshing the page.

Redis supports the Socket.IO infrastructure so that the real-time layer can be extended beyond a single API instance.

## Concurrency and Seat Protection

Seat availability is enforced by the backend rather than relying on client state.

When a customer attempts to hold seats, the API conditionally updates the corresponding showtime-seat records only when they are still `AVAILABLE`.

The hold and seat-state changes execute inside a database transaction.

If any requested seat is no longer available, the operation fails rather than allowing two customers to successfully claim the same seat.

This is the central consistency guarantee of the SeatLock booking workflow.

## Hold Expiration

Seat holds are temporary.

Each hold stores an expiration timestamp. The application periodically processes stale active holds using NestJS scheduling.

When a hold expires:

1. The hold becomes `EXPIRED`.
2. Seats associated with that hold return to `AVAILABLE`.
3. A real-time event is emitted.
4. Connected clients receive the updated seat state.

The application also performs stale-hold cleanup when relevant seat/showtime operations are requested, reducing the chance of exposing expired state.

## Authentication and Authorization

SeatLock uses JWT-based authentication.

Authenticated requests contain the user's identity and role.

The application currently supports:

- `CUSTOMER`
- `ADMIN`

Administrative mutation endpoints require both authentication and the `ADMIN` role.

Authorization is enforced on the backend even though the frontend also hides administrative functionality from ordinary customers.

## Payment and Booking

Stripe is used for the payment workflow.

A payment is associated with an active seat hold. Successful payment allows the booking workflow to convert held seats into booked seats.

The booking process protects the relationship between:

```text
User
  |
SeatHold
  |
Payment
  |
Booking
  |
ShowtimeSeat
```

The backend remains responsible for deciding whether a hold is valid and whether the seats can be booked.

## Booking History

Authenticated customers can also access their booking history after a booking has been completed.

The booking-history workflow retrieves bookings belonging to the authenticated user and presents the associated showtime, venue, screen, and seat information.

This allows the customer flow to continue beyond booking confirmation:

```text
Discover Showtime
       |
       v
Reserve and Pay
       |
       v
Confirm Booking
       |
       v
My Bookings
       |
       v
Review Booking Details
```

## Event Publishing

SeatLock also contains a Kafka-based event publishing path.

Business events are persisted through an outbox mechanism and published asynchronously. This demonstrates how transactional application state can be separated from downstream event delivery without requiring the main booking request to synchronously coordinate every consumer.

Kafka is therefore part of the backend/event architecture rather than the mechanism used to enforce seat locking.

## API

The backend is implemented with NestJS and exposes endpoints for areas including:

- authentication
- venues
- screens
- seats
- showtimes
- showtime discovery
- seat holds
- payments
- bookings
- administrative management

More details are documented in [`docs/api-overview.md`](docs/api-overview.md).

## Architecture

A more detailed description of the system components, data flow, concurrency strategy, real-time communication, and infrastructure is available in:

[`docs/architecture.md`](docs/architecture.md)

The end-to-end reservation lifecycle is described in:

[`docs/booking-flow.md`](docs/booking-flow.md)

## Local Development

The repository contains separate frontend and backend applications.

### Start the API

```bash
npm --prefix apps/api run start:dev
```

### Start the web application

```bash
npm --prefix apps/web run dev
```

The exact environment configuration and supporting infrastructure depend on the local PostgreSQL, Redis, Kafka, and Stripe configuration.

## Validation

### API

```bash
npm --prefix apps/api test -- --runInBand
npm --prefix apps/api run lint
npm --prefix apps/api run build
```

### Web

```bash
npm --prefix apps/web run lint
npm --prefix apps/web run build
```

## Project Goals

SeatLock is primarily a portfolio and learning project designed to demonstrate practical full-stack engineering skills.

The project intentionally emphasizes:

- transactional consistency
- concurrency handling
- real-time communication
- authentication and authorization
- payment integration
- relational data modeling
- background processing
- event-driven architecture
- automated testing
- maintainable feature-oriented application structure

The goal is not to reproduce every operational capability of a large commercial ticketing platform. Instead, the project implements the architectural and engineering concepts that are most valuable to demonstrate, discuss, and reason about.

## Current Status

Implemented:

- Customer registration and authentication
- Showtime discovery and application navigation
- Seat inventory and selection
- Temporary seat holds
- Automatic hold expiration
- Real-time seat synchronization
- Stripe payment workflow
- Booking creation
- Customer booking history
- Administrative venue management
- Administrative screen management
- Administrative seat management
- Administrative showtime management
- Role-based admin authorization
- English, Hindi, and Telugu localization
- Light and dark themes
- Localized and theme-aware customer and administrative interfaces
- Backend unit, controller, service, guard, infrastructure, and authorization test coverage
- Project README, architecture, API overview, and booking-flow documentation

Planned before the demo release:

- Dockerized local environment
- CI with GitHub Actions
- Development/demo deployment

## License

This project is currently intended for portfolio and educational use.
