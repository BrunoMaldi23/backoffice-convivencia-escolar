import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCookieAuth, ApiForbiddenResponse, ApiOkResponse, ApiTags, ApiTooManyRequestsResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../../database/database.service';
import { SessionGuard, CsrfGuard, PermissionsGuard } from '../../common/security/admin-guards';
import { RequirePermissions } from '../../common/security/require-permissions';
import { SecurityAuditService } from '../../common/security/security-audit.service';

class AuditQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsString() @MaxLength(80) action?: string;
  @IsOptional() @IsString() @MaxLength(80) targetType?: string;
}
@ApiTags('audit') @ApiCookieAuth() @ApiUnauthorizedResponse({ description: 'Sesión ausente, vencida o revocada' }) @ApiForbiddenResponse({ description: 'Permiso audit.read insuficiente' }) @ApiTooManyRequestsResponse({ description: 'Límite de solicitudes excedido' }) @Controller('audit') @UseGuards(SessionGuard, CsrfGuard, PermissionsGuard)
export class AuditController {
  constructor(private readonly db: DatabaseService, private readonly audit: SecurityAuditService) {}
  @Get() @RequirePermissions('audit.read') @ApiOkResponse({ description: 'Página de eventos de auditoría sanitizados' }) @ApiBadRequestResponse({ description: 'Paginación o filtros inválidos' })
  async list(@Query() query: AuditQueryDto) {
    const where: Prisma.SecurityAuditWhereInput = { ...(query.action ? { action: query.action } : {}), ...(query.targetType ? { targetType: query.targetType } : {}) };
    const [items, total] = await this.db.$transaction([
      this.db.securityAudit.findMany({ where, select: { id: true, actorUserId: true, action: true, targetType: true, targetId: true, metadata: true, changes: true, ipAddress: true, userAgent: true, createdAt: true }, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.limit, take: query.limit }),
      this.db.securityAudit.count({ where })
    ]);
    return { items: items.map((item) => ({ ...item, metadata: this.audit.sanitize(item.metadata), changes: this.audit.sanitize(item.changes) })), total, page: query.page, limit: query.limit };
  }
}
