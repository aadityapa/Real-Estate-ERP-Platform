import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix("api/v1");
  app.enableCors({
    origin: process.env["APP_URL"] ?? "http://localhost:3000",
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
  await app.listen(port);
  console.log(`PropOS API running on http://localhost:${port}/api/v1`);
  console.log(`GraphQL playground: http://localhost:${port}/graphql`);
  console.log(`WebSocket events: ws://localhost:${port}/events`);
}

void bootstrap();
