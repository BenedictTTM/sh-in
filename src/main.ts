import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  let app;
  try {
    app = await NestFactory.create(AppModule);
  } catch (error) {
    console.error('❌ Failed to start application:', error.message);
    console.error('   Tip: Make sure your database is reachable and DATABASE_URL is set correctly.');
    process.exit(1);
  }


  const envOrigins = process.env.CORS_ORIGINS?.split(',') || [];
  const corsOrigins = [
    ...envOrigins,
    'http://localhost:3000',
    'https://sh-out.vercel.app',
    'https://admin-one-kohl.vercel.app'
  ];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });


  app.enableVersioning({
    type: VersioningType.URI,
  });


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
bootstrap().catch((err) => {
  console.error('❌ Unhandled bootstrap error:', err.message);
  process.exit(1);
});
