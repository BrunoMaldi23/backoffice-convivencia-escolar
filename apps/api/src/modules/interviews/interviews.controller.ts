import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { AdminRequest, CsrfGuard, PermissionsGuard, SessionGuard } from '../../common/security/admin-guards';
import { RequirePermissions } from '../../common/security/require-permissions';
import { InterviewsService } from './interviews.service';
const context = (request: AdminRequest) => ({ ipAddress: request.ip, userAgent: request.get('user-agent') });
class InterviewDto { @IsDateString() occurredAt!: string; @IsString() @MinLength(2) @MaxLength(40) modalityCode!: string; @IsString() @MinLength(3) @MaxLength(4000) summary!: string; @IsOptional() @IsString() @MaxLength(4000) restrictedNotes?: string; @IsOptional() @IsString() @MaxLength(4000) agreements?: string; }
class UpdateInterviewDto extends InterviewDto { @Type(() => Number) @IsInt() @Min(1) expectedVersion!: number; }
class VersionDto { @Type(() => Number) @IsInt() @Min(1) expectedVersion!: number; }
class CorrectionDto { @IsString() @MinLength(5) @MaxLength(1000) reason!: string; }
class VoidInterviewDto extends VersionDto { @IsString() @MinLength(5) @MaxLength(1000) reason!: string; }
@ApiTags('entrevistas') @ApiCookieAuth() @Controller('cases/:caseId/interviews') @UseGuards(SessionGuard, CsrfGuard, PermissionsGuard)
export class InterviewsController {
  constructor(private readonly service: InterviewsService) {}
  @Get() @RequirePermissions('interviews.read') list(@Req() r: AdminRequest, @Param('caseId', ParseUUIDPipe) caseId: string) { return this.service.list(r.actorId!, caseId); }
  @Post() @RequirePermissions('interviews.create') create(@Req() r: AdminRequest, @Param('caseId', ParseUUIDPipe) caseId: string, @Body() d: InterviewDto) { return this.service.create(r.actorId!, caseId, { ...d, occurredAt: new Date(d.occurredAt) }, context(r)); }
  @Patch(':id') @RequirePermissions('interviews.update') update(@Req() r: AdminRequest, @Param('caseId', ParseUUIDPipe) caseId: string, @Param('id', ParseUUIDPipe) id: string, @Body() d: UpdateInterviewDto) { return this.service.update(r.actorId!, caseId, id, { ...d, occurredAt: new Date(d.occurredAt) }, context(r)); }
  @Post(':id/finalize') @RequirePermissions('interviews.finalize') finalize(@Req() r: AdminRequest, @Param('caseId', ParseUUIDPipe) caseId: string, @Param('id', ParseUUIDPipe) id: string, @Body() d: VersionDto) { return this.service.finalize(r.actorId!, caseId, id, d.expectedVersion, context(r)); }
  @Post(':id/correct') @RequirePermissions('interviews.correct') correct(@Req() r: AdminRequest, @Param('caseId', ParseUUIDPipe) caseId: string, @Param('id', ParseUUIDPipe) id: string, @Body() d: CorrectionDto) { return this.service.correct(r.actorId!, caseId, id, d.reason, context(r)); }
  @Delete(':id') @RequirePermissions('interviews.update') removeDraft(@Req() r: AdminRequest, @Param('caseId', ParseUUIDPipe) caseId: string, @Param('id', ParseUUIDPipe) id: string, @Body() d: VersionDto) { return this.service.removeDraft(r.actorId!, caseId, id, d.expectedVersion, context(r)); }
  @Post(':id/void') @RequirePermissions('interviews.correct') void(@Req() r: AdminRequest, @Param('caseId', ParseUUIDPipe) caseId: string, @Param('id', ParseUUIDPipe) id: string, @Body() d: VoidInterviewDto) { return this.service.void(r.actorId!, caseId, id, d, context(r)); }
}
