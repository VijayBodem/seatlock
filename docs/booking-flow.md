# SeatLock Booking Flow

## 1. Overview

SeatLock implements a transactional seat reservation workflow designed to prevent multiple customers from successfully reserving or booking the same seat.

The customer lifecycle is:

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
Complete Payment
       |
       v
Confirm Booking
       |
       v
Seats BOOKED
       |
       v
View My Bookings
```

The backend remains authoritative throughout this workflow.

The frontend may display current seat state and react to real-time events, but it never decides whether a seat can actually be held or booked.

---

## 2. Showtime Discovery

The customer begins by browsing upcoming showtimes.

```text
Customer
   |
   v
Showtimes Page
   |
   v
GET /discovery/showtimes
   |
   v
Upcoming Showtimes
```

The discovery response provides customer-facing information such as:

- showtime title
- start time
- venue
- screen
- available seat count

The application provides direct navigation to the Showtimes page so customers can return to discovery without manually entering a URL.

Only upcoming showtimes are included in the discovery workflow.

---

## 3. Viewing Seat Inventory

After selecting a showtime, the customer opens its seat-selection page.

```text
Customer
   |
   v
Select Showtime
   |
   v
GET /discovery/showtimes/:id/seats
   |
   v
Showtime Seat Inventory
```

Each seat belongs to the physical screen, while its reservation state is represented by showtime-specific inventory.

Conceptually:

```text
Physical Seat A1
      |
      +---- Showtime 1 -> AVAILABLE
      |
      +---- Showtime 2 -> HELD
      |
      `---- Showtime 3 -> BOOKED
```

The important customer-facing states are:

```text
AVAILABLE
HELD
BOOKED
```

The browser displays these states, but the backend remains the source of truth.

---

## 4. Seat Selection

The customer may select one or more seats that currently appear available.

At this point, no reservation guarantee exists yet.

For example:

```text
Customer A                         Customer B
    |                                  |
    v                                  v
Sees A1 AVAILABLE                 Sees A1 AVAILABLE
    |                                  |
Selects A1                        Selects A1
```

Both browsers can legitimately have observed the same previous state.

The actual concurrency decision occurs when each customer attempts to create a hold.

---

## 5. Creating a Temporary Hold

The customer submits the selected seats to:

```http
POST /showtimes/:showtimeId/holds
```

This operation requires authentication.

Conceptually:

```text
Selected Seats
      |
      v
Create Hold Request
      |
      v
Validate Showtime
      |
      v
Expire Stale Holds
      |
      v
Begin Database Transaction
      |
      +---- Create ACTIVE SeatHold
      |
      +---- Claim Seat 1
      |
      +---- Claim Seat 2
      |
      `---- Claim Seat N
      |
      v
Commit Transaction
      |
      v
Emit HELD Event
```

The hold belongs to the authenticated customer and contains an expiration timestamp.

---

## 6. Concurrency Protection

SeatLock prevents double reservation by conditionally claiming each requested showtime-seat record.

Conceptually, a seat can be changed to `HELD` only when it is still:

```text
AVAILABLE
```

The important state transition is:

```text
AVAILABLE
    |
    | successful conditional update
    v
HELD
```

Consider two customers attempting to claim the same seat:

```text
Customer A                 Customer B
    |                           |
    +------ Hold A1 ------------+
                |
                v
         Database state
                |
        +-------+-------+
        |               |
        v               v
   A succeeds       B conflicts
        |               |
        v               v
   A1 -> HELD      Request fails
```

Only the request that successfully changes the authoritative database state receives the seat.

This protects the system even when both customers previously saw the seat as available.

---

## 7. Atomic Multi-Seat Holds

A customer may reserve multiple seats in one hold request.

The operation is transactional.

For example:

```text
BEGIN

Create Hold

Claim A1 -> success
Claim A2 -> success
Claim A3 -> success

COMMIT
```

If any requested seat cannot be claimed:

```text
BEGIN

Create Hold

Claim A1 -> success
Claim A2 -> success
Claim A3 -> conflict

ROLLBACK
```

The customer does not receive a partial hold containing only A1 and A2.

This preserves the all-or-nothing behavior expected from a multi-seat reservation.

---

## 8. Real-Time HELD Update

After the hold transaction commits successfully, the API emits a real-time seat-status event.

Conceptually:

```text
Database Commit
      |
      v
Seat A1 = HELD
      |
      v
Socket.IO Event
      |
      +-------------------+
      |                   |
      v                   v
Customer A            Customer B
updates UI            updates UI
```

Other customers viewing the same showtime can therefore see the seat become unavailable without manually refreshing the page.

The event is emitted after the database operation succeeds.

Socket.IO is not used to decide who owns the seat.

---

## 9. Hold Expiration

Temporary holds cannot remain active indefinitely.

Each hold contains an expiration timestamp.

If the customer does not complete the booking before the hold expires:

```text
ACTIVE HOLD
     |
     | expiration time reached
     v
