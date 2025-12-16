import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  const envOrigins = process.env.CORS_ORIGINS?.split(',') || [];
  const corsOrigins = [
    ...envOrigins,
    'http://localhost:3000',
    'https://sh-out.vercel.app',
  ];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Enable API versioning
  app.enableVersioning({
    type: VersioningType.URI,
  });

  // Enable global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
}
void bootstrap();
