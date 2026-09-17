# SeatLock Architecture

## 1. Overview

SeatLock is a full-stack real-time seat reservation and booking platform.

The application is designed around a transactional booking workflow where multiple users may view and interact with the same seat inventory concurrently.

The architecture focuses on several important engineering concerns:

- transactional consistency
- concurrent seat reservation
- temporary seat holds
- real-time seat synchronization
- payment processing
- authentication and role-based authorization
- customer booking history
- background processing
- asynchronous event publishing
- relational data integrity
- internationalized user interfaces
- light and dark theme support

SeatLock is organized as a monorepo containing separate frontend and backend applications.

```text
seatlock/
|-- apps/
|   |-- api/        # NestJS backend
|   `-- web/        # React frontend
|-- docs/
|-- package.json
`-- README.md
```

The system is intentionally scoped as a portfolio and learning project. It demonstrates realistic application architecture without attempting to reproduce every operational component of a large commercial ticketing platform.

---

## 2. High-Level Architecture

At a high level, SeatLock consists of the following components:

```text
                         +----------------------+
                         |      Web Client      |
                         | React + TypeScript   |
                         +----------+-----------+
                                    |
                         HTTP / WebSocket
                                    |
                                    v
                         +----------+-----------+
                         |      NestJS API      |
                         | Business Logic       |
                         +----+-------+----------+
                              |       |
                    SQL / ORM |       | Socket.IO
                              |       |
                              v       v
                    +---------+--+  +----------------+
                    | PostgreSQL |  | Redis Adapter  |
                    +------------+  +----------------+
                              |
                              |
                    Transactional data
                              |
                              v
                    +--------------------+
                    |   Outbox Events    |
                    +---------+----------+
                              |
                              v
                    +--------------------+
                    |       Kafka        |
                    +--------------------+

                         External Service
                              |
                              v
                    +--------------------+
                    |       Stripe       |
                    +--------------------+
```

The frontend communicates with the API through HTTP for standard application operations and Socket.IO for real-time seat updates.

PostgreSQL stores the authoritative transactional state.

Redis supports the Socket.IO infrastructure and real-time coordination.

Stripe provides payment processing.

Kafka is used as an asynchronous event-delivery mechanism through the transactional outbox pattern.

---

## 3. Frontend Architecture

The frontend application is located at:

```text
apps/web
```

It is built with:

- React
- TypeScript
- Vite
- React Router
- Tailwind CSS
- Socket.IO Client
- Stripe.js
- React Stripe.js
- i18next

The frontend is responsible for:

- authentication UI
- customer navigation
- showtime discovery
- seat selection
- hold creation
- payment interaction
- booking confirmation
- customer booking history
- real-time seat updates
- administrative management interfaces
- English, Hindi, and Telugu localization
- light and dark theme presentation

The frontend does not decide whether a seat can actually be held or booked.

Those decisions are always made by the backend.

This is important because browser state cannot be treated as authoritative in a concurrent reservation system.

### Customer Navigation

Customer-facing navigation provides direct access to the main application workflows, including showtime discovery and booking history.

A customer does not need to manually enter application URLs to move between the primary booking features.

Conceptually:

```text
Application Header
       |
       +---- Showtimes
       |
       +---- My Bookings
       |
       +---- Authentication / Account
       |
       +---- Language
       |
       `---- Theme
```

### Internationalization

The frontend uses i18next for application localization.

The currently supported languages are:

```text
English
Hindi
Telugu
```

Localization applies to customer-facing pages as well as administrative workflows.

The administrative hierarchy:

```text
Venue
  |
  v
Screen
  |
  v
Seat / Showtime
```

uses the same localization approach as the rest of the application.

This avoids creating a separate English-only administrative experience.

### Theme Support

The frontend supports both light and dark themes.

Theme behavior is applied consistently across:

- shared application layout
- authentication pages
- showtime discovery
- seat selection
- booking history
- administrative venue management
- administrative screen management
- administrative seat management
- administrative showtime management

Internationalization and theme selection are presentation-layer concerns.

They do not modify backend authentication, authorization, transactional, payment, or booking rules.

---

## 4. Backend Architecture

The backend application is located at:

```text
apps/api
```

It is implemented with NestJS and TypeScript.

The API is organized primarily around business capabilities.

Major backend areas include:

```text
auth
users
venues
screens
seats
showtimes
holds
payments
bookings
realtime
outbox
kafka
database
```

This feature-oriented organization keeps controllers, services, DTOs, tests, and domain behavior close to the business capability they implement.

The backend is responsible for:

- authentication
- authorization
- administrative business rules
- showtime discovery
- seat inventory
- temporary seat holds
- concurrency protection
- hold expiration
- payment workflow
- booking confirmation
- booking-history access
- real-time event generation
- asynchronous event publishing

The backend remains authoritative for all transactional booking state.

---

## 5. Data Model

SeatLock uses PostgreSQL for persistent application data.

The main domain relationships can be represented as:

```text
User
 |
 +-------------------+
 |                   |
 v                   v
