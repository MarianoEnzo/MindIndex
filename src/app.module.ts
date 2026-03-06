import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ragConfig } from './common/config/reg.config';
import { PrismaService } from './common/prisma.service';
import { IngestionModule } from './modules/ingestion/ingestion.module';

@Module({
  imports: [
     ConfigModule.forRoot({
      isGlobal: true,
      load: [ragConfig],
    }),
  IngestionModule
  ],
  
  controllers: [],
  providers: [PrismaService],
  exports:[PrismaService]
})
export class AppModule {}
