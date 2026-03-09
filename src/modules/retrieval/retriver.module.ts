import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { EmbeddingsModule } from '../embeddings/embedding.module';
import { RetrievalController } from './retrieval.controller';
import { RetrievalService } from './retrieval.service';

@Module({
  controllers: [RetrievalController],
  providers: [PrismaService, RetrievalService],
  exports: [RetrievalService],
  imports: [EmbeddingsModule],
})
export class RetrievalModule {}