SeatHold           Booking
 |                   |
 |                   |
 v                   v
Showtime -------- ShowtimeSeat
   |
   v
Screen
   |
   v
Venue
```

Payment is associated with the customer and the hold involved in the booking workflow.

Conceptually:

```text
User
 |
 +---- SeatHold
 |       |
 |       +---- Payment
 |       |
 |       `---- ShowtimeSeat
 |
 `---- Booking
         |
         +---- Showtime
         |
         `---- ShowtimeSeat
```

### Venue

A venue represents a physical cinema or booking location.

It contains information such as:

- name
- city
- address

A venue can contain multiple screens.

### Screen

A screen belongs to a venue.

A screen contains the physical seat layout used when showtime seat inventory is generated.

### Seat

A seat belongs to a screen.

Typical seat information includes:

- row
- number
- type

Seat definitions describe physical seats and do not themselves represent availability for a particular showtime.

### Showtime

A showtime belongs to a screen and represents a scheduled event.

### ShowtimeSeat

`ShowtimeSeat` is the showtime-specific inventory record.

It connects a physical seat with a particular showtime.

It contains state such as:

```text
AVAILABLE
HELD
BOOKED
```

and contains the showtime-specific price.

This separation between `Seat` and `ShowtimeSeat` is important because the same physical seat can have different availability and pricing for different showtimes.

### SeatHold

A `SeatHold` represents a temporary reservation attempt.

It belongs to:

- a showtime
- a user

and contains:

- status
- expiration timestamp
- associated held seats

### Booking

A booking represents a successfully confirmed reservation.

It belongs to:

- a user
- a showtime
- a hold

and references the booked showtime-seat records.

### Payment

A payment is associated with:

- a user
- a hold

and tracks payment state and provider information.

---

## 6. Showtime Seat Materialization

Physical seats belong to screens, but booking availability belongs to showtimes.

When a showtime is created, SeatLock materializes showtime-specific inventory from the seats configured for the selected screen.

Conceptually:

```text
Screen
  |
  +---- Seat A1
  +---- Seat A2
  +---- Seat A3
  |
  v
Create Showtime
  |
  v
ShowtimeSeat A1
ShowtimeSeat A2
ShowtimeSeat A3
```

Each generated showtime-seat record can independently track:

- status
- price
- hold
- booking

This design avoids modifying the physical seat definition during booking operations.

A seat can therefore be:

```text
Showtime 1 -> AVAILABLE
Showtime 2 -> BOOKED
Showtime 3 -> HELD
```

at the same time.

The physical seat itself remains unchanged.

---

## 7. Showtime Discovery

Customer showtime discovery is separated from administrative showtime management.

The discovery API provides customer-facing information such as:

- showtime identifier
- title
- start time
- available seat count
- screen
- venue

Only upcoming showtimes are exposed through the discovery list.

Conceptually:

```text
Showtime
   |
   v
Screen
   |
   v
Venue

ShowtimeSeat
   |
   v
Available seat count
```

Before returning availability-sensitive information, stale holds are expired so that expired reservations do not continue to appear as unavailable.

Showtime discovery is therefore a read workflow, but it may trigger stale-hold cleanup to ensure the returned inventory reflects current state.

---

## 8. Seat Hold Workflow

Temporary holds are the core reservation mechanism.

A customer first selects one or more currently available seats.

The frontend then requests a hold:

```text
Customer
   |
   v
POST hold request
   |
   v
HoldsService
   |
   v
Validate Showtime
   |
   v
Expire stale holds
   |
   v
Begin transaction
   |
   +---- Create ACTIVE SeatHold
   |
   +---- Claim requested seats
   |
   v
Commit
   |
   v
Emit HELD real-time event
```

A hold contains an expiration time.

The configured hold duration is short enough to allow a customer to complete payment while preventing seats from remaining unavailable indefinitely.

