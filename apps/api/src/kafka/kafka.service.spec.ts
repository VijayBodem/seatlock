import { jest } from '@jest/globals';

import { KafkaService } from './kafka.service.js';

describe('KafkaService', () => {
  const sendMock = jest.fn();
  const disconnectMock = jest.fn();

  const producerMock = {
    send: sendMock,
    disconnect: disconnectMock,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('publishes a domain event to Kafka', async () => {
    const service = new KafkaService(producerMock as never);

    await service.publishDomainEvent({
      key: 'Booking:11',
      value: '{"eventType":"BookingConfirmed"}',
    });

    expect(sendMock).toHaveBeenCalledWith({
      topic: 'seatlock.domain-events',
      messages: [
        {
          key: 'Booking:11',
          value: '{"eventType":"BookingConfirmed"}',
        },
      ],
    });
  });

  it('disconnects the Kafka producer during application shutdown', async () => {
    const service = new KafkaService(producerMock as never);

    await service.onApplicationShutdown();

    expect(disconnectMock).toHaveBeenCalledTimes(1);
  });
});
