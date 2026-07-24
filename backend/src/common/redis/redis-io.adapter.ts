import { INestApplication, Logger } from "@nestjs/common";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import type { ServerOptions } from "socket.io";

/**
 * Socket.IO Redis adapter so `/events` fans out across horizontally scaled
 * API instances. Falls back to in-memory when REDIS_URL is unset.
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;
  private pubClient: Redis | null = null;
  private subClient: Redis | null = null;

  constructor(
    app: INestApplication,
    private readonly redisUrl: string | undefined,
  ) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    if (!this.redisUrl) {
      this.logger.warn("REDIS_URL unset — Socket.IO using in-memory adapter");
      return;
    }
    try {
      this.pubClient = new Redis(this.redisUrl, {
        maxRetriesPerRequest: 1,
        lazyConnect: true,
      });
      this.subClient = this.pubClient.duplicate();
      this.pubClient.on("error", (err) => {
        this.logger.warn(`Redis pub error: ${err.message}`);
      });
      this.subClient.on("error", (err) => {
        this.logger.warn(`Redis sub error: ${err.message}`);
      });
      await Promise.all([this.pubClient.connect(), this.subClient.connect()]);
      this.adapterConstructor = createAdapter(this.pubClient, this.subClient);
      this.logger.log("Socket.IO Redis adapter ready");
    } catch (err) {
      this.logger.warn(
        `Socket.IO Redis adapter failed — falling back to memory: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      this.adapterConstructor = null;
    }
  }

  override createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }

  override async close(): Promise<void> {
    await Promise.all([
      this.pubClient?.quit().catch(() => undefined),
      this.subClient?.quit().catch(() => undefined),
    ]);
  }
}
