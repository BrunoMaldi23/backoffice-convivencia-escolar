import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../../database/database.service';

const sensitiveKey = /password|token|cookie|csrf|hash|secret|authorization/i;
const allowedUserChangeFields = new Set(['email', 'displayName', 'isActive', 'roles']);

export interface AuditRequestContext { ipAddress?: string; userAgent?: string }
export interface AuditEvent {
  actorUserId?: string;
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  changes?: Record<string, unknown>;
  context?: AuditRequestContext;
}

@Injectable()
export class SecurityAuditService {
  constructor(private readonly db: DatabaseService) {}

  async record(event: AuditEvent) {
    return this.db.securityAudit.create({ data: this.data(event) });
  }

  data(event: AuditEvent): Prisma.SecurityAuditCreateArgs['data'] {
    return {
      actorUserId: event.actorUserId,
      action: event.action,
      targetType: event.targetType,
      targetId: event.targetId,
      metadata: this.sanitize(event.metadata),
      changes: this.sanitize(event.changes),
      ipAddress: this.limit(event.context?.ipAddress, 64),
      userAgent: this.limit(event.context?.userAgent, 512)
    };
  }

  userChanges(before: Record<string, unknown>, after: Record<string, unknown>) {
    const changes: Record<string, unknown> = {};
    for (const field of allowedUserChangeFields) {
      if (JSON.stringify(before[field]) !== JSON.stringify(after[field])) {
        changes[field] = { before: before[field] ?? null, after: after[field] ?? null };
      }
    }
    return changes;
  }

  sanitize(value: unknown): Prisma.InputJsonValue | undefined {
    if (value === undefined) return undefined;
    return this.sanitizeValue(value) as Prisma.InputJsonValue;
  }

  private sanitizeValue(value: unknown): unknown {
    if (value === null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') return value;
    if (Array.isArray(value)) return value.map((item) => this.sanitizeValue(item));
    if (typeof value === 'object') {
      return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, sensitiveKey.test(key) ? '[REDACTED]' : this.sanitizeValue(item)]));
    }
    return String(value);
  }

  private limit(value: string | undefined, max: number) { return value ? value.slice(0, max) : undefined; }
}
