import { jest } from '@jest/globals';
import type { RedisClientType } from 'redis';

import { RedisIoAdapter } from './redis-io.adapter.js';

describe('RedisIoAdapter', () => {
  it('throws if Socket.IO server creation happens before Redis connects', () => {
    const adapter = new RedisIoAdapter({} as never);

    expect(() => adapter.createIOServer(3000)).toThrow(
      'Redis clients are not connected. Call connectToRedis() before starting Socket.IO.',
    );
  });

  it('closes open Redis clients during shutdown', async () => {
    const adapter = new RedisIoAdapter({} as never);

    const pubQuit = jest.fn().mockResolvedValue(undefined);
    const subQuit = jest.fn().mockResolvedValue(undefined);

    const pubClient = {
      isOpen: true,
      quit: pubQuit,
    } as unknown as RedisClientType;

    const subClient = {
      isOpen: true,
      quit: subQuit,
    } as unknown as RedisClientType;

    adapter['pubClient'] = pubClient;
    adapter['subClient'] = subClient;

    const server = {
      close: jest.fn((callback: () => void) => callback()),
    };

    await adapter.close(server as never);

    expect(pubQuit).toHaveBeenCalledTimes(1);
    expect(subQuit).toHaveBeenCalledTimes(1);
    expect(adapter['pubClient']).toBeNull();
    expect(adapter['subClient']).toBeNull();
  });

  it('does not quit Redis clients that are already closed', async () => {
    const adapter = new RedisIoAdapter({} as never);

    const pubQuit = jest.fn();
    const subQuit = jest.fn();

    adapter['pubClient'] = {
      isOpen: false,
      quit: pubQuit,
    } as unknown as RedisClientType;

    adapter['subClient'] = {
      isOpen: false,
      quit: subQuit,
    } as unknown as RedisClientType;

    const server = {
      close: jest.fn((callback: () => void) => callback()),
    };

    await adapter.close(server as never);

    expect(pubQuit).not.toHaveBeenCalled();
    expect(subQuit).not.toHaveBeenCalled();
  });
});
