import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, CaseAccessLevel } from '@prisma/client';
import { DatabaseService } from '../../database/database.service';
import { AuditRequestContext, SecurityAuditService } from '../../common/security/security-audit.service';

@Injectable()
export class InstitutionsService {
  constructor(private readonly db: DatabaseService, private readonly audit: SecurityAuditService) {}

  async list() { return this.db.establishment.findMany({ select: { id: true, code: true, name: true, institutionalIdentifier: true, isActive: true, createdAt: true, updatedAt: true }, orderBy: { name: 'asc' } }); }
  async create(actorId: string, data: { code: string; name: string; institutionalIdentifier?: string }, context: AuditRequestContext) {
    try { return await this.db.$transaction(async (tx) => {
      const record = await tx.establishment.create({ data: { code: data.code.trim().toUpperCase(), name: data.name.trim(), institutionalIdentifier: data.institutionalIdentifier?.trim() || null } });
      await tx.securityAudit.create({ data: this.audit.data({ actorUserId: actorId, action: 'ESTABLISHMENT_CREATED', targetType: 'ESTABLISHMENT', targetId: record.id, context }) }); return record;
    }); } catch (error) { this.duplicate(error); throw error; }
  }
  async update(actorId: string, id: string, data: { name?: string; institutionalIdentifier?: string | null; isActive?: boolean }, context: AuditRequestContext) {
    try { return await this.db.$transaction(async (tx) => {
      const before = await tx.establishment.findUnique({ where: { id } }); if (!before) throw new NotFoundException('Establecimiento no encontrado');
      const record = await tx.establishment.update({ where: { id }, data: { ...(data.name === undefined ? {} : { name: data.name.trim() }), ...(data.institutionalIdentifier === undefined ? {} : { institutionalIdentifier: data.institutionalIdentifier?.trim() || null }), ...(data.isActive === undefined ? {} : { isActive: data.isActive }) } });
      await tx.securityAudit.create({ data: this.audit.data({ actorUserId: actorId, action: 'ESTABLISHMENT_UPDATED', targetType: 'ESTABLISHMENT', targetId: id, changes: { isActive: { before: before.isActive, after: record.isActive } }, context }) }); return record;
    }); } catch (error) { this.duplicate(error); throw error; }
  }
  async membership(actorId: string, establishmentId: string, userId: string, isActive: boolean, context: AuditRequestContext) {
    return this.db.$transaction(async (tx) => { await this.activeEstablishment(tx, establishmentId); if (!await tx.user.findUnique({ where: { id: userId }, select: { id: true } })) throw new NotFoundException('Usuario no encontrado');
      const record = await tx.establishmentMembership.upsert({ where: { establishmentId_userId: { establishmentId, userId } }, update: { isActive }, create: { establishmentId, userId, isActive } });
      await tx.securityAudit.create({ data: this.audit.data({ actorUserId: actorId, action: 'ESTABLISHMENT_MEMBERSHIP_CHANGED', targetType: 'ESTABLISHMENT_MEMBERSHIP', targetId: `${establishmentId}:${userId}`, metadata: { isActive }, context }) }); return record;
    });
  }
  async stage(actorId: string, establishmentId: string, data: { code: string; name: string; displayOrder: number }, context: AuditRequestContext) { try { return await this.db.$transaction(async (tx) => { await this.activeEstablishment(tx, establishmentId); const record = await tx.caseStage.create({ data: { establishmentId, code: data.code.trim().toUpperCase(), name: data.name.trim(), displayOrder: data.displayOrder } }); await tx.securityAudit.create({ data: this.audit.data({ actorUserId: actorId, action: 'CASE_STAGE_CREATED', targetType: 'CASE_STAGE', targetId: record.id, context }) }); return record; }); } catch (error) { this.duplicate(error); throw error; } }
  async updateStage(actorId: string, establishmentId: string, stageId: string, data: { name?: string; displayOrder?: number; isActive?: boolean }, context: AuditRequestContext) { try { return await this.db.$transaction(async (tx) => { const stage = await tx.caseStage.findFirst({ where: { id: stageId, establishmentId } }); if (!stage) throw new NotFoundException('Etapa no disponible'); const record = await tx.caseStage.update({ where: { id: stageId }, data: { ...(data.name === undefined ? {} : { name: data.name.trim() }), ...(data.displayOrder === undefined ? {} : { displayOrder: data.displayOrder }), ...(data.isActive === undefined ? {} : { isActive: data.isActive }) } }); await tx.securityAudit.create({ data: this.audit.data({ actorUserId: actorId, action: 'CASE_STAGE_UPDATED', targetType: 'CASE_STAGE', targetId: stageId, context }) }); return record; }); } catch (error) { this.duplicate(error); throw error; } }
  async grant(actorId: string, caseId: string, userId: string, accessLevel: CaseAccessLevel, expiresAt: Date | undefined, reason: string | undefined, context: AuditRequestContext) { return this.db.$transaction(async (tx) => { const record = await tx.case.findUnique({ where: { id: caseId } }); if (!record) throw new NotFoundException('Expediente no disponible'); await this.requireActiveMembership(userId, record.establishmentId, tx); if (expiresAt && expiresAt <= new Date()) throw new BadRequestException('La expiración debe ser futura'); const grant = await tx.caseAccessGrant.upsert({ where: { caseId_userId: { caseId, userId } }, update: { accessLevel, expiresAt: expiresAt ?? null, revokedAt: null, reason: reason?.trim() || null, grantedByUserId: actorId, grantedAt: new Date() }, create: { caseId, userId, accessLevel, expiresAt, reason: reason?.trim() || null, grantedByUserId: actorId } }); await tx.securityAudit.create({ data: this.audit.data({ actorUserId: actorId, action: 'CASE_ACCESS_GRANTED', targetType: 'CASE_ACCESS_GRANT', targetId: grant.id, metadata: { caseId, userId, accessLevel }, context }) }); return grant; }); }
  async revokeGrant(actorId: string, caseId: string, userId: string, context: AuditRequestContext) { return this.db.$transaction(async (tx) => { const grant = await tx.caseAccessGrant.findUnique({ where: { caseId_userId: { caseId, userId } } }); if (!grant || grant.revokedAt) throw new NotFoundException('Grant no disponible'); const record = await tx.caseAccessGrant.update({ where: { id: grant.id }, data: { revokedAt: new Date() } }); await tx.securityAudit.create({ data: this.audit.data({ actorUserId: actorId, action: 'CASE_ACCESS_REVOKED', targetType: 'CASE_ACCESS_GRANT', targetId: grant.id, metadata: { caseId, userId }, context }) }); return record; }); }

