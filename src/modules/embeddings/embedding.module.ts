import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { EmbeddingsService } from './embedding.service';

@Module({
  providers: [PrismaService, EmbeddingsService],
  exports: [EmbeddingsService],
})
export class EmbeddingsModule {}
