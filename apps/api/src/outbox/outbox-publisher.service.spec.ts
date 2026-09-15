import { jest } from '@jest/globals';

import { OutboxPublisherService } from './outbox-publisher.service.js';

describe('OutboxPublisherService', () => {
  const allMock = jest.fn();
  const updateMock = jest.fn();
  const whereMock = jest.fn();
  const publishDomainEventMock = jest.fn();

  const databaseMock = {
    orm: {
      public: {
        OutboxEvent: {
          where: whereMock,
        },
      },
    },
  };

  const kafkaServiceMock = {
    publishDomainEvent: publishDomainEventMock,
  };

  const pendingEvent = {
    id: 1,
    eventType: 'BookingConfirmed',
    aggregateType: 'Booking',
    aggregateId: '11',
    payload: {
      bookingId: 11,
      holdId: 91,
      showtimeId: 20,
      userId: 7,
      seatIds: [568],
      occurredAt: '2026-09-15T10:40:56.000Z',
    },
    attempts: 0,
    nextAttemptAt: null,
    claimedAt: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    whereMock.mockImplementation((condition) => {
      if ('id' in condition) {
        return {
          update: updateMock,
        };
      }

      return {
        all: allMock,
      };
    });
  });

  it('claims, publishes, and marks a pending event as published', async () => {
    allMock.mockResolvedValue([pendingEvent]);

    updateMock
      .mockResolvedValueOnce({
        ...pendingEvent,
        claimedBy: 'instance-id',
        claimedAt: '2026-09-15T11:00:00.000Z',
        publishedAt: null,
        lastError: null,
      })
      .mockResolvedValueOnce({
        ...pendingEvent,
        publishedAt: '2026-09-15T11:00:01.000Z',
      });

    publishDomainEventMock.mockResolvedValue(undefined);

    const service = new OutboxPublisherService(
      databaseMock as never,
      kafkaServiceMock as never,
    );

    await service.publishPendingEvents();

    expect(publishDomainEventMock).toHaveBeenCalledTimes(1);

    expect(publishDomainEventMock).toHaveBeenCalledWith({
      key: 'Booking:11',
      value: JSON.stringify({
        id: 1,
        eventType: 'BookingConfirmed',
        aggregateType: 'Booking',
        aggregateId: '11',
        payload: pendingEvent.payload,
      }),
    });

    expect(updateMock).toHaveBeenCalledTimes(2);

    expect(updateMock).toHaveBeenLastCalledWith({
      publishedAt: expect.any(String),
      claimedBy: null,
      claimedAt: null,
      nextAttemptAt: null,
      lastError: null,
    });
  });

  it('does not publish when another instance wins the claim', async () => {
    allMock.mockResolvedValue([pendingEvent]);

    updateMock.mockResolvedValueOnce(null);

    const service = new OutboxPublisherService(
      databaseMock as never,
      kafkaServiceMock as never,
    );

    await service.publishPendingEvents();

    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(publishDomainEventMock).not.toHaveBeenCalled();
  });

  it('skips an event with an active lease', async () => {
    allMock.mockResolvedValue([
      {
        ...pendingEvent,
        claimedAt: new Date().toISOString(),
      },
    ]);

    const service = new OutboxPublisherService(
      databaseMock as never,
      kafkaServiceMock as never,
    );

    await service.publishPendingEvents();

    expect(updateMock).not.toHaveBeenCalled();
    expect(publishDomainEventMock).not.toHaveBeenCalled();
  });

  it('recovers and publishes an event with a stale lease', async () => {
    const staleClaimedAt = new Date(Date.now() - 60_000).toISOString();

    allMock.mockResolvedValue([
      {
        ...pendingEvent,
        claimedAt: staleClaimedAt,
      },
    ]);

    updateMock
      .mockResolvedValueOnce({
        ...pendingEvent,
        claimedBy: 'new-instance-id',
        claimedAt: new Date().toISOString(),
        publishedAt: null,
        lastError: null,
      })
      .mockResolvedValueOnce({
        ...pendingEvent,
        publishedAt: new Date().toISOString(),
      });

    publishDomainEventMock.mockResolvedValue(undefined);

    const service = new OutboxPublisherService(
      databaseMock as never,
      kafkaServiceMock as never,
    );

    await service.publishPendingEvents();

    expect(updateMock).toHaveBeenCalledTimes(2);
    expect(publishDomainEventMock).toHaveBeenCalledTimes(1);

    expect(whereMock).toHaveBeenCalledWith({
      id: 1,
      publishedAt: null,
      claimedAt: staleClaimedAt,
      nextAttemptAt: null,
    });
  });

  it('skips an event whose retry time has not arrived', async () => {
    allMock.mockResolvedValue([
      {
        ...pendingEvent,
        nextAttemptAt: new Date(Date.now() + 60_000).toISOString(),
      },
    ]);

    const service = new OutboxPublisherService(
      databaseMock as never,
      kafkaServiceMock as never,
    );

    await service.publishPendingEvents();

    expect(updateMock).not.toHaveBeenCalled();
    expect(publishDomainEventMock).not.toHaveBeenCalled();
  });

  it('publishes an event when its retry time has arrived', async () => {
    const nextAttemptAt = new Date(Date.now() - 1_000).toISOString();

    allMock.mockResolvedValue([
      {
        ...pendingEvent,
        nextAttemptAt,
      },
    ]);

    updateMock
      .mockResolvedValueOnce({
        ...pendingEvent,
        nextAttemptAt,
        claimedBy: 'instance-id',
        claimedAt: new Date().toISOString(),
        publishedAt: null,
        lastError: 'Previous Kafka failure',
      })
      .mockResolvedValueOnce({
        ...pendingEvent,
        publishedAt: new Date().toISOString(),
      });

    publishDomainEventMock.mockResolvedValue(undefined);

    const service = new OutboxPublisherService(
      databaseMock as never,
      kafkaServiceMock as never,
    );

    await service.publishPendingEvents();

    expect(publishDomainEventMock).toHaveBeenCalledTimes(1);

    expect(whereMock).toHaveBeenCalledWith({
      id: 1,
      publishedAt: null,
      claimedAt: null,
      nextAttemptAt,
    });

    expect(updateMock).toHaveBeenLastCalledWith({
      publishedAt: expect.any(String),
      claimedBy: null,
      claimedAt: null,
      nextAttemptAt: null,
      lastError: null,
    });
  });

  it('records a Kafka failure, schedules retry, and releases the claim', async () => {
    allMock.mockResolvedValue([
      {
        ...pendingEvent,
        attempts: 2,
      },
    ]);

    updateMock
      .mockResolvedValueOnce({
        ...pendingEvent,
        attempts: 2,
        claimedBy: 'instance-id',
        claimedAt: '2026-09-15T11:00:00.000Z',
        publishedAt: null,
        lastError: null,
      })
      .mockResolvedValueOnce({
        ...pendingEvent,
        attempts: 3,
      });

    publishDomainEventMock.mockRejectedValue(new Error('Kafka unavailable'));

    const beforePublish = Date.now();

    const service = new OutboxPublisherService(
      databaseMock as never,
      kafkaServiceMock as never,
    );

    await service.publishPendingEvents();

    const afterPublish = Date.now();

    expect(publishDomainEventMock).toHaveBeenCalledTimes(1);

    expect(updateMock).toHaveBeenCalledTimes(2);

    const failureUpdate = updateMock.mock.calls[1][0] as {
      attempts: number;
      lastError: string;
      nextAttemptAt: string;
      claimedBy: null;
      claimedAt: null;
    };

    expect(failureUpdate.attempts).toBe(3);
    expect(failureUpdate.lastError).toBe('Kafka unavailable');
    expect(failureUpdate.claimedBy).toBeNull();
    expect(failureUpdate.claimedAt).toBeNull();

    const nextAttemptAt = new Date(failureUpdate.nextAttemptAt).getTime();

    expect(nextAttemptAt).toBeGreaterThanOrEqual(beforePublish + 8_000);
    expect(nextAttemptAt).toBeLessThanOrEqual(afterPublish + 8_000);

    expect(updateMock).not.toHaveBeenCalledWith(
      expect.objectContaining({
        publishedAt: expect.anything(),
      }),
    );
  });

  it('caps retry backoff at 60 seconds', async () => {
    allMock.mockResolvedValue([
      {
        ...pendingEvent,
        attempts: 10,
      },
    ]);

    updateMock
      .mockResolvedValueOnce({
        ...pendingEvent,
        attempts: 10,
        claimedBy: 'instance-id',
        claimedAt: new Date().toISOString(),
        publishedAt: null,
        lastError: null,
      })
      .mockResolvedValueOnce({
        ...pendingEvent,
        attempts: 11,
      });

    publishDomainEventMock.mockRejectedValue(new Error('Kafka unavailable'));

    const beforePublish = Date.now();

    const service = new OutboxPublisherService(
      databaseMock as never,
      kafkaServiceMock as never,
    );

    await service.publishPendingEvents();

    const afterPublish = Date.now();

    const failureUpdate = updateMock.mock.calls[1][0] as {
      nextAttemptAt: string;
    };

    const nextAttemptAt = new Date(failureUpdate.nextAttemptAt).getTime();

    expect(nextAttemptAt).toBeGreaterThanOrEqual(beforePublish + 60_000);
    expect(nextAttemptAt).toBeLessThanOrEqual(afterPublish + 60_000);
  });
});