  async requireActiveMembership(userId: string, establishmentId: string, tx: Prisma.TransactionClient = this.db) {
    const membership = await tx.establishmentMembership.findFirst({ where: { userId, establishmentId, isActive: true, establishment: { isActive: true } } });
    if (!membership) throw new NotFoundException('Establecimiento no disponible');
    return membership;
  }

  caseAccessWhere(userId: string, write = false): Prisma.CaseWhereInput {
    const grant: Prisma.CaseAccessGrantWhereInput = {
      userId, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      ...(write ? { accessLevel: CaseAccessLevel.WRITE } : {})
    };
    return {
      establishment: { isActive: true, memberships: { some: { userId, isActive: true } } },
      OR: [{ createdByUserId: userId }, { responsibleUserId: userId }, { accessGrants: { some: grant } }]
    };
  }

  async requireCaseAccess(userId: string, caseId: string, write = false, tx: Prisma.TransactionClient = this.db) {
    const record = await tx.case.findFirst({ where: { id: caseId, ...this.caseAccessWhere(userId, write) } });
    if (!record) throw new NotFoundException('Expediente no disponible');
    return record;
  }
  private async activeEstablishment(tx: Prisma.TransactionClient, id: string) { const item = await tx.establishment.findFirst({ where: { id, isActive: true } }); if (!item) throw new NotFoundException('Establecimiento no disponible'); return item; }
  private duplicate(error: unknown) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Registro institucional duplicado'); }
}
