import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ragConfig } from './common/config/reg.config';
import { PrismaService } from './common/prisma.service';
import { ChatModule } from './modules/chat/chat.module';
import { EmbeddingsModule } from './modules/embeddings/embedding.module';
import { IngestionModule } from './modules/ingestion/ingestion.module';
import { RetrievalModule } from './modules/retrieval/retriver.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [ragConfig],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    EmbeddingsModule,
    IngestionModule,
    RetrievalModule,
    ChatModule,
  ],
  controllers: [],
  providers: [
    PrismaService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  exports: [PrismaService],
})
export class AppModule {}