The hold operation is authenticated, so the hold belongs to a known customer.

---

## 9. Concurrency Protection

The most important consistency problem in SeatLock is preventing two customers from successfully reserving the same seat.

The frontend cannot solve this problem because two browsers may both display a seat as available at the same time.

For example:

```text
Customer A                     Customer B
    |                              |
    | sees A1 AVAILABLE            | sees A1 AVAILABLE
    |                              |
    +---------- hold A1 -----------+
                                   |
                                   v
                              Backend decides
```

SeatLock therefore performs the seat claim on the backend.

The update is conditional on the seat still being available.

Conceptually:

```text
UPDATE ShowtimeSeat
SET
    status = HELD,
    holdId = <hold>
WHERE
    showtimeId = <showtime>
    AND seatId = <seat>
    AND status = AVAILABLE
```

Only one competing request can successfully transition the same seat from `AVAILABLE` to `HELD`.

If another request reaches the same seat after it has already been claimed, the conditional update fails and the API returns a conflict.

This gives the application a clear consistency guarantee:

> A seat must still be available at the moment the backend attempts to claim it.

The browser's previous view of availability is never sufficient proof that the seat can be reserved.

---

## 10. Transaction Boundaries

Operations that must succeed or fail together are executed inside database transactions.

The hold workflow is a key example.

Conceptually:

```text
BEGIN

Create SeatHold

Claim Seat A1
Claim Seat A2
Claim Seat A3

COMMIT
```

If claiming one of the requested seats fails:

```text
BEGIN

Create SeatHold
Claim A1
Claim A2
Claim A3 -> CONFLICT

ROLLBACK
```

The customer therefore does not receive a partially successful multi-seat hold.

The same transactional principle is used when booking state must transition consistently across related records.

---

## 11. Hold Expiration

Seat holds are temporary.

Each active hold contains an expiration timestamp.

When the hold expires:

```text
SeatHold
ACTIVE
   |
   v
EXPIRED

ShowtimeSeat
HELD
   |
   v
AVAILABLE
```

Expiration is processed transactionally.

The expiration workflow:

1. finds active holds
2. determines which have expired
3. changes their state to `EXPIRED`
4. releases seats still associated with the expired hold
5. commits the transaction
6. emits real-time availability events

SeatLock supports both targeted and global stale-hold cleanup.

Targeted cleanup can run when a particular showtime is accessed.

Global cleanup is performed through a scheduled background process.

This combination improves correctness even when a customer is not actively interacting with a showtime at the exact moment a hold expires.

---

## 12. Real-Time Communication

SeatLock uses Socket.IO for real-time seat-state synchronization.

Clients viewing a showtime subscribe to updates relevant to that showtime.

Seat state transitions can generate events such as:

```text
AVAILABLE -> HELD
HELD      -> AVAILABLE
HELD      -> BOOKED
```

The real-time layer is notification infrastructure.

It is not the source of truth for booking consistency.

The database transaction decides whether a state transition succeeds.

Only after the transactional operation succeeds does the application emit the corresponding real-time event.

This distinction is important:

```text
Database
   |
   | authoritative state change
   v
Commit
   |
   v
Socket.IO event
   |
   v
Other clients update UI
```

If a WebSocket message is delayed, the database state remains correct.

---

## 13. Redis and Real-Time Infrastructure

Redis supports the Socket.IO infrastructure.

A Redis-backed Socket.IO adapter allows real-time messages to be coordinated when the application is extended beyond a single API process.

Conceptually:

```text
Client A
   |
API Instance 1
   |
   +------ Redis ------+
                       |
                  API Instance 2
                       |
                    Client B
```

This provides a realistic path toward horizontally scaled real-time communication.

Redis does not replace PostgreSQL as the authoritative seat-booking store.

Seat locking and booking consistency remain database-backed.

This keeps the correctness model understandable and transactional while still demonstrating distributed real-time infrastructure.

---

## 14. Authentication

SeatLock uses JWT-based authentication.

After successful authentication, the client receives an access token.

Authenticated requests send that token to the backend.

The JWT authentication guard validates the token and attaches authenticated user information to the request.

The authenticated identity includes information needed by downstream services, including the user identifier and role.

Conceptually:

```text
Login
  |
  v
JWT
  |
  v
Authenticated Request
  |
  v
JwtAuthGuard
  |
  v
request.user
```

This identity is used by workflows such as:

- creating seat holds
- payment processing
- booking confirmation
- retrieving customer booking history
- administrative authorization

