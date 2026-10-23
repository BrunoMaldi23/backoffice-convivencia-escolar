import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../../database/database.service';
import { SessionGuard, CsrfGuard, PermissionsGuard } from '../../common/security/admin-guards';
import { RequirePermissions } from '../../common/security/require-permissions';

class AuditQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsString() @MaxLength(80) action?: string;
  @IsOptional() @IsString() @MaxLength(80) targetType?: string;
}
@ApiTags('audit') @ApiCookieAuth() @Controller('audit') @UseGuards(SessionGuard, CsrfGuard, PermissionsGuard)
export class AuditController {
  constructor(private readonly db: DatabaseService) {}
  @Get() @RequirePermissions('audit.read')
  async list(@Query() query: AuditQueryDto) {
    const where: Prisma.SecurityAuditWhereInput = { ...(query.action ? { action: query.action } : {}), ...(query.targetType ? { targetType: query.targetType } : {}) };
    const [items, total] = await this.db.$transaction([
      this.db.securityAudit.findMany({ where, select: { id: true, actorUserId: true, action: true, targetType: true, targetId: true, metadata: true, createdAt: true }, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.limit, take: query.limit }),
      this.db.securityAudit.count({ where })
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }
}
