# SeatLock API Overview

## 1. Overview

SeatLock exposes a NestJS HTTP API for customer booking workflows, authentication, showtime discovery, administrative management, payments, and booking history.

The API is organized around business capabilities rather than exposing a single generic CRUD interface.

Major API areas include:

```text
Authentication
Showtime Discovery
Seat Holds
Payments
Bookings
Venues
Screens
Seats
Showtimes
```

The backend remains authoritative for authentication, authorization, seat availability, hold validity, payment state, booking state, and administrative business rules.

---

## 2. Authentication

SeatLock uses JWT-based authentication.

Authenticated endpoints expect a valid access token.

The authenticated request identity is used for operations such as:

- retrieving the current user
- creating seat holds
- creating payments
- confirming bookings
- retrieving booking history
- accessing administrative operations

SeatLock currently supports the following roles:

```text
CUSTOMER
ADMIN
```

Administrative endpoints require authentication and the `ADMIN` role.

### Authentication Endpoints

#### Register

```http
POST /auth/register
```

Creates a customer account.

Authentication is not required.

#### Login

```http
POST /auth/login
```

Authenticates a user and returns authentication information including the access token used by protected requests.

Authentication is not required.

#### Current User

```http
GET /auth/me
```

Returns information about the currently authenticated user.

Requires:

```text
JWT authentication
```

---

## 3. Showtime Discovery

Customer-facing showtime discovery is exposed separately from administrative showtime management.

These endpoints provide the information needed to browse upcoming showtimes and select seats.

### List Upcoming Showtimes

```http
GET /discovery/showtimes
```

Returns upcoming showtimes together with customer-facing information such as:

- showtime
- start time
- screen
- venue
- available seat count

Stale holds may be expired before availability-sensitive information is returned.

Authentication is not required.

### Get Showtime

```http
GET /discovery/showtimes/:id
```

Returns customer-facing details for a specific showtime.

Authentication is not required.

### Get Showtime Seat Inventory

```http
GET /discovery/showtimes/:id/seats
```

Returns seat inventory for the selected showtime.

Seat information includes the showtime-specific state required by the booking interface, such as availability and price.

Authentication is not required.

Real-time changes to this inventory are communicated separately through Socket.IO.

---

## 4. Seat Holds

A customer must create a temporary hold before completing the payment and booking workflow.

### Create Hold

```http
POST /showtimes/:showtimeId/holds
```

Requires:

```text
JWT authentication
```

The request contains one or more seat identifiers.

Conceptually:

```json
{
  "seatIds": [1, 2]
}
```

The backend:

1. validates the showtime
2. expires stale holds
3. creates an active hold
4. conditionally claims the requested seats
5. commits the operation transactionally
6. emits a real-time `HELD` seat update

If a requested seat is no longer available, the operation fails with a conflict instead of creating a partial reservation.

The hold has an expiration timestamp and belongs to the authenticated user.

---

## 5. Payments

Payment is associated with an existing seat hold.

### Create Payment

```http
POST /holds/:holdId/payment
```

Requires:

```text
JWT authentication
```

The backend validates the hold and creates the application/payment-provider state required for the Stripe workflow.

The payment workflow does not make the browser authoritative for booking completion.

The final booking transition is still performed by the backend.

### Stripe Webhook

```http
POST /payments/webhook
```

Receives Stripe webhook events used by the payment workflow.

This endpoint is called by Stripe rather than through the authenticated customer UI.

Webhook authenticity is handled through the payment integration rather than normal customer JWT authentication.

---

## 6. Bookings

Booking endpoints complete the reservation lifecycle and expose completed booking information to authenticated customers.

### Confirm Booking

```http
POST /holds/:holdId/confirm
```

Requires:

```text
JWT authentication
```

The backend validates the authenticated customer, hold, payment, and seat state before confirming the booking.

A successful confirmation transitions the relevant reservation state into permanent booked state.

Conceptually:

