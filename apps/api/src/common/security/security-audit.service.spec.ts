import { SecurityAuditService } from './security-audit.service';

describe('SecurityAuditService', () => {
  const service = new SecurityAuditService({ securityAudit: { create: jest.fn() } } as never);

  it('redacta secretos y conserva cambios administrativos permitidos', () => {
    expect(service.sanitize({ password: 'no-registro', token: 'no-registro', result: 'SUCCESS', nested: { csrf: 'no-registro' } })).toEqual({ password: '[REDACTED]', token: '[REDACTED]', result: 'SUCCESS', nested: { csrf: '[REDACTED]' } });
    expect(service.userChanges({ email: 'antes@establecimiento.cl', passwordHash: 'no-registro', roles: ['DOCENTE'] }, { email: 'despues@establecimiento.cl', passwordHash: 'no-registro', roles: ['AUDITOR'] })).toEqual({ email: { before: 'antes@establecimiento.cl', after: 'despues@establecimiento.cl' }, roles: { before: ['DOCENTE'], after: ['AUDITOR'] } });
  });

  it('limita el contexto técnico antes de persistirlo', () => {
    const data = service.data({ action: 'USER_UPDATED', targetType: 'USER', context: { ipAddress: '1'.repeat(100), userAgent: 'a'.repeat(600) } });
    expect(data.ipAddress).toHaveLength(64);
    expect(data.userAgent).toHaveLength(512);
  });
});
