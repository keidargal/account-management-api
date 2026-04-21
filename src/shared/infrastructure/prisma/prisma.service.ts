import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Standard Prisma 6 client: connection string comes from DATABASE_URL (see prisma/schema.prisma).
 * No driver adapter — keeps the stack simple and matches typical Nest + Prisma deployments.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
