import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  Counter,
  Gauge,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from "prom-client";
import { PrismaService } from "../../../database/prisma.service";
import {
  TENANT_JOBS_QUEUE,
  TenantQueueService,
} from "../../limits/tenant-queue.service";

@Injectable()
export class MetricsService implements OnModuleInit, OnModuleDestroy {
  readonly registry = new Registry();

  private readonly httpRequestsTotal: Counter<string>;
  private readonly httpRequestDuration: Histogram<string>;
  private readonly queueDepth: Gauge<string>;
  private readonly dbPoolConnections: Gauge<string>;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly queue: TenantQueueService,
  ) {
    collectDefaultMetrics({
      register: this.registry,
      prefix: "propos_",
    });

    this.httpRequestsTotal = new Counter({
      name: "propos_http_requests_total",
      help: "Total HTTP requests",
      labelNames: ["method", "route", "status_code"],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: "propos_http_request_duration_seconds",
      help: "HTTP request duration in seconds",
      labelNames: ["method", "route", "status_code"],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    this.queueDepth = new Gauge({
      name: "propos_queue_depth",
      help: "BullMQ waiting + delayed job count",
      labelNames: ["queue"],
      registers: [this.registry],
    });

    this.dbPoolConnections = new Gauge({
      name: "propos_db_pool_connections",
      help: "Postgres backends for this database (approx pool usage)",
      labelNames: ["state"],
      registers: [this.registry],
    });
  }

  onModuleInit(): void {
    if (!this.isEnabled()) return;
    this.pollTimer = setInterval(() => {
      void this.refreshGauges();
    }, 15_000);
    this.pollTimer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  isEnabled(): boolean {
    const raw = this.config.get<string>("METRICS_ENABLED");
    return /^(1|true|yes|on)$/i.test(raw ?? "");
  }

  /** Shared secret for scrapers; empty means reject all when enabled. */
  getAccessToken(): string | undefined {
    const token = this.config.get<string>("METRICS_TOKEN")?.trim();
    return token || undefined;
  }

  observeHttp(
    method: string,
    route: string,
    statusCode: number,
    durationSeconds: number,
  ): void {
    if (!this.isEnabled()) return;
    const labels = {
      method,
      route: route.slice(0, 120),
      status_code: String(statusCode),
    };
    this.httpRequestsTotal.inc(labels);
    this.httpRequestDuration.observe(labels, durationSeconds);
  }

  async metricsText(): Promise<string> {
    await this.refreshGauges();
    return this.registry.metrics();
  }

  contentType(): string {
    return this.registry.contentType;
  }

  private async refreshGauges(): Promise<void> {
    if (!this.isEnabled()) return;

    try {
      const counts = await this.queue.getJobCounts();
      const depth =
        (counts?.waiting ?? 0) +
        (counts?.delayed ?? 0) +
        (counts?.active ?? 0);
      this.queueDepth.set({ queue: TENANT_JOBS_QUEUE }, depth);
    } catch {
      this.queueDepth.set({ queue: TENANT_JOBS_QUEUE }, 0);
    }

    try {
      const rows = await this.prisma.$queryRaw<
        Array<{ state: string; count: bigint }>
      >`
        SELECT state::text AS state, count(*)::bigint AS count
        FROM pg_stat_activity
        WHERE datname = current_database()
        GROUP BY state
      `;
      this.dbPoolConnections.reset();
      for (const row of rows) {
        this.dbPoolConnections.set(
          { state: row.state || "unknown" },
          Number(row.count),
        );
      }
    } catch {
      // DB may be down during scrape — leave last values / zeros.
    }
  }
}
