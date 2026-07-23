import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import type { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { join } from "path";
import { AppModule } from "./app.module";
import { getCorsOrigins } from "./common/config/cors";
import { verifyStoragePath } from "./common/utils/crypto";
import { assertJwtSecretsConfigured } from "./modules/auth/jwt-secrets";

async function bootstrap(): Promise<void> {
  // Fail fast before DI wiring if production secrets are missing/placeholder.
  assertJwtSecretsConfigured({
    NODE_ENV: process.env["NODE_ENV"],
    JWT_SECRET: process.env["JWT_SECRET"],
    JWT_REFRESH_SECRET: process.env["JWT_REFRESH_SECRET"],
  });

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Security headers (CSP relaxed so the GraphQL sandbox works in dev)
  app.use(
    helmet({
      contentSecurityPolicy:
        process.env["NODE_ENV"] === "production" ? undefined : false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.getHttpAdapter().getInstance().disable("x-powered-by");

  app.setGlobalPrefix("api/v1");
  app.enableCors({
    origin: getCorsOrigins(),
    credentials: true,
  });

  // /storage files (agreements, receipts) require a valid HMAC-SHA256
  // signed URL — the API signs storage paths in its responses.
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

  const port = process.env["PORT"] ?? 3001;
  const host = process.env["HOST"] ?? "0.0.0.0";
  await app.listen(port, host);
  console.log(`PropOS API running on http://localhost:${port}/api/v1`);
  console.log(`Network API: http://<your-lan-ip>:${port}/api/v1`);
  console.log(`GraphQL playground: http://localhost:${port}/graphql`);
  console.log(`WebSocket events: ws://localhost:${port}/events`);
}

void bootstrap();