---

## 15. Authorization

SeatLock currently supports two application roles:

```text
CUSTOMER
ADMIN
```

Authentication answers:

> Who is making the request?

Authorization answers:

> Is this user allowed to perform this operation?

Administrative mutation endpoints use both authentication and admin authorization.

Conceptually:

```text
Request
   |
   v
JwtAuthGuard
   |
   v
Authenticated?
   |
   v
AdminGuard
   |
   v
role === ADMIN?
   |
   +---- yes -> controller
   |
   `---- no  -> forbidden
```

Frontend route protection improves the user experience, but backend guards remain the actual security boundary.

A customer cannot gain administrative privileges merely by manually calling an admin API endpoint.

---

## 16. Administrative Data Protection

Administrative delete operations must account for historical booking data.

A venue, screen, seat, or showtime may participate in:

- holds
- payments
- bookings
- showtime-seat inventory

Blindly deleting parent entities could destroy or invalidate historical reservation data.

SeatLock therefore uses domain-aware deletion rules.

For example:

```text
Venue
  |
  v
Screen exists
  |
  v
Deletion rejected
```

Similar protections are applied where historical hold or booking relationships make destructive deletion unsafe.

This demonstrates an important distinction between simple CRUD and real domain management.

An administrative UI may expose a Delete button, but the backend remains responsible for deciding whether deletion is valid.

---

## 17. Payment Architecture

Stripe is used for the payment workflow.

Payment is associated with an active seat hold rather than directly claiming seats.

This preserves the separation between:

```text
Seat reservation
      |
      v
Temporary Hold
      |
      v
Payment
      |
      v
Booking Confirmation
```

The backend validates the hold before allowing payment-related booking progress.

A payment record tracks provider-related information and application payment state.

Conceptually:

```text
Customer
   |
   v
Active SeatHold
   |
   v
Payment Session
   |
   v
Stripe
   |
   v
Payment Success
   |
   v
Booking Confirmation
```

Payment success does not make the browser authoritative.

The backend still performs the final booking transition.

---

## 18. Booking Workflow

A successful booking converts an active held reservation into permanent booked state.

The end-to-end flow is:

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
Seats HELD
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
       +---- Create Booking
       |
       +---- Associate booked seats
       |
       +---- Seats -> BOOKED
       |
       v
Commit
       |
       v
Emit BOOKED real-time event
```

The booking operation validates the relationships among:

```text
User
SeatHold
Payment
Showtime
ShowtimeSeat
Booking
```

The backend ensures that booking confirmation is performed against valid transactional state rather than trusting frontend assumptions.

### Booking History

After booking confirmation, authenticated customers can retrieve their own booking history.

Conceptually:

```text
Authenticated Customer
        |
        v
Request My Bookings
        |
        v
Bookings API
        |
        v
Bookings belonging to authenticated user
        |
        v
Showtime + Venue + Screen + Seat details
        |
        v
Booking History UI
```

The booking-history workflow is a read operation over completed booking data.

It does not participate in seat locking or booking concurrency.

Those guarantees have already been enforced during the hold, payment, and booking transaction.

Booking-history access remains associated with the authenticated user so that the customer receives their own booking records.

The frontend exposes this through the My Bookings interface, allowing customers to revisit completed booking information after leaving the checkout flow.

---

## 19. Background Processing

SeatLock uses NestJS scheduling for background work.

A key scheduled task is stale-hold expiration.

Conceptually:

```text
Scheduler
   |
   v
HoldsCleanupService
   |
   v
expireAllStaleHolds()
   |
   v
Release expired seats
```

Background cleanup complements request-time cleanup.

The scheduler prevents stale holds from remaining indefinitely when no customer happens to request the affected showtime.

---

## 20. Outbox Pattern

SeatLock contains a transactional outbox mechanism for asynchronous event publishing.

A common distributed-system problem is:

```text
Database commit succeeds
Kafka publish fails
```

If application code directly performs both operations without coordination, transactional state and published events can become inconsistent.

The outbox pattern separates those responsibilities.

Conceptually:

```text
Business Transaction
       |
       +---- Domain state
       |
       `---- Outbox record
              |
              v
          COMMIT
              |
              v
      Background Publisher
              |
              v
            Kafka
