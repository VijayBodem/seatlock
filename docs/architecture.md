# SeatLock Architecture

## Overview

SeatLock is a real-time seat reservation and booking platform.

## Applications

### Web

Location:

`apps/web`

Technology:

- React
- TypeScript
- Vite

Responsibilities:

- User interface
- Client-side routing
- User interactions
- API communication
- Real-time seat updates

### API

Location:

`apps/api`

Technology:

- NestJS
- TypeScript

Responsibilities:

- Authentication
- Authorization
- Business logic
- Booking management
- Seat locking
- Payment workflow
- Real-time communication

## Data Layer

### PostgreSQL

Used for persistent transactional data.

### Redis

Used for temporary seat locks, caching, and real-time coordination.

## API Versioning

All API endpoints will use:

`/api/v1`

## Architecture Principle

The system is organized by business features rather than by technical layer alone.
