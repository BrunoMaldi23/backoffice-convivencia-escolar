import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
@Injectable()
export class HealthService {
  constructor(private readonly database: DatabaseService) {}
  async check() { const connected = await this.database.isHealthy(); if (!connected) throw new ServiceUnavailableException({ status: 'error', database: 'disconnected', timestamp: new Date().toISOString() }); return { status: 'ok' as const, database: 'connected' as const, timestamp: new Date().toISOString() }; }
}
