import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SessionGuard, CsrfGuard, PermissionsGuard } from '../../common/security/admin-guards';
import { RequirePermissions } from '../../common/security/require-permissions';

@ApiTags('roles') @ApiCookieAuth() @Controller() @UseGuards(SessionGuard, CsrfGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly db: DatabaseService) {}
  private readonly select = { id: true, name: true, description: true, permissions: { select: { permission: { select: { code: true } } } } } as const;
  @Get('roles') @RequirePermissions('roles.read')
  async list() { return (await this.db.role.findMany({ select: this.select, orderBy: { name: 'asc' } })).map((r) => ({ id: r.id, name: r.name, description: r.description, permissions: r.permissions.map((p) => p.permission.code) })); }
  @Get('roles/:id') @RequirePermissions('roles.read')
  async get(@Param('id', ParseUUIDPipe) id: string) { const role = await this.db.role.findUnique({ where: { id }, select: this.select }); if (!role) throw new NotFoundException('Rol no encontrado'); return { id: role.id, name: role.name, description: role.description, permissions: role.permissions.map((p) => p.permission.code) }; }
  @Get('permissions') @RequirePermissions('roles.read')
  async permissions() { return this.db.permission.findMany({ select: { id: true, code: true, description: true }, orderBy: { code: 'asc' } }); }
}
