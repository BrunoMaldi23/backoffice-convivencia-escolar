import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiConflictResponse, ApiCookieAuth, ApiForbiddenResponse, ApiNotFoundResponse, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags, ApiTooManyRequestsResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import { CaseStatus } from '@prisma/client';
import { AdminRequest, CsrfGuard, PermissionsGuard, SessionGuard } from '../../common/security/admin-guards';
import { RequirePermissions } from '../../common/security/require-permissions';
import { CasesService } from './cases.service';

const auditContext = (req: AdminRequest) => ({ ipAddress: req.ip, userAgent: req.get('user-agent') });
class CreateCaseDto {
  @ApiProperty() @IsUUID() establishmentId!: string;
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(180) title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) initialDescription?: string;
  @ApiProperty() @IsDateString() receivedAt!: string;
  @ApiProperty() @IsString() @MaxLength(50) categoryCode!: string;
  @ApiProperty() @IsString() @MaxLength(40) priority!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() currentStageId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() responsibleUserId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) nextAction?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() nextActionDueAt?: string;
}
class UpdateCaseDto {
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) expectedVersion!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(3) @MaxLength(180) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) categoryCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) priority?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() receivedAt?: string;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsUUID() currentStageId?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(500) nextAction?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsDateString() nextActionDueAt?: string | null;
}
class AssignCaseDto { @ApiProperty() @IsUUID() responsibleUserId!: string; @ApiProperty() @Type(() => Number) @IsInt() @Min(1) expectedVersion!: number; @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) reason?: string; }
class TransitionCaseDto { @ApiProperty({ enum: CaseStatus }) @IsEnum(CaseStatus) toStatus!: CaseStatus; @ApiProperty() @Type(() => Number) @IsInt() @Min(1) expectedVersion!: number; @ApiPropertyOptional() @IsOptional() @IsUUID() stageId?: string; @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) reason?: string; }
class ListCasesDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() establishmentId?: string;
  @ApiPropertyOptional({ enum: CaseStatus }) @IsOptional() @IsEnum(CaseStatus) status?: CaseStatus;
  @ApiPropertyOptional() @IsOptional() @IsUUID() responsibleUserId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) priority?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() stageId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() to?: string;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ default: 20 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}
class PageDto { @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1; @ApiPropertyOptional({ default: 50 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 50; }

@ApiTags('cases') @ApiCookieAuth() @ApiUnauthorizedResponse({ description: 'Sesión ausente, vencida o revocada' }) @ApiForbiddenResponse({ description: 'CSRF o permiso insuficiente' }) @ApiNotFoundResponse({ description: 'Expediente o establecimiento no disponible' }) @ApiTooManyRequestsResponse({ description: 'Límite de solicitudes excedido' }) @Controller('cases') @UseGuards(SessionGuard, CsrfGuard, PermissionsGuard)
export class CasesController {
  constructor(private readonly cases: CasesService) {}
  @Post() @RequirePermissions('cases.create') @ApiOperation({ summary: 'Crea un expediente', description: 'Requiere cases.create y membresía activa en el establecimiento.' }) @ApiBadRequestResponse({ description: 'Datos o etapa inválidos' })
  create(@Req() req: AdminRequest, @Body() dto: CreateCaseDto) { return this.cases.create(req.actorId!, { ...dto, receivedAt: new Date(dto.receivedAt), nextActionDueAt: dto.nextActionDueAt ? new Date(dto.nextActionDueAt) : undefined }, auditContext(req)); }
  @Get() @RequirePermissions('cases.read') @ApiOperation({ summary: 'Lista expedientes autorizados', description: 'La respuesta se restringe por membresía y acceso contextual.' })
  list(@Req() req: AdminRequest, @Query() q: ListCasesDto) { return this.cases.list(req.actorId!, { ...q, from: q.from ? new Date(q.from) : undefined, to: q.to ? new Date(q.to) : undefined }); }
  @Get(':id') @RequirePermissions('cases.read') @ApiOperation({ summary: 'Obtiene un expediente autorizado' })
  get(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string) { return this.cases.get(req.actorId!, id); }
  @Patch(':id') @RequirePermissions('cases.update') @ApiConflictResponse({ description: 'Versión obsoleta' })
  update(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCaseDto) { return this.cases.update(req.actorId!, id, { ...dto, receivedAt: dto.receivedAt ? new Date(dto.receivedAt) : undefined, nextActionDueAt: dto.nextActionDueAt === null ? null : dto.nextActionDueAt ? new Date(dto.nextActionDueAt) : undefined }, auditContext(req)); }
  @Post(':id/assign') @RequirePermissions('cases.assign') @ApiConflictResponse({ description: 'Versión obsoleta' })
  assign(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignCaseDto) { return this.cases.assign(req.actorId!, id, dto, auditContext(req)); }
  @Post(':id/transition') @RequirePermissions('cases.transition') @ApiBadRequestResponse({ description: 'Transición o motivo inválido' }) @ApiConflictResponse({ description: 'Versión obsoleta' })
  transition(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: TransitionCaseDto) { return this.cases.transition(req.actorId!, id, dto, auditContext(req)); }
  @Get(':id/timeline') @RequirePermissions('cases.timeline.read') @ApiOperation({ summary: 'Consulta línea de tiempo inmutable' })
  timeline(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string, @Query() q: PageDto) { return this.cases.timeline(req.actorId!, id, q.page, q.limit); }
}
