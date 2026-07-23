import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Job, Queue, Worker, DelayedError, type ConnectionOptions } from "bullmq";
import { RedisService } from "../redis/redis.service";
import { TenantLimitsService } from "./tenant-limits.service";

export const TENANT_JOBS_QUEUE = "propos-tenant-jobs";

export interface TenantJobData {
  tenantId: string;
  kind: string;
  payload?: Record<string, unknown>;
}

/**
 * BullMQ queue with per-tenant concurrency caps (open-source BullMQ has no
 * group concurrency — we enforce via a Redis semaphore around processing).
 */
@Injectable()
export class TenantQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TenantQueueService.name);
  private queue: Queue<TenantJobData> | null = null;
  private worker: Worker<TenantJobData> | null = null;
  private connection: ConnectionOptions | null = null;

  /** In-memory active counts when Redis is unavailable (unit tests / local). */
  private readonly memoryActive = new Map<string, number>();

  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly limits: TenantLimitsService,
  ) {}

  async onModuleInit(): Promise<void> {
    const url = this.config.get<string>("REDIS_URL");
    if (!url) {
      this.logger.warn("REDIS_URL unset — tenant job queue disabled");
      return;
    }

    this.connection = { url, maxRetriesPerRequest: null };

    this.queue = new Queue<TenantJobData>(TENANT_JOBS_QUEUE, {
      connection: this.connection,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 200,
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
      },
    });

    // Lightweight worker so fairness is exercised in process; processors can
    // be registered later. Default handler is a no-op success.
    this.worker = new Worker<TenantJobData>(
      TENANT_JOBS_QUEUE,
      async (job) => this.processWithFairness(job),
      {
        connection: this.connection,
        concurrency: 10,
      },
    );

    this.worker.on("failed", (job, err) => {
      if (err.message === "TENANT_QUEUE_CONCURRENCY_DEFERRED") return;
      this.logger.warn(
        `Job ${job?.id} failed for tenant ${job?.data?.tenantId}: ${err.message}`,
      );
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close().catch(() => undefined);
    await this.queue?.close().catch(() => undefined);
    this.worker = null;
    this.queue = null;
  }

  isEnabled(): boolean {
    return this.queue != null;
  }

  async enqueue(
    tenantId: string,
    kind: string,
    payload?: Record<string, unknown>,
  ): Promise<{ id: string; queued: boolean } | null> {
    if (!this.queue) {
      return null;
    }
    const job = await this.queue.add(kind, {
      tenantId,
      kind,
      payload,
    });
    return { id: String(job.id), queued: true };
  }

  /**
   * Try to acquire one concurrency slot for the tenant.
   * Returns false when the tenant is already at its cap.
   */
  async tryAcquireSlot(tenantId: string): Promise<boolean> {
    const { limits } = await this.limits.getEffectiveLimits(tenantId);
    const max = Math.max(1, limits.queueConcurrency);
    const key = this.activeKey(tenantId);

    if (this.redis.isReady()) {
      const count = await this.redis.incr(key);
      if (count === 1) {
        await this.redis.expire(key, 600);
      }
      if (count > max) {
        await this.redis.decr(key);
        return false;
      }
      return true;
    }

    const current = this.memoryActive.get(tenantId) ?? 0;
    if (current >= max) return false;
    this.memoryActive.set(tenantId, current + 1);
    return true;
  }

  async releaseSlot(tenantId: string): Promise<void> {
    const key = this.activeKey(tenantId);
    if (this.redis.isReady()) {
      const next = await this.redis.decr(key);
      if (next < 0) {
        await this.redis.set(key, "0", 600);
      }
      return;
    }
    const current = this.memoryActive.get(tenantId) ?? 0;
    this.memoryActive.set(tenantId, Math.max(0, current - 1));
  }

  async getActiveCount(tenantId: string): Promise<number> {
    if (this.redis.isReady()) {
      const raw = await this.redis.get(this.activeKey(tenantId));
      const n = raw ? Number.parseInt(raw, 10) : 0;
      return Number.isFinite(n) && n > 0 ? n : 0;
    }
    return this.memoryActive.get(tenantId) ?? 0;
  }

  /** Exposed for tests — process a fake job through the fairness path. */
  async runFairJob(
    tenantId: string,
    work: () => Promise<void>,
  ): Promise<"ok" | "deferred"> {
    const acquired = await this.tryAcquireSlot(tenantId);
    if (!acquired) {
      return "deferred";
    }
    try {
      await work();
      return "ok";
    } finally {
      await this.releaseSlot(tenantId);
    }
  }

  clearMemoryForTests(): void {
    this.memoryActive.clear();
  }

  private async processWithFairness(job: Job<TenantJobData>): Promise<void> {
    const tenantId = job.data.tenantId;
    const acquired = await this.tryAcquireSlot(tenantId);
    if (!acquired) {
      // Defer without failing — other tenants keep making progress.
      await job.moveToDelayed(Date.now() + 500, job.token);
      throw new DelayedError();
    }
    try {
      this.logger.debug?.(
        `Processed ${job.data.kind} for tenant ${tenantId}`,
      );
    } finally {
      await this.releaseSlot(tenantId);
    }
  }

  private activeKey(tenantId: string): string {
    return `tenant:${tenantId}:queue:active`;
  }
}
