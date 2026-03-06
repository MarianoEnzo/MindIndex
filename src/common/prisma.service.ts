import { Prisma, PrismaClient } from "@prisma/client";
import { OnModuleInit,OnModuleDestroy, Injectable} from "@nestjs/common";
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit,OnModuleDestroy{
    async onModuleInit() {
    await this.$connect();
    await this.$executeRaw`CREATE EXTENSION IF NOT EXISTS vector`;
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}