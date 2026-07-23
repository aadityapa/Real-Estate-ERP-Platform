import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

/**
 * Thin ioredis wrapper. Auth lockout and future cache/queue helpers share this.
 * When REDIS_URL is unset (unit tests), operations no-op / return null so callers
 * can fall back to in-memory maps if they choose.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.configService.get<string>("REDIS_URL");
    if (!url) {
      this.logger.warn("REDIS_URL not set — Redis features disabled");
      return;
    }
    this.client = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      lazyConnect: true,
    });
    this.client.on("error", (err) => {
      this.logger.warn(`Redis error: ${err.message}`);
    });
    try {
      await this.client.connect();
    } catch (err) {
      this.logger.warn(
        `Redis connect failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit().catch(() => undefined);
      this.client = null;
    }
  }

  isReady(): boolean {
    return this.client?.status === "ready";
  }

  async get(key: string): Promise<string | null> {
    if (!this.client || this.client.status !== "ready") return null;
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.client || this.client.status !== "ready") return;
    if (ttlSeconds != null && ttlSeconds > 0) {
      await this.client.set(key, value, "EX", ttlSeconds);
      return;
    }
    await this.client.set(key, value);
  }

  async incr(key: string): Promise<number> {
    if (!this.client || this.client.status !== "ready") return 0;
    return this.client.incr(key);
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    if (!this.client || this.client.status !== "ready") return;
    await this.client.expire(key, ttlSeconds);
  }

  async ttl(key: string): Promise<number> {
    if (!this.client || this.client.status !== "ready") return -2;
    return this.client.ttl(key);
  }

  async del(...keys: string[]): Promise<void> {
    if (!this.client || this.client.status !== "ready" || keys.length === 0) {
      return;
    }
    await this.client.del(...keys);
  }
}
