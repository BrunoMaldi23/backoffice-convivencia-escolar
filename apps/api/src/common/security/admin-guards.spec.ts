import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DatabaseService } from '../../database/database.service';
import { AuthService } from '../../modules/auth/auth.service';
import { CsrfGuard, PermissionsGuard, SessionGuard } from './admin-guards';

const context = (request: Record<string, unknown>) => ({ switchToHttp: () => ({ getRequest: () => request }), getHandler: () => function handler() {}, getClass: () => class Controller {} }) as unknown as ExecutionContext;

describe('Guards administrativos', () => {
  it('rechaza falta de sesión con 401', async () => {
    const auth = { session: jest.fn().mockRejectedValue(new UnauthorizedException()) } as unknown as AuthService;
    await expect(new SessionGuard(auth).canActivate(context({ cookies: {} }))).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it('rechaza CSRF incorrecto en escritura', async () => {
    const auth = { validCsrf: jest.fn().mockRejectedValue(new ForbiddenException()) } as unknown as AuthService;
    await expect(new CsrfGuard(auth).canActivate(context({ method: 'POST', cookies: { bce_session: 'x' }, header: () => undefined }))).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('consulta permisos efectivos y deniega los ausentes', async () => {
    const reflector = { getAllAndOverride: () => ['users.read'] } as unknown as Reflector;
    const db = { rolePermission: { findMany: jest.fn().mockResolvedValue([]) }, securityAudit: { create: jest.fn().mockResolvedValue({}) } } as unknown as DatabaseService;
    await expect(new PermissionsGuard(reflector, db).canActivate(context({ actorId: 'fixture', method: 'GET', route: { path: '/users' } }))).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.securityAudit.create).toHaveBeenCalled();
  });
});