EXPIRED HOLD
     |
     v
HELD Seats
     |
     v
AVAILABLE Seats
```

The expiration workflow is performed transactionally.

After seats are released, the API emits an `AVAILABLE` real-time event.

Connected clients can then immediately reflect the newly available inventory.

---

## 10. Hold Cleanup

SeatLock uses two complementary stale-hold cleanup paths.

### Request-Time Cleanup

Relevant showtime and hold operations can expire stale holds before continuing.

This reduces the chance that an expired seat continues to appear unavailable during an active customer request.

### Scheduled Cleanup

NestJS scheduling periodically processes expired active holds.

Conceptually:

```text
Scheduler
    |
    v
Find ACTIVE holds
    |
    v
Expiration reached?
    |
   yes
    |
    v
Mark EXPIRED
    |
    v
Release HELD seats
    |
    v
Emit AVAILABLE event
```

Scheduled cleanup ensures abandoned holds are eventually released even if no customer performs another request against that showtime.

---

## 11. Payment

After successfully creating a hold, the customer proceeds to payment.

The payment workflow begins through:

```http
POST /holds/:holdId/payment
```

The request requires authentication.

Conceptually:

```text
Authenticated Customer
        |
        v
ACTIVE SeatHold
        |
        v
Create Payment
        |
        v
Stripe
        |
        v
Payment Processing
```

Payment is associated with the hold rather than independently reserving seats.

The temporary hold is what protects the selected inventory while payment is being completed.

---

## 12. Stripe Integration

Stripe provides the external payment-processing workflow.

SeatLock maintains its own application payment state associated with the hold.

Conceptually:

```text
SeatLock
   |
   v
Payment Intent / Payment State
   |
   v
Stripe
   |
   v
Payment Result
   |
   v
SeatLock Booking Workflow
```

Stripe can communicate payment events through:

```http
POST /payments/webhook
```

The webhook is an integration endpoint for Stripe rather than a normal authenticated customer endpoint.

Payment-provider state does not independently determine seat ownership.

The backend still validates the application booking state before creating a booking.

---

## 13. Booking Confirmation

After successful payment, the customer confirms the booking through:

```http
POST /holds/:holdId/confirm
```

This endpoint requires authentication.

The backend validates the relationships among:

```text
Authenticated User
       |
       v
SeatHold
       |
       v
Payment
       |
       v
ShowtimeSeat
```

Only valid booking state can proceed to confirmation.

Conceptually:

```text
ACTIVE Hold
     |
     v
Valid Payment
     |
     v
Confirm Booking
     |
     v
Begin Transaction
     |
     +---- Create Booking
     |
     +---- Associate Seats
     |
     +---- Seats -> BOOKED
     |
     v
Commit
```

The result is a permanent booking rather than a temporary reservation.

---

## 14. Real-Time BOOKED Update

After booking confirmation succeeds, affected seats transition from:

```text
HELD
 |
 v
BOOKED
```

The API emits the corresponding real-time update.

Other connected customers therefore see the permanent seat state without manually refreshing.

Conceptually:

```text
Booking Transaction
       |
       v
COMMIT
       |
       v
Seats BOOKED
       |
       v
Socket.IO Event
       |
       v
Connected Clients
```

Again, the database transaction establishes the state.

The real-time event distributes that state.

---

## 15. Booking History

A successfully confirmed booking remains accessible to the authenticated customer.

The customer can navigate to the My Bookings interface.

The frontend requests:

```http
GET /bookings/me
```

Conceptually:

```text
Authenticated Customer
        |
        v
My Bookings
        |
        v
GET /bookings/me
        |
        v
Customer's Bookings
        |
        +---- Showtime
        +---- Venue
        +---- Screen
        `---- Seats
```

Booking history extends the customer workflow beyond checkout.

The complete customer journey becomes:

```text
Showtimes
    |
    v
Seat Selection
    |
    v
Temporary Hold
    |
    v
Payment
    |
    v
Booking Confirmation
    |
    v
My Bookings
```

Booking history is a read workflow.

It does not reacquire seats or participate in booking concurrency.

---

## 16. Individual Booking Details

An authenticated customer can retrieve booking details through:

```http
GET /bookings/:id
```

This allows the application to retrieve information for a specific booking when required.

Booking access is enforced by the backend.

Frontend routing alone is not considered an authorization mechanism.

---

## 17. Main Success Path

The complete successful reservation lifecycle is:

```text
Customer
   |
   v
Browse Showtimes
   |
   v
Choose Showtime
   |
   v
View Seats
   |
   v
Select AVAILABLE Seats
   |
   v
Create Hold
   |
   v
Database Transaction
   |
   v
Seats HELD
   |
   v
Real-Time HELD Event
   |
   v
Create Payment
   |
   v
Stripe Payment
   |
   v
Confirm Booking
   |
   v
Database Transaction
   |
   v
Seats BOOKED
   |
   v
Real-Time BOOKED Event
   |
   v
Booking Confirmation
   |
   v
My Booking History
```

