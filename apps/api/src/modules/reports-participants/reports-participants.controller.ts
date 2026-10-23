import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';
import { ParticipantKind } from '@prisma/client';
import { AdminRequest, CsrfGuard, PermissionsGuard, SessionGuard } from '../../common/security/admin-guards';
import { RequirePermissions } from '../../common/security/require-permissions';
import { ReportsParticipantsService } from './reports-participants.service';
const ctx = (r: AdminRequest) => ({ ipAddress: r.ip, userAgent: r.get('user-agent') });
class ReportDto { @IsDateString() receivedAt!: string; @IsString() @MinLength(2) @MaxLength(40) channelCode!: string; @IsString() @MinLength(2) @MaxLength(40) classificationCode!: string; @IsString() @MinLength(3) @MaxLength(4000) factualDescription!: string; @IsOptional() @IsString() @MaxLength(4000) background?: string; }
class UpdateReportDto { @Type(() => Number) @IsInt() @Min(1) expectedVersion!: number; @IsOptional() @IsString() @MaxLength(40) channelCode?: string; @IsOptional() @IsString() @MaxLength(40) classificationCode?: string; @IsOptional() @IsString() @MinLength(3) @MaxLength(4000) factualDescription?: string; @IsOptional() @IsString() @MaxLength(4000) background?: string | null; }
class VoidRecordDto { @Type(() => Number) @IsInt() @Min(1) expectedVersion!: number; @IsString() @MinLength(5) @MaxLength(1000) reason!: string; }
class VersionDto { @Type(() => Number) @IsInt() @Min(1) expectedVersion!: number; }
class ParticipantDto { @IsUUID() establishmentId!: string; @IsEnum(ParticipantKind) kind!: ParticipantKind; @IsOptional() @IsString() @MinLength(2) @MaxLength(160) referenceLabel?: string; @IsOptional() @IsUUID() studentId?: string; @IsOptional() @IsUUID() guardianId?: string; @IsOptional() @IsUUID() staffMemberId?: string; }
class LinkDto { @IsUUID() participantId!: string; @IsString() @MinLength(2) @MaxLength(40) participationCode!: string; }
class UpdateLinkDto { @Type(() => Number) @IsInt() @Min(1) expectedVersion!: number; @IsString() @MinLength(2) @MaxLength(40) participationCode!: string; }
@ApiTags('denuncias e involucrados') @ApiCookieAuth() @Controller() @UseGuards(SessionGuard, CsrfGuard, PermissionsGuard)
export class ReportsParticipantsController {
  constructor(private readonly service: ReportsParticipantsService) {}
  @Get('cases/:caseId/reports') @RequirePermissions('reports.read') listReports(@Req() r: AdminRequest, @Param('caseId', ParseUUIDPipe) id: string) { return this.service.listReports(r.actorId!, id); }
  @Post('cases/:caseId/reports') @RequirePermissions('reports.create') createReport(@Req() r: AdminRequest, @Param('caseId', ParseUUIDPipe) id: string, @Body() d: ReportDto) { return this.service.createReport(r.actorId!, id, { ...d, receivedAt: new Date(d.receivedAt) }, ctx(r)); }
  @Patch('cases/:caseId/reports/:id') @RequirePermissions('reports.update') updateReport(@Req() r: AdminRequest, @Param('caseId', ParseUUIDPipe) caseId: string, @Param('id', ParseUUIDPipe) id: string, @Body() d: UpdateReportDto) { return this.service.updateReport(r.actorId!, caseId, id, d, ctx(r)); }
  @Post('cases/:caseId/reports/:id/void') @RequirePermissions('reports.update') voidReport(@Req() r: AdminRequest, @Param('caseId', ParseUUIDPipe) caseId: string, @Param('id', ParseUUIDPipe) id: string, @Body() d: VoidRecordDto) { return this.service.voidReport(r.actorId!, caseId, id, d, ctx(r)); }
  @Delete('cases/:caseId/reports/:id') @RequirePermissions('reports.update') removeReport(@Req() r: AdminRequest, @Param('caseId', ParseUUIDPipe) caseId: string, @Param('id', ParseUUIDPipe) id: string, @Body() d: VersionDto) { return this.service.removeReport(r.actorId!, caseId, id, d.expectedVersion, ctx(r)); }
  @Post('participants') @RequirePermissions('participants.manage') createParticipant(@Req() r: AdminRequest, @Body() d: ParticipantDto) { return this.service.createParticipant(r.actorId!, d.establishmentId, d, ctx(r)); }
  @Get('cases/:caseId/participants') @RequirePermissions('participants.read') list(@Req() r: AdminRequest, @Param('caseId', ParseUUIDPipe) id: string) { return this.service.listParticipants(r.actorId!, id); }
  @Post('cases/:caseId/participants') @RequirePermissions('participants.manage') link(@Req() r: AdminRequest, @Param('caseId', ParseUUIDPipe) id: string, @Body() d: LinkDto) { return this.service.link(r.actorId!, id, d.participantId, d.participationCode, ctx(r)); }
  @Patch('cases/:caseId/participants/:linkId') @RequirePermissions('participants.manage') updateLink(@Req() r: AdminRequest, @Param('caseId', ParseUUIDPipe) id: string, @Param('linkId', ParseUUIDPipe) linkId: string, @Body() d: UpdateLinkDto) { return this.service.updateLink(r.actorId!, id, linkId, d, ctx(r)); }
  @Post('cases/:caseId/participants/:linkId/unlink') @RequirePermissions('participants.manage') unlink(@Req() r: AdminRequest, @Param('caseId', ParseUUIDPipe) id: string, @Param('linkId', ParseUUIDPipe) linkId: string) { return this.service.unlink(r.actorId!, id, linkId, ctx(r)); }
}