```

The outbox record is stored as part of application persistence.

A publisher later attempts to send the event to Kafka.

This allows the business transaction to succeed without requiring Kafka to be synchronously available at the same instant.

---

## 21. Kafka

Kafka is used as asynchronous event infrastructure.

It is intentionally not used as the seat-locking mechanism.

Seat locking requires immediate transactional consistency, while Kafka is better suited to downstream asynchronous processing.

Conceptually:

```text
Booking Transaction
       |
       v
Outbox
       |
       v
Kafka
       |
       +---- analytics
       +---- notifications
       +---- downstream integrations
       `---- future consumers
```

The current portfolio project does not need to implement every possible Kafka consumer.

The architectural value is demonstrating how domain events can be reliably separated from the synchronous booking transaction.

---

## 22. Error Handling and Domain Conflicts

SeatLock distinguishes ordinary request errors from domain conflicts.

Examples include:

- invalid authentication
- insufficient authorization
- missing resources
- seat no longer available
- expired hold
- invalid payment state
- unsafe administrative deletion

A concurrency conflict is not treated as an unexpected server failure.

For example:

```text
Customer requests Seat A1
       |
       v
A1 already HELD
       |
       v
409 Conflict
```

This communicates that the request was valid in structure but could not be completed because the domain state changed.

The frontend can then refresh or update its representation of the current state.

---

## 23. API Responsibilities

The backend API can be viewed as several related capability groups:

```text
Authentication
      |
      +---- register
      +---- login
      `---- authenticated identity

Discovery
      |
      +---- upcoming showtimes
      +---- showtime details
      `---- showtime seat inventory

Booking
      |
      +---- holds
      +---- payments
      +---- booking confirmation
      `---- authenticated booking history

Administration
      |
      +---- venues
      +---- screens
      +---- seats
      `---- showtimes

Infrastructure
      |
      +---- realtime
      +---- hold cleanup
      +---- outbox
      `---- Kafka publishing
```

Administrative read and mutation operations are separated where appropriate from customer-facing discovery.

This prevents customer workflows from depending directly on administrative UI behavior.

The API remains the authority for:

- authentication
- authorization
- seat availability
- hold validity
- payment state
- booking state
- booking ownership
- administrative deletion rules

---

## 24. Testing Strategy

The backend contains automated tests across controllers, services, guards, infrastructure components, and booking behavior.

The test suite covers areas including:

- authentication
- JWT validation
- admin authorization
- venues
- screens
- seats
- showtimes
- showtime discovery
- holds
- hold cleanup
- payments
- bookings
- real-time gateway behavior
- Redis Socket.IO adapter
- Kafka service
- outbox publishing

Controller tests validate request delegation and guard-related integration requirements.

Service tests validate business behavior and error conditions.

Concurrency-sensitive hold behavior is tested at the service level.

The project also uses:

- ESLint
- TypeScript compilation
- frontend production builds

as part of development validation.

Before infrastructure work, the application has been validated through backend automated tests and browser testing of the major customer and administrative workflows.

---

## 25. Architectural Principles

Several principles guide SeatLock's design.

### Backend authority

The browser never decides whether a seat can actually be reserved or booked.

The backend owns transactional state.

### Transactions for related state changes

Operations that must succeed together execute inside database transactions.

### Conditional state transitions

Concurrency-sensitive operations update records only when they are still in the expected state.

### Real-time communication after state changes

Socket.IO communicates committed state changes to other clients.

It does not replace transactional persistence.

### Persistent holds

Temporary holds are stored as application data rather than existing only in browser memory.

This makes expiration, payment, ownership, and booking relationships explicit.

### Feature-oriented organization

Backend code is grouped around business capabilities such as holds, bookings, payments, and showtimes.

This makes domain behavior easier to locate and explain.

### Presentation concerns remain separate from domain rules

Localization and theme selection are frontend presentation concerns.

English, Hindi, and Telugu translations and light/dark theme behavior are applied consistently across customer and administrative interfaces without changing backend domain behavior.

This separation keeps user-interface preferences independent from transactional booking, authorization, payment, and concurrency rules.

### Domain-aware administration

Administrative operations respect historical booking relationships rather than behaving as unrestricted CRUD.

### Portfolio-focused complexity

Infrastructure and architecture are included when they demonstrate useful engineering concepts.

Complexity that does not provide meaningful learning or portfolio value is intentionally avoided.

---

## 26. Current Deployment Model

During development, SeatLock runs as separate local application and infrastructure processes.

Conceptually:

```text
Browser
   |
   v
Vite Web Application
   |
   v
NestJS API
   |
   +---- PostgreSQL
   +---- Redis
   +---- Kafka
   `---- Stripe
```

