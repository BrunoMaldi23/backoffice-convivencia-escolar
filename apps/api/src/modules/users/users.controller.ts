import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiConflictResponse, ApiCookieAuth, ApiForbiddenResponse, ApiNotFoundResponse, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags, ApiTooManyRequestsResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsEmail, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { SessionGuard, CsrfGuard, PermissionsGuard, AdminRequest } from '../../common/security/admin-guards';
import { RequirePermissions } from '../../common/security/require-permissions';
import { UsersService } from './users.service';

const auditContext = (req: AdminRequest) => ({ ipAddress: req.ip, userAgent: req.get('user-agent') });

class ListUsersDto {
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ default: 20, maximum: 100 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) role?: string;
  @ApiPropertyOptional({ enum: ['true', 'false'] }) @IsOptional() @IsIn(['true', 'false']) active?: string;
}
class CreateUserDto {
  @ApiProperty() @IsEmail() @MaxLength(254) email!: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(120) displayName!: string;
  @ApiProperty({ type: [String] }) @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) roles!: string[];
}
class UpdateUserDto {
  @ApiPropertyOptional() @IsOptional() @IsEmail() @MaxLength(254) email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) @MaxLength(120) displayName?: string;
}
class StatusDto { @ApiProperty() @IsBoolean() isActive!: boolean; }
class RolesDto { @ApiProperty({ type: [String] }) @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) roles!: string[]; }

@ApiTags('users') @ApiCookieAuth() @ApiUnauthorizedResponse({ description: 'Sesión ausente, vencida o revocada' }) @ApiForbiddenResponse({ description: 'CSRF o permiso insuficiente' }) @ApiTooManyRequestsResponse({ description: 'Límite de solicitudes excedido' }) @Controller('users') @UseGuards(SessionGuard, CsrfGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}
  @Get() @RequirePermissions('users.read') @ApiOperation({ summary: 'Lista usuarios', description: 'Requiere users.read. Incluye paginación page y limit.' }) @ApiBadRequestResponse({ description: 'Filtros inválidos' })
  list(@Query() query: ListUsersDto) { return this.users.list(query.page, query.limit, query.search, query.role, query.active === undefined ? undefined : query.active === 'true'); }
  @Post() @RequirePermissions('users.create') @ApiOperation({ summary: 'Crea usuario e invita por correo', description: 'Requiere users.create; la cuenta queda inactiva hasta aceptar la invitación.' }) @ApiConflictResponse({ description: 'Correo o roles en conflicto' })
  create(@Req() req: AdminRequest, @Body() dto: CreateUserDto) { return this.users.create(dto.email, dto.displayName, dto.roles, req.actorId!, auditContext(req)); }
  @Get(':id') @RequirePermissions('users.read') @ApiNotFoundResponse({ description: 'Usuario no encontrado' })
  get(@Param('id', ParseUUIDPipe) id: string) { return this.users.get(id); }
  @Patch(':id') @RequirePermissions('users.update')
  update(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) { return this.users.update(id, dto, req.actorId!, auditContext(req)); }
  @Patch(':id/status') @RequirePermissions('users.disable')
  status(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: StatusDto) { return this.users.status(id, dto.isActive, req.actorId!, auditContext(req)); }
  @Patch(':id/roles') @RequirePermissions('roles.assign')
  roles(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: RolesDto) { return this.users.assignRoles(id, dto.roles, req.actorId!, auditContext(req)); }
  @Post(':id/revoke-sessions') @RequirePermissions('users.update')
  revoke(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string) { return this.users.revokeSessions(id, req.actorId!, auditContext(req)); }
  @Post(':id/resend-invitation') @RequirePermissions('users.update')
  resend(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string) { return this.users.resendInvitation(id, req.actorId!, auditContext(req)); }
}
