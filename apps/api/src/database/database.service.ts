import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  async onModuleInit() { await this.$connect(); this.logger.log('Conexión a PostgreSQL inicializada'); }
  async onModuleDestroy() { await this.$disconnect(); }
  async isHealthy(): Promise<boolean> { try { await this.$queryRaw`SELECT 1`; return true; } catch { return false; } }
}
