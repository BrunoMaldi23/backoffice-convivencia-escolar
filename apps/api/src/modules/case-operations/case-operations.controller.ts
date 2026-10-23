import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsEnum, IsInt, IsJSON, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';
import type { Response } from 'express';
import { DocumentKind, MeasureStatus } from '@prisma/client';
import { AdminRequest, CsrfGuard, PermissionsGuard, SessionGuard } from '../../common/security/admin-guards';
import { RequirePermissions } from '../../common/security/require-permissions';
import { CaseOperationsService } from './case-operations.service';
const context = (request: AdminRequest) => ({ ipAddress: request.ip, userAgent: request.get('user-agent') });
class DocumentDto { @IsEnum(DocumentKind) kind!: DocumentKind; @IsString() @MinLength(1) @MaxLength(180) originalFilename!: string; @IsString() @MaxLength(100) contentType!: string; @IsString() @MaxLength(14_000_000) base64Content!: string; }
class ProtocolDto { @IsUUID() establishmentId!: string; @IsString() @MinLength(2) @MaxLength(40) code!: string; @IsString() @MinLength(3) @MaxLength(180) name!: string; @IsString() @MinLength(3) @MaxLength(180) title!: string; @IsJSON() @MaxLength(20000) content!: string; }
class MeasureDto { @IsString() @MinLength(3) @MaxLength(300) title!: string; @IsOptional() @IsString() @MaxLength(4000) description?: string; @IsOptional() @IsDateString() dueAt?: string; @IsArray() @IsUUID('4', { each: true }) responsibleUserIds!: string[]; }
class UpdateMeasureDto { @Type(() => Number) @IsInt() @Min(1) expectedVersion!: number; @IsOptional() @IsEnum(MeasureStatus) status?: MeasureStatus; @IsOptional() @IsDateString() dueAt?: string | null; }
class FollowUpDto { @IsDateString() occurredAt!: string; @IsString() @MinLength(3) @MaxLength(4000) note!: string; @IsOptional() @IsString() @MaxLength(500) nextAction?: string; @IsOptional() @IsDateString() nextActionDueAt?: string; }
class TaskDto { @IsString() @MinLength(3) @MaxLength(300) title!: string; @IsOptional() @IsDateString() dueAt?: string; @IsOptional() @IsUUID() assignedToUserId?: string; }
@ApiTags('operación de expedientes') @ApiCookieAuth() @Controller() @UseGuards(SessionGuard, CsrfGuard, PermissionsGuard)
export class CaseOperationsController {
  constructor(private readonly service: CaseOperationsService) {}
  @Get('cases/:caseId/documents') @RequirePermissions('documents.read') listDocuments(@Req() r: AdminRequest, @Param('caseId', ParseUUIDPipe) id: string) { return this.service.listDocuments(r.actorId!, id); }
  @Post('cases/:caseId/documents') @RequirePermissions('documents.create') upload(@Req() r: AdminRequest, @Param('caseId', ParseUUIDPipe) id: string, @Body() d: DocumentDto) { return this.service.uploadDocument(r.actorId!, id, d, context(r)); }
  @Get('cases/:caseId/documents/:id/download') @RequirePermissions('documents.read') async download(@Req() r: AdminRequest, @Param('caseId', ParseUUIDPipe) caseId: string, @Param('id', ParseUUIDPipe) id: string, @Res() response: Response) { const { document, content } = await this.service.downloadDocument(r.actorId!, caseId, id); response.setHeader('Content-Type', document.contentType); response.setHeader('Content-Disposition', `attachment; filename="${document.originalFilename.replace(/["\\\r\n]/g, '_')}"`); response.send(content); }
  @Get('protocols/:establishmentId') @RequirePermissions('protocols.read') listProtocols(@Req() r: AdminRequest, @Param('establishmentId', ParseUUIDPipe) id: string) { return this.service.listProtocols(r.actorId!, id); }
  @Post('protocols') @RequirePermissions('protocols.manage') createProtocol(@Req() r: AdminRequest, @Body() d: ProtocolDto) { return this.service.createProtocol(r.actorId!, d.establishmentId, { ...d, content: JSON.parse(d.content) }, context(r)); }
  @Post('protocols/versions/:id/publish') @RequirePermissions('protocols.manage') publish(@Req() r: AdminRequest, @Param('id', ParseUUIDPipe) id: string, @Body('establishmentId', ParseUUIDPipe) establishmentId: string) { return this.service.publishProtocol(r.actorId!, establishmentId, id, context(r)); }
  @Post('cases/:caseId/protocols/:versionId') @RequirePermissions('protocols.read') apply(@Req() r: AdminRequest, @Param('caseId', ParseUUIDPipe) caseId: string, @Param('versionId', ParseUUIDPipe) versionId: string) { return this.service.applyProtocol(r.actorId!, caseId, versionId, context(r)); }
  @Get('cases/:caseId/measures') @RequirePermissions('measures.read') listMeasures(@Req() r: AdminRequest, @Param('caseId', ParseUUIDPipe) id: string) { return this.service.listMeasures(r.actorId!, id); }
  @Post('cases/:caseId/measures') @RequirePermissions('measures.manage') createMeasure(@Req() r: AdminRequest, @Param('caseId', ParseUUIDPipe) id: string, @Body() d: MeasureDto) { return this.service.createMeasure(r.actorId!, id, { ...d, dueAt: d.dueAt ? new Date(d.dueAt) : undefined }, context(r)); }
  @Post('cases/:caseId/measures/:id/update') @RequirePermissions('measures.manage') updateMeasure(@Req() r: AdminRequest, @Param('caseId', ParseUUIDPipe) caseId: string, @Param('id', ParseUUIDPipe) id: string, @Body() d: UpdateMeasureDto) { return this.service.updateMeasure(r.actorId!, caseId, id, { ...d, dueAt: d.dueAt === null ? null : d.dueAt ? new Date(d.dueAt) : undefined }, context(r)); }
  @Get('cases/:caseId/follow-ups') @RequirePermissions('follow-ups.read') listFollowUps(@Req() r: AdminRequest, @Param('caseId', ParseUUIDPipe) id: string) { return this.service.listFollowUps(r.actorId!, id); }
  @Post('cases/:caseId/follow-ups') @RequirePermissions('follow-ups.create') followUp(@Req() r: AdminRequest, @Param('caseId', ParseUUIDPipe) id: string, @Body() d: FollowUpDto) { return this.service.createFollowUp(r.actorId!, id, { ...d, occurredAt: new Date(d.occurredAt), nextActionDueAt: d.nextActionDueAt ? new Date(d.nextActionDueAt) : undefined }, context(r)); }
  @Get('cases/:caseId/tasks') @RequirePermissions('tasks.read') listTasks(@Req() r: AdminRequest, @Param('caseId', ParseUUIDPipe) id: string) { return this.service.listTasks(r.actorId!, id); }
  @Post('cases/:caseId/tasks') @RequirePermissions('tasks.manage') task(@Req() r: AdminRequest, @Param('caseId', ParseUUIDPipe) id: string, @Body() d: TaskDto) { return this.service.createTask(r.actorId!, id, { ...d, dueAt: d.dueAt ? new Date(d.dueAt) : undefined }, context(r)); }
  @Post('cases/:caseId/tasks/:id/complete') @RequirePermissions('tasks.manage') complete(@Req() r: AdminRequest, @Param('caseId', ParseUUIDPipe) caseId: string, @Param('id', ParseUUIDPipe) id: string) { return this.service.completeTask(r.actorId!, caseId, id, context(r)); }
  @Get('notifications') @RequirePermissions('notifications.read') notifications(@Req() r: AdminRequest) { return this.service.listNotifications(r.actorId!); }
  @Post('notifications/:id/read') @RequirePermissions('notifications.read') read(@Req() r: AdminRequest, @Param('id', ParseUUIDPipe) id: string) { return this.service.markRead(r.actorId!, id); }
}
