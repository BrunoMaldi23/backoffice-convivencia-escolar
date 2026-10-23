import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import { DatabaseService } from '../../database/database.service';
import { ConfigService } from '@nestjs/config';
import { AuditRequestContext, SecurityAuditService } from '../../common/security/security-audit.service';
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
@Injectable()
export class AuthService {
  constructor(private readonly db: DatabaseService, private readonly config: ConfigService, private readonly audit: SecurityAuditService) {}
  async login(email: string, password: string, context: AuditRequestContext = {}) {
    const user = await this.db.user.findUnique({ where: { email: email.toLowerCase() }, include: { roles: { include: { role: true } } } });
    if (!user || !user.isActive || !(await argon2.verify(user.passwordHash, password))) {
      await this.audit.record({ actorUserId: user?.id, action: 'AUTH_LOGIN_FAILED', targetType: 'USER', targetId: user?.id, metadata: { result: 'DENIED' }, context });
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const token = randomBytes(32).toString('base64url'); const csrf = randomBytes(32).toString('base64url');
    await this.db.session.create({ data: { userId: user.id, tokenHash: hash(token), csrfHash: hash(csrf), expiresAt: new Date(Date.now() + this.config.getOrThrow<number>('SESSION_TTL_HOURS') * 3600000), userAgent: context.userAgent?.slice(0, 512), ipAddress: context.ipAddress?.slice(0, 64) } });
    await this.db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await this.audit.record({ actorUserId: user.id, action: 'AUTH_LOGIN', targetType: 'USER', targetId: user.id, metadata: { result: 'SUCCESS' }, context });
    return { token, csrf, user: { id: user.id, email: user.email, displayName: user.displayName, roles: user.roles.map((r) => r.role.name) } };
  }
  async session(token?: string) { if (!token) throw new UnauthorizedException(); const session = await this.db.session.findFirst({ where: { tokenHash: hash(token), revokedAt: null, expiresAt: { gt: new Date() } }, include: { user: { include: { roles: { include: { role: true } } } } } }); if (!session || !session.user.isActive) throw new UnauthorizedException(); const cutoff = new Date(Date.now() - this.config.getOrThrow<number>('SESSION_LAST_SEEN_UPDATE_MINUTES') * 60_000); if (session.lastSeenAt < cutoff) await this.db.session.updateMany({ where: { id: session.id, lastSeenAt: { lt: cutoff }, revokedAt: null }, data: { lastSeenAt: new Date() } }); return session; }
  async logout(token?: string, context: AuditRequestContext = {}) { if (token) { const session = await this.db.session.findUnique({ where: { tokenHash: hash(token) }, select: { userId: true } }); await this.db.session.updateMany({ where: { tokenHash: hash(token), revokedAt: null }, data: { revokedAt: new Date() } }); if (session) await this.audit.record({ actorUserId: session.userId, action: 'AUTH_LOGOUT', targetType: 'USER', targetId: session.userId, metadata: { result: 'SUCCESS' }, context }); } }
  async csrf(token?: string) { const session = await this.session(token); return session; }
  async validCsrf(token: string | undefined, csrf: string | undefined) { const session = await this.session(token); if (!csrf || hash(csrf) !== session.csrfHash) throw new ForbiddenException('Token CSRF inválido'); return session; }
}
