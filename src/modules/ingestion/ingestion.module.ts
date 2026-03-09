import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { IngestionService } from './ingestion.service';
import { IngestionController } from './ingestion.controller';
import { EmbeddingsModule } from '../embeddings/embedding.module';

@Module({
  controllers: [IngestionController],
  providers: [PrismaService, IngestionService],
  exports: [IngestionService],
  imports: [EmbeddingsModule],
})
export class IngestionModule {}