---

## 18. Hold Expiration Branch

The main alternative path occurs when the customer does not complete the booking before the hold expires.

```text
Seats HELD
    |
    v
Customer does not complete booking
    |
    v
Expiration Time Reached
    |
    v
Cleanup
    |
    v
Hold EXPIRED
    |
    v
Seats AVAILABLE
    |
    v
Real-Time AVAILABLE Event
```

The seats can then be reserved by another customer.

---

## 19. Seat Conflict Branch

Another important branch occurs when a seat is claimed by another customer before the hold request succeeds.

```text
Customer sees A1 AVAILABLE
        |
        v
Another customer holds A1
        |
        v
Customer requests hold for A1
        |
        v
Conditional seat claim fails
        |
        v
Conflict response
        |
        v
Customer refreshes current inventory
```

This is expected behavior in a concurrent reservation system.

The conflict protects correctness rather than representing an application malfunction.

---

## 20. Why the Hold Exists

Without temporary holds, payment creates a difficult race condition.

For example:

```text
Customer A starts payment for A1
Customer B starts payment for A1
```

The application would then need to decide what happens if both payments succeed.

SeatLock instead establishes reservation ownership before payment:

```text
AVAILABLE
    |
    v
HELD by Customer A
    |
    v
Customer A pays
    |
    v
BOOKED
```

Customer B cannot successfully acquire the same seat while Customer A's valid hold remains active.

If Customer A abandons checkout, the hold expires and the seat returns to availability.

---

## 21. Why PostgreSQL Is Authoritative

SeatLock uses PostgreSQL as the authoritative transactional store for reservation state.

This provides a clear consistency model:

```text
Frontend
   |
   | request
   v
Backend
   |
   | transaction
   v
PostgreSQL
   |
   | committed result
   v
Socket.IO
   |
   v
Other Clients
```

Redis and Socket.IO improve real-time communication.

Kafka supports asynchronous event publishing.

Neither replaces the transactional database for seat ownership.

This separation makes the reservation rules easier to reason about and test.

---

## 22. Customer Experience vs. Consistency

The booking flow deliberately separates user experience from consistency enforcement.

The frontend provides:

- visual seat selection
- current seat status
- payment UI
- booking confirmation
- booking history
- navigation
- English, Hindi, and Telugu localization
- light and dark themes

The backend provides:

- authoritative availability
- transactional holds
- concurrency protection
- hold expiration
- payment validation
- booking creation
- booking ownership
- authorization

This means a stale browser view can never override current backend state.

---

## 23. Booking Flow Guarantees

Within the implemented SeatLock scope, the booking design provides several important guarantees.

### No successful double claim

A seat must still be `AVAILABLE` when the backend attempts to claim it.

### Atomic multi-seat reservation

A multi-seat hold succeeds as one transaction or fails as one transaction.

### Temporary ownership

Successfully held seats remain unavailable to competing customers until booking or expiration changes their state.

### Automatic release

Expired holds return their seats to `AVAILABLE`.

### Permanent booked state

Successful booking confirmation transitions held seats to `BOOKED`.

### Real-time synchronization

Committed seat-state changes are distributed to connected clients.

### Authenticated booking ownership

Holds and bookings are associated with authenticated users.

### Historical access

Customers can retrieve completed bookings through the authenticated booking-history workflow.

---

## 24. Final Flow Summary

SeatLock's core booking state machine can be summarized as:

```text
                    +----------------+
                    |   AVAILABLE    |
                    +-------+--------+
                            |
                       Create Hold
                            |
                            v
                    +-------+--------+
                    |      HELD      |
                    +---+--------+---+
                        |        |
                 Expiration    Payment +
                        |      Confirmation
                        |        |
                        v        v
                 +------+--+  +--+------+
                 | AVAILABLE|  | BOOKED |
                 +---------+  +---------+
```

Around that state machine, SeatLock provides:

```text
Showtime Discovery
        |
Seat Selection
        |
Transactional Hold
        |
Stripe Payment
        |
Booking Confirmation
        |
Real-Time Updates
        |
Booking History
```

The temporary hold is the bridge between concurrent seat selection and payment.

The database transaction is the consistency boundary.

Socket.IO distributes committed changes.

Scheduled cleanup releases abandoned reservations.

Booking history completes the customer lifecycle by preserving access to confirmed reservation information.

Together, these components form the central transactional workflow demonstrated by the SeatLock project.

---

## 25. Related Documentation

For the broader system design, infrastructure, authorization model, data model, and architectural decisions, see:

```text
docs/architecture.md
```

For the implemented HTTP API surface, see:

```text
docs/api-overview.md
```

For setup, technology stack, validation commands, project goals, and current status, see:

```text
README.md
```