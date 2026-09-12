import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient, type RedisClientType } from 'redis';
import type { Server, ServerOptions } from 'socket.io';

export class RedisIoAdapter extends IoAdapter {
  private pubClient: RedisClientType | null = null;
  private subClient: RedisClientType | null = null;

  constructor(app: INestApplicationContext) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

    const pubClient = createClient({
      url: redisUrl,
    });

    const subClient = pubClient.duplicate();

    pubClient.on('error', (error) => {
      console.error('Redis publisher error:', error);
    });

    subClient.on('error', (error) => {
      console.error('Redis subscriber error:', error);
    });

    try {
      await Promise.all([pubClient.connect(), subClient.connect()]);
    } catch (error) {
      await Promise.allSettled([
        this.closeRedisClient(pubClient),
        this.closeRedisClient(subClient),
      ]);

      throw error;
    }

    this.pubClient = pubClient;
    this.subClient = subClient;
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    if (!this.pubClient || !this.subClient) {
      throw new Error(
        'Redis clients are not connected. Call connectToRedis() before starting Socket.IO.',
      );
    }

    const server = super.createIOServer(port, options) as Server;

    server.adapter(createAdapter(this.pubClient, this.subClient));

    return server;
  }

  async close(server: Server): Promise<void> {
    await super.close(server);

    await Promise.allSettled([
      this.closeRedisClient(this.pubClient),
      this.closeRedisClient(this.subClient),
    ]);

    this.pubClient = null;
    this.subClient = null;
  }

  private async closeRedisClient(
    client: RedisClientType | null,
  ): Promise<void> {
    if (!client?.isOpen) {
      return;
    }

    await client.quit();
  }
}