```text
ACTIVE HOLD
    |
    v
Successful Payment
    |
    v
Confirm Booking
    |
    v
Booking Created
    |
    v
Seats BOOKED
```

A real-time seat update is emitted after the successful booking state change.

### My Booking History

```http
GET /bookings/me
```

Requires:

```text
JWT authentication
```

Returns bookings belonging to the currently authenticated customer.

The booking-history response provides the information required by the My Bookings interface, including associated booking, showtime, venue, screen, and seat information.

This is a customer-specific read workflow.

It does not participate in seat locking or concurrency control because those guarantees have already been enforced during hold and booking creation.

### Get Booking

```http
GET /bookings/:id
```

Requires:

```text
JWT authentication
```

Returns details for a booking accessible to the authenticated customer.

Booking access is enforced by the backend rather than relying only on frontend navigation.

---

## 7. Venue Management

Venue APIs support both customer/application reads and protected administrative mutations.

### Create Venue

```http
POST /venues
```

Requires:

```text
JWT authentication
ADMIN role
```

### List Venues

```http
GET /venues
```

Returns configured venues.

### Get Venue

```http
GET /venues/:id
```

Returns a specific venue.

### Update Venue

```http
PATCH /venues/:id
```

Requires:

```text
JWT authentication
ADMIN role
```

### Delete Venue

```http
DELETE /venues/:id
```

Requires:

```text
JWT authentication
ADMIN role
```

Deletion may be rejected when removing the venue would violate relationships or historical data protection rules.

---

## 8. Screen Management

Screens belong to venues.

### Create Screen

```http
POST /venues/:venueId/screens
```

Requires:

```text
JWT authentication
ADMIN role
```

### List Screens for Venue

```http
GET /venues/:venueId/screens
```

Requires:

```text
JWT authentication
ADMIN role
```

### Get Screen

```http
GET /screens/:id
```

Returns a specific screen.

### Update Screen

```http
PATCH /screens/:id
```

Requires:

```text
JWT authentication
ADMIN role
```

### Delete Screen

```http
DELETE /screens/:id
```

Requires:

```text
JWT authentication
ADMIN role
```

Deletion is subject to backend domain rules protecting dependent and historical data.

---

## 9. Seat Management

Seats define the physical seat layout of a screen.

### Create Seat

```http
POST /screens/:screenId/seats
```

Requires:

```text
JWT authentication
ADMIN role
```

### List Seats for Screen

```http
GET /screens/:screenId/seats
```

Requires:

```text
JWT authentication
ADMIN role
```

### Get Seat

```http
GET /seats/:id
```

Returns a specific physical seat definition.

### Update Seat

```http
PATCH /seats/:id
```

Requires:

```text
JWT authentication
ADMIN role
```

### Delete Seat

```http
DELETE /seats/:id
```

Requires:

```text
JWT authentication
ADMIN role
```

Seat deletion may be rejected when historical showtime, hold, or booking relationships make the operation unsafe.

---

## 10. Showtime Management

Administrative showtime APIs are distinct from customer-facing discovery.

### Create Showtime

```http
POST /screens/:screenId/showtimes
```

Requires:

```text
JWT authentication
ADMIN role
```

Creating a showtime also establishes the showtime-specific seat inventory used by the reservation workflow.

### List Showtimes for Screen

```http
GET /screens/:screenId/showtimes
```

Requires:

```text
JWT authentication
ADMIN role
```

### Get Managed Showtime

```http
GET /showtimes/:id
```

Returns a showtime through the management API.

### Get Managed Showtime Seat Inventory

```http
GET /showtimes/:id/seats
```

Returns the showtime-specific seat inventory used by management workflows.

### Update Showtime

```http
PATCH /showtimes/:id
```

Requires:

```text
JWT authentication
ADMIN role
```

### Delete Showtime

```http
DELETE /showtimes/:id
```

Requires:

```text
JWT authentication
ADMIN role
```

