import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthService } from '../../modules/auth/auth.service';
import { PERMISSIONS_KEY } from './require-permissions';
import { SecurityAuditService } from './security-audit.service';

export interface AdminRequest extends Request { actorId?: string; csrfHash?: string; permissionCodes?: Set<string> }

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AdminRequest>();
    const session = await this.auth.authenticate(req.cookies?.bce_session);
    req.actorId = session.userId;
    req.csrfHash = session.csrfHash;
    req.permissionCodes = session.permissionCodes;
    return true;
  }
}

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AdminRequest>();
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return true;
    if (!req.csrfHash) throw new UnauthorizedException();
    this.auth.validCsrfHash(req.csrfHash, req.header('x-csrf-token'));
    return true;
  }
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly audit: SecurityAuditService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AdminRequest>();
    if (!req.actorId) throw new UnauthorizedException();
    const codes = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]) ?? [];
    if (!codes.length) return true;
    if (codes.every((code) => req.permissionCodes?.has(code))) return true;
    await this.audit.record({ actorUserId: req.actorId, action: 'ADMIN_ACCESS_DENIED', targetType: 'ENDPOINT', metadata: { method: req.method, route: req.route?.path ?? '', result: 'DENIED' }, context: { ipAddress: req.ip, userAgent: req.get('user-agent') } });
    throw new ForbiddenException('Permiso insuficiente');
  }
}
