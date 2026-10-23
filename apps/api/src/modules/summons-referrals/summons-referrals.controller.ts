import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';
import { ReferralStatus, SummonsStatus } from '@prisma/client';
import { PageQueryDto } from '../../common/pagination';
import { AdminRequest, CsrfGuard, PermissionsGuard, SessionGuard } from '../../common/security/admin-guards';
import { RequirePermissions } from '../../common/security/require-permissions';
import { SummonsReferralsService } from './summons-referrals.service';

const context = (req: AdminRequest) => ({ ipAddress: req.ip, userAgent: req.get('user-agent') });
const version = () => ApiProperty({ description: 'Versión leída; si cambió, la API responde 409' });

class CreateSummonsDto {
  @ApiPropertyOptional({ description: 'Involucrado del expediente al que se cita' }) @IsOptional() @IsUUID() participantId?: string;
  @ApiPropertyOptional({ description: 'Texto del destinatario; obligatorio si no se indica involucrado' }) @IsOptional() @IsString() @MinLength(2) @MaxLength(160) recipientLabel?: string;
  @ApiProperty() @IsDateString() scheduledAt!: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(200) location!: string;
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(1000) reason!: string;
}
class UpdateSummonsDto {
  @version() @Type(() => Number) @IsInt() @Min(1) expectedVersion!: number;
  @ApiPropertyOptional({ enum: SummonsStatus }) @IsOptional() @IsEnum(SummonsStatus) status?: SummonsStatus;
  @ApiPropertyOptional() @IsOptional() @IsDateString() scheduledAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) @MaxLength(200) location?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(3) @MaxLength(1000) reason?: string;
  @ApiPropertyOptional({ description: 'Resultado de la reunión o motivo de cancelación' }) @IsOptional() @IsString() @MaxLength(2000) outcomeNote?: string;
}
class ListSummonsDto extends PageQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() establishmentId?: string;
  @ApiPropertyOptional({ enum: SummonsStatus }) @IsOptional() @IsEnum(SummonsStatus) status?: SummonsStatus;
  @ApiPropertyOptional() @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() to?: string;
}
class CreateReferralDto {
  @ApiProperty({ example: 'SALUD' }) @IsString() @MinLength(2) @MaxLength(40) typeCode!: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(200) institutionName!: string;
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(2000) reason!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) contactName?: string;
}
class UpdateReferralDto {
  @version() @Type(() => Number) @IsInt() @Min(1) expectedVersion!: number;
  @ApiPropertyOptional({ description: 'Solo mientras la derivación esté pendiente' }) @IsOptional() @IsString() @MinLength(2) @MaxLength(40) typeCode?: string;
  @ApiPropertyOptional({ description: 'Solo mientras la derivación esté pendiente' }) @IsOptional() @IsString() @MinLength(2) @MaxLength(200) institutionName?: string;
  @ApiPropertyOptional({ description: 'Solo mientras la derivación esté pendiente' }) @IsOptional() @IsString() @MinLength(3) @MaxLength(2000) reason?: string;
  @ApiPropertyOptional({ enum: ReferralStatus }) @IsOptional() @IsEnum(ReferralStatus) status?: ReferralStatus;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(160) contactName?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(2000) responseNote?: string | null;
}
class ListReferralsDto extends PageQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() establishmentId?: string;
  @ApiPropertyOptional({ enum: ReferralStatus }) @IsOptional() @IsEnum(ReferralStatus) status?: ReferralStatus;
}

@ApiTags('citaciones y derivaciones') @ApiCookieAuth() @Controller() @UseGuards(SessionGuard, CsrfGuard, PermissionsGuard)
export class SummonsReferralsController {
  constructor(private readonly service: SummonsReferralsService) {}

  @Get('summons') @RequirePermissions('summons.read') @ApiOperation({ summary: 'Citaciones de los expedientes que la persona puede ver' })
  summons(@Req() req: AdminRequest, @Query() q: ListSummonsDto) { return this.service.listSummons(req.actorId!, { ...q, from: q.from ? new Date(q.from) : undefined, to: q.to ? new Date(q.to) : undefined }); }
  @Get('cases/:caseId/summons') @RequirePermissions('summons.read') @ApiOperation({ summary: 'Citaciones de un expediente' })
  caseSummons(@Req() req: AdminRequest, @Param('caseId', ParseUUIDPipe) caseId: string) { return this.service.listCaseSummons(req.actorId!, caseId); }
  @Post('cases/:caseId/summons') @RequirePermissions('summons.manage') @ApiOperation({ summary: 'Registra una citación a reunión' })
  createSummons(@Req() req: AdminRequest, @Param('caseId', ParseUUIDPipe) caseId: string, @Body() dto: CreateSummonsDto) { return this.service.createSummons(req.actorId!, caseId, { ...dto, scheduledAt: new Date(dto.scheduledAt) }, context(req)); }
  @Post('cases/:caseId/summons/:id/update') @RequirePermissions('summons.manage') @ApiOperation({ summary: 'Reprograma o cierra una citación (con control de versión)' })
  updateSummons(@Req() req: AdminRequest, @Param('caseId', ParseUUIDPipe) caseId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSummonsDto) { return this.service.updateSummons(req.actorId!, caseId, id, { ...dto, scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined }, context(req)); }

  @Get('referrals') @RequirePermissions('referrals.read') @ApiOperation({ summary: 'Derivaciones de los expedientes que la persona puede ver' })
  referrals(@Req() req: AdminRequest, @Query() q: ListReferralsDto) { return this.service.listReferrals(req.actorId!, q); }
  @Get('cases/:caseId/referrals') @RequirePermissions('referrals.read') @ApiOperation({ summary: 'Derivaciones de un expediente' })
  caseReferrals(@Req() req: AdminRequest, @Param('caseId', ParseUUIDPipe) caseId: string) { return this.service.listCaseReferrals(req.actorId!, caseId); }
  @Post('cases/:caseId/referrals') @RequirePermissions('referrals.manage') @ApiOperation({ summary: 'Registra una derivación a una institución externa' })
  createReferral(@Req() req: AdminRequest, @Param('caseId', ParseUUIDPipe) caseId: string, @Body() dto: CreateReferralDto) { return this.service.createReferral(req.actorId!, caseId, dto, context(req)); }
  @Post('cases/:caseId/referrals/:id/update') @RequirePermissions('referrals.manage') @ApiOperation({ summary: 'Avanza o cierra una derivación (con control de versión)' })
  updateReferral(@Req() req: AdminRequest, @Param('caseId', ParseUUIDPipe) caseId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateReferralDto) { return this.service.updateReferral(req.actorId!, caseId, id, dto, context(req)); }
}