Showtime deletion is subject to domain rules protecting reservation and booking history.

---

## 11. Real-Time Seat Events

Real-time seat synchronization is provided through Socket.IO rather than standard HTTP endpoints.

The API emits seat-state changes after successful backend state transitions.

Important transitions include:

```text
AVAILABLE -> HELD
HELD      -> AVAILABLE
HELD      -> BOOKED
```

Typical causes are:

```text
Create Hold
    |
    `---- HELD event

Hold Expiration
    |
    `---- AVAILABLE event

Booking Confirmation
    |
    `---- BOOKED event
```

PostgreSQL remains authoritative.

Socket.IO communicates committed state changes to connected clients but does not determine whether a seat claim succeeds.

Redis supports the Socket.IO infrastructure.

---

## 12. Error Semantics

The API uses HTTP errors to communicate invalid operations and domain conflicts.

Examples include:

```text
Authentication failure
Authorization failure
Resource not found
Seat conflict
Expired hold
Invalid payment state
Unsafe administrative deletion
```

A seat that was visible as available in the browser may have been claimed by another customer before the hold request reaches the backend.

That condition is treated as a domain conflict rather than allowing double booking.

Conceptually:

```text
GET seats
   |
   v
A1 = AVAILABLE
   |
   | another customer claims A1
   v
POST hold A1
   |
   v
409 Conflict
```

The client should treat backend state as authoritative.

---

## 13. API Capability Summary

The implemented HTTP surface can be summarized as:

```text
Authentication
|
+-- POST /auth/register
+-- POST /auth/login
`-- GET  /auth/me

Discovery
|
+-- GET /discovery/showtimes
+-- GET /discovery/showtimes/:id
`-- GET /discovery/showtimes/:id/seats

Holds
|
`-- POST /showtimes/:showtimeId/holds

Payments
|
+-- POST /holds/:holdId/payment
`-- POST /payments/webhook

Bookings
|
+-- POST /holds/:holdId/confirm
+-- GET  /bookings/me
`-- GET  /bookings/:id

Venues
|
+-- POST   /venues
+-- GET    /venues
+-- GET    /venues/:id
+-- PATCH  /venues/:id
`-- DELETE /venues/:id

Screens
|
+-- POST   /venues/:venueId/screens
+-- GET    /venues/:venueId/screens
+-- GET    /screens/:id
+-- PATCH  /screens/:id
`-- DELETE /screens/:id

Seats
|
+-- POST   /screens/:screenId/seats
+-- GET    /screens/:screenId/seats
+-- GET    /seats/:id
+-- PATCH  /seats/:id
`-- DELETE /seats/:id

Showtime Management
|
+-- POST   /screens/:screenId/showtimes
+-- GET    /screens/:screenId/showtimes
+-- GET    /showtimes/:id
+-- GET    /showtimes/:id/seats
+-- PATCH  /showtimes/:id
`-- DELETE /showtimes/:id
```

---

## 14. API Design Principles

SeatLock's API follows several important principles.

### Backend authority

The API owns reservation and booking state.

### Authentication before identity-sensitive operations

Holds, payments, bookings, booking history, and administrative mutations use authenticated identity where required.

### Authorization on the backend

Administrative UI protection is not treated as a security boundary.

The backend verifies the `ADMIN` role.

### Separate discovery from management

Customer-facing showtime discovery is separated from administrative showtime management.

### Explicit domain conflicts

Concurrency failures such as attempting to hold an unavailable seat are represented as domain conflicts.

### Transactional reservation operations

Multi-record state transitions are performed transactionally where consistency requires it.

### Historical data protection

Administrative deletion is constrained by domain relationships rather than behaving as unrestricted CRUD.

---

## 15. Related Documentation

For the complete system architecture, see:

```text
docs/architecture.md
```

For the end-to-end customer reservation lifecycle, see:

```text
docs/booking-flow.md
```

For project setup, technology choices, validation commands, and current project status, see:

```text
README.md
```