import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';
import { CaseAccessLevel } from '@prisma/client';
import { AdminRequest, CsrfGuard, PermissionsGuard, SessionGuard } from '../../common/security/admin-guards';
import { RequirePermissions } from '../../common/security/require-permissions';
import { InstitutionsService } from './institutions.service';

const context = (req: AdminRequest) => ({ ipAddress: req.ip, userAgent: req.get('user-agent') });
class CreateEstablishmentDto { @IsString() @MinLength(2) @MaxLength(40) code!: string; @IsString() @MinLength(3) @MaxLength(180) name!: string; @IsOptional() @IsString() @MaxLength(80) institutionalIdentifier?: string; }
class UpdateEstablishmentDto { @IsOptional() @IsString() @MinLength(3) @MaxLength(180) name?: string; @IsOptional() @IsString() @MaxLength(80) institutionalIdentifier?: string | null; @IsOptional() @IsBoolean() isActive?: boolean; }
class MembershipDto { @IsUUID() userId!: string; @IsBoolean() isActive!: boolean; }
class CreateStageDto { @IsString() @MinLength(2) @MaxLength(40) code!: string; @IsString() @MinLength(2) @MaxLength(120) name!: string; @Type(() => Number) @IsInt() @Min(1) displayOrder!: number; }
class UpdateStageDto { @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string; @IsOptional() @Type(() => Number) @IsInt() @Min(1) displayOrder?: number; @IsOptional() @IsBoolean() isActive?: boolean; }
class GrantDto { @IsUUID() userId!: string; @IsEnum(CaseAccessLevel) accessLevel!: CaseAccessLevel; @IsOptional() @IsDateString() expiresAt?: string; @IsOptional() @IsString() @MaxLength(500) reason?: string; }

@ApiTags('administración institucional') @ApiCookieAuth() @Controller() @UseGuards(SessionGuard, CsrfGuard, PermissionsGuard)
export class InstitutionsController {
  constructor(private readonly institutions: InstitutionsService) {}
  @Get('establishments') @RequirePermissions('institutions.read') @ApiOperation({ summary: 'Lista establecimientos institucionales' }) list() { return this.institutions.list(); }
  @Get('me/establishments') @ApiOperation({ summary: 'Establecimientos de los que la persona autenticada es miembro activa' }) mine(@Req() req: AdminRequest) { return this.institutions.mine(req.actorId!); }
  @Get('establishments/:id/stages') @ApiOperation({ summary: 'Etapas de expediente del establecimiento (miembros o administración)' }) stages(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string) { return this.institutions.listStages(req.actorId!, id); }
  @Get('establishments/:id/members') @ApiOperation({ summary: 'Personas con cuenta activa en el establecimiento (miembros o administración)' }) members(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string) { return this.institutions.members(req.actorId!, id); }
  @Post('establishments') @RequirePermissions('institutions.manage') @ApiOperation({ summary: 'Crea establecimiento sin registro público' }) create(@Req() req: AdminRequest, @Body() dto: CreateEstablishmentDto) { return this.institutions.create(req.actorId!, dto, context(req)); }
  @Patch('establishments/:id') @RequirePermissions('institutions.manage') update(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEstablishmentDto) { return this.institutions.update(req.actorId!, id, dto, context(req)); }
  @Post('establishments/:id/memberships') @RequirePermissions('institutions.manage') membership(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: MembershipDto) { return this.institutions.membership(req.actorId!, id, dto.userId, dto.isActive, context(req)); }
  @Post('establishments/:id/stages') @RequirePermissions('institutions.manage') stage(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateStageDto) { return this.institutions.stage(req.actorId!, id, dto, context(req)); }
  @Patch('establishments/:id/stages/:stageId') @RequirePermissions('institutions.manage') updateStage(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string, @Param('stageId', ParseUUIDPipe) stageId: string, @Body() dto: UpdateStageDto) { return this.institutions.updateStage(req.actorId!, id, stageId, dto, context(req)); }
  @Post('cases/:id/access-grants') @RequirePermissions('case-grants.manage') grant(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: GrantDto) { return this.institutions.grant(req.actorId!, id, dto.userId, dto.accessLevel, dto.expiresAt ? new Date(dto.expiresAt) : undefined, dto.reason, context(req)); }
  @Post('cases/:id/access-grants/:userId/revoke') @RequirePermissions('case-grants.manage') revoke(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string, @Param('userId', ParseUUIDPipe) userId: string) { return this.institutions.revokeGrant(req.actorId!, id, userId, context(req)); }
}
