import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthService } from '../../modules/auth/auth.service';
import { DatabaseService } from '../../database/database.service';
import { PERMISSIONS_KEY } from './require-permissions';

export interface AdminRequest extends Request { actorId?: string }

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AdminRequest>();
    const session = await this.auth.session(req.cookies?.bce_session);
    req.actorId = session.userId;
    return true;
  }
}

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AdminRequest>();
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return true;
    await this.auth.validCsrf(req.cookies?.bce_session, req.header('x-csrf-token'));
    return true;
  }
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly db: DatabaseService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AdminRequest>();
    if (!req.actorId) throw new UnauthorizedException();
    const codes = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]) ?? [];
    if (!codes.length) return true;
    const matches = await this.db.rolePermission.findMany({ where: { role: { users: { some: { userId: req.actorId } } }, permission: { code: { in: codes } } }, select: { permission: { select: { code: true } } } });
    const granted = new Set(matches.map((item) => item.permission.code));
    if (codes.every((code) => granted.has(code))) return true;
    await this.db.securityAudit.create({ data: { actorUserId: req.actorId, action: 'ADMIN_ACCESS_DENIED', targetType: 'ENDPOINT', metadata: { method: req.method, route: req.route?.path ?? '', result: 'DENIED' } } });
    throw new ForbiddenException('Permiso insuficiente');
  }
}
