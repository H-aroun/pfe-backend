import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Global validation pipe — enforces all DTO class-validator decorators
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Serve uploaded files statically at /uploads/<filename>
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads',
  });

  app.enableCors({
    origin: 'http://localhost:3000', // Add your actual frontend domains
    methods: 'GET,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept, Authorization',
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('PFE App – Plateforme de Scénarisation Pédagogique')
    .setDescription('API REST complète pour la plateforme PFE')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT bearer token',
        in: 'header',
      },
      'access-token',
    )
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  await app.listen(3001, '127.0.0.1');
  console.log('🚀 Server running on http://localhost:3001');
  console.log('📚 Swagger docs at http://localhost:3001/api');
}
// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
