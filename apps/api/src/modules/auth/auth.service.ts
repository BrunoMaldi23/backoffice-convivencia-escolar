import { ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import { DatabaseService } from '../../database/database.service';
import { ConfigService } from '@nestjs/config';
import { AuditRequestContext, SecurityAuditService } from '../../common/security/security-audit.service';
import { SupabaseAuthService } from './supabase-auth.service';
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(private readonly db: DatabaseService, private readonly config: ConfigService, private readonly audit: SecurityAuditService, private readonly supabaseAuth: SupabaseAuthService) {}
  async login(email: string, password: string, context: AuditRequestContext = {}) {
    const startedAt = performance.now();
    const user = await this.db.user.findUnique({ where: { email: email.toLowerCase() }, include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } });
    const userLoadedAt = performance.now();
    if (!user) {
      await this.audit.record({ action: 'AUTH_LOGIN_FAILED', targetType: 'USER', metadata: { result: 'DENIED' }, context });
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const activatePendingInvitation = Boolean(user.supabaseAuthUserId && !user.isActive && user.invitationPending);
    if (user.supabaseAuthUserId) {
      const authUserId = await this.supabaseAuth.verifyPassword(user.email, password);
      if (authUserId !== user.supabaseAuthUserId) throw new UnauthorizedException('Credenciales inválidas');
      if (!user.isActive && !activatePendingInvitation) {
        await this.audit.record({ actorUserId: user.id, action: 'AUTH_LOGIN_FAILED', targetType: 'USER', targetId: user.id, metadata: { result: 'DENIED' }, context });
        throw new UnauthorizedException('Credenciales inválidas');
      }
    } else if (!user.isActive || !(await argon2.verify(user.passwordHash, password))) {
      await this.audit.record({ actorUserId: user.id, action: 'AUTH_LOGIN_FAILED', targetType: 'USER', targetId: user.id, metadata: { result: 'DENIED' }, context });
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const passwordVerifiedAt = performance.now();
    const token = randomBytes(32).toString('base64url'); const csrf = randomBytes(32).toString('base64url');
    const now = new Date();
    await this.db.$transaction([
      this.db.session.create({ data: { userId: user.id, tokenHash: hash(token), csrfHash: hash(csrf), expiresAt: new Date(now.getTime() + this.config.getOrThrow<number>('SESSION_TTL_HOURS') * 3600000), userAgent: context.userAgent?.slice(0, 512), ipAddress: context.ipAddress?.slice(0, 64) } }),
      this.db.user.update({ where: { id: user.id }, data: { lastLoginAt: now, ...(activatePendingInvitation ? { isActive: true, invitationPending: false } : {}) } }),
      this.db.securityAudit.create({ data: this.audit.data({ actorUserId: user.id, action: 'AUTH_LOGIN', targetType: 'USER', targetId: user.id, metadata: { result: 'SUCCESS' }, context }) })
    ]);
    const finishedAt = performance.now();
    this.logger.log(`Inicio de sesión: usuario=${Math.round(userLoadedAt - startedAt)}ms, credenciales=${Math.round(passwordVerifiedAt - userLoadedAt)}ms, sesión=${Math.round(finishedAt - passwordVerifiedAt)}ms, total=${Math.round(finishedAt - startedAt)}ms`);
    return { token, csrf, user: { id: user.id, email: user.email, displayName: user.displayName, roles: user.roles.map((r) => r.role.name), permissions: [...new Set(user.roles.flatMap((r) => r.role.permissions.map(({ permission }) => permission.code)))].sort() } };
  }
  async session(token?: string) {
    if (!token) throw new UnauthorizedException();
    const session = await this.db.session.findFirst({
      where: { tokenHash: hash(token), revokedAt: null, expiresAt: { gt: new Date() } },
      include: {
        user: {
          include: {
            roles: {
              include: {
                role: {
                  include: {
                    permissions: { include: { permission: true } }
                  }
                }
              }
            }
          }
        }
      }
    });
    if (!session || !session.user.isActive) throw new UnauthorizedException();
    await this.touch(session.id, session.lastSeenAt);
    return session;
  }
  /**
   * Datos de la sesión para las guardias. Los permisos se obtienen junto con
   * la sesión para no agregar una segunda consulta a PostgreSQL por solicitud.
   * Como se leen en cada petición, un cambio de rol o permiso sigue aplicando
   * inmediatamente.
   */
  async authenticate(token?: string) {
    if (!token) throw new UnauthorizedException();
    const session = await this.db.session.findFirst({
      where: { tokenHash: hash(token), revokedAt: null, expiresAt: { gt: new Date() }, user: { isActive: true } },
      select: {
        id: true,
        userId: true,
        csrfHash: true,
        lastSeenAt: true,
        user: {
          select: {
            roles: {
              select: {
                role: {
                  select: {
                    permissions: { select: { permission: { select: { code: true } } } }
                  }
                }
              }
            }
          }
        }
      }
    });
    if (!session) throw new UnauthorizedException();
    await this.touch(session.id, session.lastSeenAt);
    return {
      id: session.id,
      userId: session.userId,
      csrfHash: session.csrfHash,
      permissionCodes: new Set(session.user.roles.flatMap(({ role }) => role.permissions.map(({ permission }) => permission.code)))
    };
  }
  private async touch(id: string, lastSeenAt: Date) { const cutoff = new Date(Date.now() - this.config.getOrThrow<number>('SESSION_LAST_SEEN_UPDATE_MINUTES') * 60_000); if (lastSeenAt < cutoff) await this.db.session.updateMany({ where: { id, lastSeenAt: { lt: cutoff }, revokedAt: null }, data: { lastSeenAt: new Date() } }); }
  validCsrfHash(csrfHash: string, csrf: string | undefined) { if (!csrf || hash(csrf) !== csrfHash) throw new ForbiddenException('Token CSRF inválido'); }
  async logout(token: string | undefined, actorId: string, context: AuditRequestContext = {}) { if (token) await this.db.$transaction(async (tx) => { const revoked = await tx.session.updateMany({ where: { tokenHash: hash(token), userId: actorId, revokedAt: null }, data: { revokedAt: new Date() } }); if (revoked.count) await tx.securityAudit.create({ data: this.audit.data({ actorUserId: actorId, action: 'AUTH_LOGOUT', targetType: 'USER', targetId: actorId, metadata: { result: 'SUCCESS' }, context }) }); }); }
  async csrf(token?: string) { const session = await this.session(token); return session; }
  async validCsrf(token: string | undefined, csrf: string | undefined) { const session = await this.authenticate(token); this.validCsrfHash(session.csrfHash, csrf); return session; }
}
