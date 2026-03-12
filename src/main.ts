import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'https://mindindex.mequiroga.com/',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    },
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('MindIndex API')
    .setDescription(
      'RAG (Retrieval-Augmented Generation) backend API. ' +
        'Supports document ingestion, semantic search, and AI-powered chat over your document collections.',
    )
    .setVersion('1.0')
    .addTag('Collections', 'Manage document collections')
    .addTag('Documents', 'Upload and manage PDF documents')
    .addTag('Chat', 'AI-powered chat over collections')
    .addTag('Retrieval', 'Semantic search over document chunks')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
