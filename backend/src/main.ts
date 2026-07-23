import "./common/observability/tracing-bootstrap";
import { NestFactory } from "@nestjs/core";
import { Logger, RequestMethod, ValidationPipe } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import type { Request, Response, NextFunction } from "express";
import { Logger as PinoLogger } from "nestjs-pino";
import helmet from "helmet";
import { join } from "path";
import { AppModule } from "./app.module";
import { getCorsOrigins } from "./common/config/cors";
import { requestIdMiddleware } from "./common/middleware/request-id.middleware";
import { requestLoggingMiddleware } from "./common/middleware/request-logging.middleware";
import { metricsHttpMiddleware } from "./common/observability/metrics/metrics.middleware";
import { MetricsService } from "./common/observability/metrics/metrics.service";
import { initSentry } from "./common/observability/sentry";
import { shutdownTracing } from "./common/observability/tracing";
import { verifyStoragePath } from "./common/utils/crypto";
import { assertProductionSecretsConfigured } from "./modules/auth/production-secrets";
import {
  assertProductionResidencyConfigured,
  assertStorageRegionAllowed,
} from "./common/residency/data-residency";

/** Explicit JSON/urlencoded ceiling (metadata APIs; uploads are not multipart here). */
const BODY_LIMIT = "1mb";

async function bootstrap(): Promise<void> {
  // Fail fast before DI wiring if production secrets are missing/placeholder.
  assertProductionSecretsConfigured({
    NODE_ENV: process.env["NODE_ENV"],
    JWT_SECRET: process.env["JWT_SECRET"],
    JWT_REFRESH_SECRET: process.env["JWT_REFRESH_SECRET"],
    STORAGE_URL_SECRET: process.env["STORAGE_URL_SECRET"],
    PII_ENCRYPTION_KEY: process.env["PII_ENCRYPTION_KEY"],
  });
  assertProductionResidencyConfigured(process.env);
  assertStorageRegionAllowed(process.env);

  initSentry();

  const isProd = process.env["NODE_ENV"] === "production";

  // Disable default parsers so we can set an explicit size limit.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
    bufferLogs: true,
  });

  app.useLogger(app.get(PinoLogger));

  // Stash raw body for Razorpay webhook HMAC verification (Prompt 5.1).
  app.useBodyParser("json", {
    limit: BODY_LIMIT,
    verify: (req: Request, _res: Response, buf: Buffer) => {
      (req as Request & { rawBody?: Buffer }).rawBody = buf;
    },
  });
  app.useBodyParser("urlencoded", { extended: true, limit: BODY_LIMIT });

  app.use(requestIdMiddleware);
  app.use(requestLoggingMiddleware);

  const metrics = app.get(MetricsService);
  app.use(metricsHttpMiddleware(metrics));

  // Security headers — CSP on in production; off in dev for GraphQL sandbox.
  app.use(
    helmet({
      contentSecurityPolicy: isProd
        ? {
            useDefaults: true,
            directives: {
              defaultSrc: ["'none'"],
              frameAncestors: ["'none'"],
              baseUri: ["'none'"],
              formAction: ["'none'"],
            },
          }
        : false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
      crossOriginOpenerPolicy: { policy: "same-origin" },
      referrerPolicy: { policy: "no-referrer" },
      hsts: isProd
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
    }),
  );
  app.getHttpAdapter().getInstance().disable("x-powered-by");

  app.setGlobalPrefix("api/v1", {
    exclude: [{ path: "metrics", method: RequestMethod.GET }],
  });
  app.enableCors({
    origin: getCorsOrigins(),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Request-Id",
      "Accept",
      "Origin",
    ],
    exposedHeaders: ["X-Request-Id"],
    maxAge: 86400,
  });

  // /storage files (agreements, receipts) require a valid HMAC-SHA256
  // signed URL — the API signs storage paths in its responses.
  // No public bucket listing; paths are never served without a signature.
  app.use("/storage", (req: Request, res: Response, next: NextFunction) => {
    const { exp, sig } = req.query as { exp?: string; sig?: string };
    const path = `/storage${req.path}`;
    if (!verifyStoragePath(path, exp, sig)) {
      res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Invalid or expired file link" },
      });
      return;
    }
    next();
  });
  app.useStaticAssets(join(process.cwd(), "storage"), { prefix: "/storage" });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableShutdownHooks();
  const logger = app.get(PinoLogger);
  process.once("SIGTERM", () => {
    void shutdownTracing();
  });

  const port = process.env["PORT"] ?? 3001;
  const host = process.env["HOST"] ?? "0.0.0.0";
  await app.listen(port, host);
  logger.log(
    {
      msg: "PropOS API listening",
      port: Number(port),
      host,
    },
    "Bootstrap",
  );
  // Keep console hints for local operators when pino level filters them out.
  if (process.env["NODE_ENV"] !== "production") {
    Logger.log(`PropOS API running on http://localhost:${port}/api/v1`, "Bootstrap");
    Logger.log(`GraphQL playground: http://localhost:${port}/graphql`, "Bootstrap");
  }
}

void bootstrap();