This development model is sufficient while application functionality is being implemented and validated.

The next infrastructure milestone is to package the application using Docker.

Dockerization will make the development/demo environment easier to reproduce and will establish a clear foundation for automated CI and deployment.

The project does not currently require production-scale orchestration.

For the portfolio scope, the target is a reliable development/demo deployment rather than a multi-region or enterprise production environment.

---

## 27. Scope Decisions

SeatLock intentionally includes several architecture features because they provide meaningful engineering and interview value:

- transactional seat locking
- concurrent reservation protection
- persistent temporary holds
- scheduled hold expiration
- Socket.IO real-time updates
- Redis-backed real-time infrastructure
- Stripe payment integration
- JWT authentication
- role-based authorization
- customer booking history
- domain-aware administrative management
- multilingual frontend support
- light and dark themes
- transactional outbox
- Kafka event publishing
- automated backend testing

The project intentionally does not attempt to reproduce every capability of a large commercial booking platform.

Examples of deliberately excluded or deferred complexity include:

- Kubernetes
- multi-region deployment
- large microservice decomposition
- enterprise service mesh
- complex recommendation systems
- production-scale observability platforms
- advanced analytics pipelines
- large-scale Kafka consumer ecosystems
- multiple payment providers
- extensive enterprise IAM

These capabilities could be added to a commercial system, but they are not necessary to demonstrate the core engineering goals of SeatLock.

The chosen scope provides enough depth to discuss:

- database consistency
- race conditions
- transactions
- distributed real-time communication
- payment integration
- security
- event-driven architecture
- frontend localization
- theme architecture
- API design
- testing
- deployment strategy

without introducing infrastructure solely for complexity's sake.

---

## 28. Remaining Architecture Work

The primary application feature scope and project documentation are complete for the planned portfolio/demo release.

The remaining work is focused on packaging, automated validation, and deployment:

```text
Dockerization
      |
      v
CI / GitHub Actions
      |
      v
Development/demo deployment
```

### Dockerization

Dockerization will provide a reproducible way to run SeatLock and the infrastructure required by the application.

The goal is not to build an unnecessarily complex container platform.

The Docker setup should make it straightforward to run the relevant components for development and demonstration.

### CI and GitHub Actions

GitHub Actions will automate important validation steps.

The intended CI workflow should cover the checks that already provide value during local development, including appropriate combinations of:

```text
Backend tests
Backend lint
Backend build
Frontend lint
Frontend build
```

The exact workflow can be refined during the CI implementation stage.

### Development/Demo Deployment

The final infrastructure milestone is a development/demo deployment.

The deployment should make the application accessible for:

- portfolio demonstration
- resume projects
- interview discussion
- architecture walkthroughs
- functional testing

The objective is a stable demonstrable environment rather than production-scale operational infrastructure.

The project intentionally stops short of infrastructure such as Kubernetes, multi-region deployment, enterprise observability platforms, or complex microservice decomposition because those components are outside the goals of this portfolio application.

---

## 29. Architecture Summary

SeatLock demonstrates a complete reservation architecture centered on transactional correctness.

The core consistency path is:

```text
Customer selects seats
        |
        v
Backend conditionally claims seats
        |
        v
Transactional temporary hold
        |
        v
Payment
        |
        v
Transactional booking
        |
        v
Seats permanently BOOKED
```

Real-time communication distributes committed seat-state changes to connected clients.

Scheduled cleanup releases abandoned holds.

JWT authentication establishes customer identity, while role-based authorization protects administrative operations.

Administrative workflows provide management of venues, screens, seats, and showtimes while preserving historical booking integrity.

Customers can revisit completed reservations through authenticated booking history.

The frontend provides English, Hindi, and Telugu localization together with light and dark themes across customer and administrative interfaces.

PostgreSQL remains the authoritative transactional store, Redis supports real-time infrastructure, Stripe handles payment processing, and Kafka demonstrates asynchronous event publishing through an outbox pattern.

The remaining work is operational rather than feature-oriented:

```text
Application features       COMPLETE
Documentation              COMPLETE
        |
        v
Dockerization
        |
        v
GitHub Actions / CI
        |
        v
Development/demo deployment
```

This architecture intentionally balances realistic engineering practices with the scope of a portfolio project, providing enough technical depth to demonstrate full-stack development, transactional consistency, concurrency handling, real-time systems, security, payments, event-driven architecture, localization, testing, and deployment.