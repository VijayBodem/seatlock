import { RedisIoAdapter } from './redis-io.adapter.js';

describe('RedisIoAdapter', () => {
  it('throws if Socket.IO server creation happens before Redis connects', () => {
    const adapter = new RedisIoAdapter({} as never);

    expect(() => adapter.createIOServer(3000)).toThrow(
      'Redis clients are not connected. Call connectToRedis() before starting Socket.IO.',
    );
  });
});
