import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { IngestionService } from './ingestion.service';
import { IngestionController } from './ingestion.controller';

@Module({
  controllers: [IngestionController],
  providers: [PrismaService, IngestionService],
  exports: [IngestionService],
})
export class IngestionModule {}