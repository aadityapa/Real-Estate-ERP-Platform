import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";
import { AppModule } from "./app.module";
import { getCorsOrigins } from "./common/config/cors";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix("api/v1");
  app.enableCors({
    origin: getCorsOrigins(),
    credentials: true,
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
