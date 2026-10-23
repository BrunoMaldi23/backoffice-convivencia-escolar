import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import { DatabaseService } from '../../database/database.service';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';

const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const userSelect = { id: true, email: true, displayName: true, isActive: true, createdAt: true, updatedAt: true, roles: { select: { role: { select: { name: true } } } } } as const;
const present = (user: { roles: { role: { name: string } }[] } & Record<string, unknown>) => ({ ...user, roles: user.roles.map((r) => r.role.name) });

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService, private readonly mail: MailService, private readonly config: ConfigService) {}
  async list(page: number, limit: number, search?: string, role?: string, active?: boolean) {
    const where: Prisma.UserWhereInput = { ...(active === undefined ? {} : { isActive: active }), ...(search ? { OR: [{ email: { contains: search, mode: 'insensitive' } }, { displayName: { contains: search, mode: 'insensitive' } }] } : {}), ...(role ? { roles: { some: { role: { name: role } } } } : {}) };
    const [items, total] = await this.db.$transaction([this.db.user.findMany({ where, select: userSelect, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }), this.db.user.count({ where })]);
    return { items: items.map(present), total, page, limit };
  }
  async get(id: string) { const user = await this.db.user.findUnique({ where: { id }, select: userSelect }); if (!user) throw new NotFoundException('Usuario no encontrado'); return present(user); }
  async create(email: string, displayName: string, roleNames: string[], actorId: string) {
    const normalized = email.trim().toLowerCase();
    if (roleNames.includes('SYSTEM_ADMIN')) throw new ForbiddenException('No se concede SYSTEM_ADMIN al crear cuentas');
    const roles = await this.resolveRoles(roleNames);
    const token = randomBytes(32).toString('base64url');
    const unusableHash = await argon2.hash(randomBytes(32), { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
    let user: { id: string };
    try {
      user = await this.db.$transaction(async (tx) => {
        const created = await tx.user.create({ data: { email: normalized, displayName: displayName.trim(), isActive: false, passwordHash: unusableHash, roles: { create: roles.map((r) => ({ roleId: r.id })) } } });
        await tx.passwordResetToken.create({ data: { userId: created.id, tokenHash: digest(token), purpose: 'INVITE', expiresAt: new Date(Date.now() + this.config.getOrThrow<number>('PASSWORD_RESET_TTL_MINUTES') * 60_000) } });
        await tx.securityAudit.create({ data: { actorUserId: actorId, action: 'USER_CREATED', targetType: 'USER', targetId: created.id, metadata: { result: 'SUCCESS' } } });
        return created;
      });
    } catch (error) { this.duplicate(error); throw error; }
    await this.mail.sendAction(normalized, 'INVITE', token);
    return this.get(user.id);
  }
  async update(id: string, data: { email?: string; displayName?: string }, actorId: string) {
    try { await this.db.$transaction(async (tx) => {
      if (!await tx.user.findUnique({ where: { id }, select: { id: true } })) throw new NotFoundException('Usuario no encontrado');
      await tx.user.update({ where: { id }, data: { ...(data.email ? { email: data.email.trim().toLowerCase() } : {}), ...(data.displayName ? { displayName: data.displayName.trim() } : {}) } });
      await tx.securityAudit.create({ data: { actorUserId: actorId, action: 'USER_UPDATED', targetType: 'USER', targetId: id, metadata: { fields: Object.keys(data), result: 'SUCCESS' } } });
    }); } catch (error) { this.duplicate(error); throw error; }
    return this.get(id);
  }
  async status(id: string, isActive: boolean, actorId: string) {
    await this.db.$transaction(async (tx) => {
      await this.adminLock(tx);
      const user = await tx.user.findUnique({ where: { id }, include: { roles: { include: { role: true } } } });
      if (!user) throw new NotFoundException('Usuario no encontrado');
      if (isActive && !user.isActive && await tx.passwordResetToken.count({ where: { userId: id, purpose: 'INVITE', usedAt: null } })) throw new ConflictException('La cuenta pendiente debe aceptar su invitación');
      if (!isActive && user.isActive && user.roles.some((r) => r.role.name === 'SYSTEM_ADMIN')) await this.ensureAnotherAdmin(tx, id);
      await tx.user.update({ where: { id }, data: { isActive } });
      if (!isActive) await tx.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.securityAudit.create({ data: { actorUserId: actorId, action: isActive ? 'USER_ACTIVATED' : 'USER_DISABLED', targetType: 'USER', targetId: id, metadata: { result: 'SUCCESS' } } });
    });
    return this.get(id);
  }
  async assignRoles(id: string, names: string[], actorId: string) {
    const roles = await this.resolveRoles(names);
    await this.db.$transaction(async (tx) => {
      await this.adminLock(tx);
      const user = await tx.user.findUnique({ where: { id }, include: { roles: { include: { role: true } } } });
      if (!user) throw new NotFoundException('Usuario no encontrado');
      const hadAdmin = user.roles.some((r) => r.role.name === 'SYSTEM_ADMIN');
      const willAdmin = names.includes('SYSTEM_ADMIN');
      if (willAdmin && !hadAdmin) {
        if (actorId === id) throw new ForbiddenException('No se permite autoasignar SYSTEM_ADMIN');
        const actorAdmin = await tx.userRole.count({ where: { userId: actorId, role: { name: 'SYSTEM_ADMIN' }, user: { isActive: true } } });
        if (!actorAdmin) throw new ForbiddenException('Solo SYSTEM_ADMIN puede asignar ese rol');
      }
      if (hadAdmin && !willAdmin && user.isActive) await this.ensureAnotherAdmin(tx, id);
      await tx.userRole.deleteMany({ where: { userId: id } });
      await tx.userRole.createMany({ data: roles.map((role) => ({ userId: id, roleId: role.id })) });
      await tx.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.securityAudit.create({ data: { actorUserId: actorId, action: 'USER_ROLES_CHANGED', targetType: 'USER', targetId: id, metadata: { roles: names, result: 'SUCCESS' } } });
    });
    return this.get(id);
  }
  async revokeSessions(id: string, actorId: string) {
    await this.db.$transaction(async (tx) => {
      if (!await tx.user.findUnique({ where: { id }, select: { id: true } })) throw new NotFoundException('Usuario no encontrado');
      await tx.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.securityAudit.create({ data: { actorUserId: actorId, action: 'USER_SESSIONS_REVOKED', targetType: 'USER', targetId: id, metadata: { result: 'SUCCESS' } } });
    });
    return { success: true };
  }
  async resendInvitation(id: string, actorId: string) {
    const user = await this.db.user.findUnique({ where: { id }, select: { id: true, email: true, isActive: true } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.isActive) throw new ConflictException('La cuenta ya está activa');
    const token = randomBytes(32).toString('base64url');
    await this.db.$transaction(async (tx) => {
      await tx.passwordResetToken.updateMany({ where: { userId: id, purpose: 'INVITE', usedAt: null }, data: { usedAt: new Date() } });
      await tx.passwordResetToken.create({ data: { userId: id, purpose: 'INVITE', tokenHash: digest(token), expiresAt: new Date(Date.now() + this.config.getOrThrow<number>('PASSWORD_RESET_TTL_MINUTES') * 60_000) } });
      await tx.securityAudit.create({ data: { actorUserId: actorId, action: 'USER_INVITATION_SENT', targetType: 'USER', targetId: id, metadata: { result: 'SUCCESS' } } });
    });
    await this.mail.sendAction(user.email, 'INVITE', token);
    return { success: true };
  }
  private async resolveRoles(names: string[]) {
    const unique = [...new Set(names)];
    if (!unique.length || unique.length !== names.length) throw new ConflictException('Se requiere al menos un rol y no se admiten duplicados');
    const roles = await this.db.role.findMany({ where: { name: { in: unique } }, select: { id: true, name: true } });
    if (roles.length !== unique.length) throw new NotFoundException('Rol no encontrado');
    return roles;
  }
  private async adminLock(tx: Prisma.TransactionClient) { await tx.$executeRaw`SELECT pg_advisory_xact_lock(17834, 1)`; }
  private async ensureAnotherAdmin(tx: Prisma.TransactionClient, id: string) {
    const others = await tx.user.count({ where: { id: { not: id }, isActive: true, roles: { some: { role: { name: 'SYSTEM_ADMIN' } } } } });
    if (!others) throw new ConflictException('No se puede retirar al último administrador activo');
  }
  private duplicate(error: unknown) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Correo ya registrado'); }
}
