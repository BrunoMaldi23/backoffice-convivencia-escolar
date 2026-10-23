import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import { DatabaseService } from '../../database/database.service';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';

const digest = (value: string) => createHash('sha256').update(value).digest('hex');
@Injectable()
export class PasswordService {
  constructor(private readonly db: DatabaseService, private readonly mail: MailService, private readonly config: ConfigService) {}
  async forgot(email: string) {
    const user = await this.db.user.findUnique({ where: { email: email.trim().toLowerCase() }, select: { id: true, email: true, isActive: true } });
    await this.db.securityAudit.create({ data: { actorUserId: user?.id, action: 'PASSWORD_RESET_REQUEST', targetType: 'USER', targetId: user?.id, metadata: { result: 'ACCEPTED' } } });
    if (user?.isActive) {
      const token = randomBytes(32).toString('base64url');
      await this.db.$transaction(async (tx) => {
        await tx.passwordResetToken.updateMany({ where: { userId: user.id, purpose: 'RESET', usedAt: null }, data: { usedAt: new Date() } });
        await tx.passwordResetToken.create({ data: { userId: user.id, tokenHash: digest(token), purpose: 'RESET', expiresAt: new Date(Date.now() + this.config.getOrThrow<number>('PASSWORD_RESET_TTL_MINUTES') * 60_000) } });
      });
      try { await this.mail.sendAction(user.email, 'RESET', token); }
      catch { await this.db.securityAudit.create({ data: { actorUserId: user.id, action: 'PASSWORD_RESET_DELIVERY_FAILED', targetType: 'USER', targetId: user.id, metadata: { result: 'FAILED' } } }); }
    }
    return { message: 'Si la cuenta existe, recibirá instrucciones por correo.' };
  }
  async consume(token: string, password: string, purpose: 'RESET' | 'INVITE') {
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
    try { await this.db.$transaction(async (tx) => {
      const record = await tx.passwordResetToken.findUnique({ where: { tokenHash: digest(token) } });
      if (!record || record.purpose !== purpose || record.usedAt || record.expiresAt <= new Date()) throw new BadRequestException('Código inválido o vencido');
      const claimed = await tx.passwordResetToken.updateMany({ where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
      if (claimed.count !== 1) throw new BadRequestException('Código inválido o vencido');
      await tx.user.update({ where: { id: record.userId }, data: { passwordHash, ...(purpose === 'INVITE' ? { isActive: true } : {}) } });
      await tx.session.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.securityAudit.create({ data: { actorUserId: record.userId, action: purpose === 'INVITE' ? 'INVITATION_ACCEPTED' : 'PASSWORD_RESET', targetType: 'USER', targetId: record.userId, metadata: { result: 'SUCCESS' } } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
    catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') throw new BadRequestException('Código inválido o vencido'); throw error; }
    return { success: true };
  }
}
