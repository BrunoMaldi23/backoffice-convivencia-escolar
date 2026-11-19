import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../../modules/auth/auth.service';
import { CsrfGuard, PermissionsGuard, SessionGuard } from './admin-guards';
import { SecurityAuditService } from './security-audit.service';

const context = (request: Record<string, unknown>) => ({ switchToHttp: () => ({ getRequest: () => request }), getHandler: () => function handler() {}, getClass: () => class Controller {} }) as unknown as ExecutionContext;

describe('Guards administrativos', () => {
  it('rechaza falta de sesión con 401', async () => {
    const auth = { authenticate: jest.fn().mockRejectedValue(new UnauthorizedException()) } as unknown as AuthService;
    await expect(new SessionGuard(auth).canActivate(context({ cookies: {} }))).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it('rechaza CSRF incorrecto en escritura', async () => {
    const auth = { validCsrfHash: jest.fn(() => { throw new ForbiddenException(); }) } as unknown as AuthService;
    await expect(new CsrfGuard(auth).canActivate(context({ method: 'POST', csrfHash: 'hash', cookies: { bce_session: 'x' }, header: () => undefined }))).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('consulta permisos efectivos y deniega los ausentes', async () => {
    const reflector = { getAllAndOverride: () => ['users.read'] } as unknown as Reflector;
    const audit = { record: jest.fn().mockResolvedValue({}) } as unknown as SecurityAuditService;
    await expect(new PermissionsGuard(reflector, audit).canActivate(context({ actorId: 'fixture', permissionCodes: new Set(), method: 'GET', route: { path: '/users' }, get: () => undefined }))).rejects.toBeInstanceOf(ForbiddenException);
    expect(audit.record).toHaveBeenCalled();
  });
});
