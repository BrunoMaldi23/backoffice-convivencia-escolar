import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CaseEventType, CaseStatus, Prisma, ReferralStatus, SummonsStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { pageArgs, PageQueryDto } from '../../common/pagination';
import { AuditRequestContext, SecurityAuditService } from '../../common/security/security-audit.service';
import { DatabaseService } from '../../database/database.service';
import { InstitutionsService } from '../institutions/institutions.service';

type Tx = Prisma.TransactionClient;

/** Citaciones a reunión y derivaciones a redes externas, siempre dentro de un expediente. */
export const SUMMONS_TRANSITIONS: Record<SummonsStatus, SummonsStatus[]> = {
  PROGRAMADA: [SummonsStatus.REALIZADA, SummonsStatus.NO_ASISTIO, SummonsStatus.CANCELADA],
  REALIZADA: [], NO_ASISTIO: [], CANCELADA: []
};
export const REFERRAL_TRANSITIONS: Record<ReferralStatus, ReferralStatus[]> = {
  PENDIENTE: [ReferralStatus.ENVIADA, ReferralStatus.CERRADA],
  ENVIADA: [ReferralStatus.CON_RESPUESTA, ReferralStatus.CERRADA],
  CON_RESPUESTA: [ReferralStatus.CERRADA],
  CERRADA: []
};
const caseSummary = { select: { id: true, folio: true, title: true, status: true, establishmentId: true } } as const;

@Injectable()
export class SummonsReferralsService {
  constructor(private readonly db: DatabaseService, private readonly institutions: InstitutionsService, private readonly audit: SecurityAuditService) {}

  // ---- Citaciones ----
  async listCaseSummons(actor: string, caseId: string) {
    await this.institutions.requireCaseAccess(actor, caseId);
    return this.db.caseSummons.findMany({ where: { caseId }, orderBy: { scheduledAt: 'asc' } });
  }
  async listSummons(actor: string, query: { establishmentId?: string; status?: SummonsStatus; from?: Date; to?: Date } & PageQueryDto) {
    const paging = pageArgs(query);
    const where: Prisma.CaseSummonsWhereInput = { case: { ...this.institutions.caseAccessWhere(actor), ...(query.establishmentId ? { establishmentId: query.establishmentId } : {}) }, ...(query.status ? { status: query.status } : {}), ...(query.from || query.to ? { scheduledAt: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } } : {}) };
    const [items, total] = await this.db.$transaction([
      this.db.caseSummons.findMany({ where, include: { case: caseSummary }, orderBy: { scheduledAt: 'asc' }, skip: paging.skip, take: paging.take }),
      this.db.caseSummons.count({ where })
    ]);
    return { items, total, page: paging.page, limit: paging.limit };
  }
  async createSummons(actor: string, caseId: string, data: { participantId?: string; recipientLabel?: string; scheduledAt: Date; location: string; reason: string }, ctx: AuditRequestContext) {
    return this.db.$transaction(async (tx) => {
      const record = await this.requireOpenCase(actor, caseId, tx);
      let recipientLabel = data.recipientLabel?.trim();
      if (data.participantId) {
        const link = await tx.caseParticipant.findFirst({ where: { caseId, participantId: data.participantId, unlinkedAt: null }, include: { participant: true } });
        if (!link) throw new NotFoundException('El involucrado no está asociado al expediente');
        recipientLabel = recipientLabel || link.participant.referenceLabel;
      }
      if (!recipientLabel) throw new BadRequestException('Indique a quién se cita');
      const summons = await tx.caseSummons.create({ data: { caseId: record.id, participantId: data.participantId ?? null, recipientLabel, scheduledAt: data.scheduledAt, location: data.location.trim(), reason: data.reason.trim(), createdByUserId: actor } });
      await this.event(tx, caseId, actor, CaseEventType.SUMMONS_CREATED, 'CASE_SUMMONS', summons.id);
      await this.record(tx, actor, 'SUMMONS_CREATED', 'CASE_SUMMONS', summons.id, { caseId }, ctx);
      return summons;
    });
  }
  async updateSummons(actor: string, caseId: string, id: string, data: { expectedVersion: number; status?: SummonsStatus; scheduledAt?: Date; location?: string; reason?: string; outcomeNote?: string }, ctx: AuditRequestContext) {
    return this.db.$transaction(async (tx) => {
      await this.requireOpenCase(actor, caseId, tx);
      const current = await tx.caseSummons.findFirst({ where: { id, caseId } });
      if (!current) throw new NotFoundException('Citación no disponible');
      if (current.status !== SummonsStatus.PROGRAMADA) throw new ConflictException('La citación ya fue cerrada y no admite cambios');
      if (data.status && data.status !== current.status && !SUMMONS_TRANSITIONS[current.status].includes(data.status)) throw new ConflictException('Cambio de estado no permitido');
      if (data.status === SummonsStatus.CANCELADA && !data.outcomeNote?.trim()) throw new BadRequestException('Indique el motivo de la cancelación');
      const result = await tx.caseSummons.updateMany({ where: { id, caseId, version: data.expectedVersion }, data: { ...(data.status ? { status: data.status } : {}), ...(data.scheduledAt ? { scheduledAt: data.scheduledAt } : {}), ...(data.location === undefined ? {} : { location: data.location.trim() }), ...(data.reason === undefined ? {} : { reason: data.reason.trim() }), ...(data.outcomeNote === undefined ? {} : { outcomeNote: data.outcomeNote.trim() || null }), version: { increment: 1 } } });
      if (result.count !== 1) throw new ConflictException('La citación fue modificada por otra persona');
      await this.event(tx, caseId, actor, CaseEventType.SUMMONS_UPDATED, 'CASE_SUMMONS', id);
      await this.record(tx, actor, 'SUMMONS_UPDATED', 'CASE_SUMMONS', id, { caseId, status: data.status ?? current.status }, ctx);
      return tx.caseSummons.findUniqueOrThrow({ where: { id } });
    });
  }

  // ---- Derivaciones ----
  async listCaseReferrals(actor: string, caseId: string) {
    await this.institutions.requireCaseAccess(actor, caseId);
    return this.db.caseReferral.findMany({ where: { caseId }, orderBy: { createdAt: 'asc' } });
  }
  async listReferrals(actor: string, query: { establishmentId?: string; status?: ReferralStatus } & PageQueryDto) {
    const paging = pageArgs(query);
    const where: Prisma.CaseReferralWhereInput = { case: { ...this.institutions.caseAccessWhere(actor), ...(query.establishmentId ? { establishmentId: query.establishmentId } : {}) }, ...(query.status ? { status: query.status } : {}) };
    const [items, total] = await this.db.$transaction([
      this.db.caseReferral.findMany({ where, include: { case: caseSummary }, orderBy: { createdAt: 'desc' }, skip: paging.skip, take: paging.take }),
      this.db.caseReferral.count({ where })
    ]);
    return { items, total, page: paging.page, limit: paging.limit };
  }
  async createReferral(actor: string, caseId: string, data: { typeCode: string; institutionName: string; reason: string; contactName?: string }, ctx: AuditRequestContext) {
    return this.db.$transaction(async (tx) => {
      await this.requireOpenCase(actor, caseId, tx);
      const referral = await tx.caseReferral.create({ data: { caseId, typeCode: data.typeCode.trim().toUpperCase(), institutionName: data.institutionName.trim(), reason: data.reason.trim(), contactName: data.contactName?.trim() || null, createdByUserId: actor } });
      await this.event(tx, caseId, actor, CaseEventType.REFERRAL_CREATED, 'CASE_REFERRAL', referral.id);
      await this.record(tx, actor, 'REFERRAL_CREATED', 'CASE_REFERRAL', referral.id, { caseId, typeCode: referral.typeCode }, ctx);
      return referral;
    });
  }
  async updateReferral(actor: string, caseId: string, id: string, data: { expectedVersion: number; status?: ReferralStatus; contactName?: string | null; responseNote?: string | null }, ctx: AuditRequestContext) {
    return this.db.$transaction(async (tx) => {
      await this.requireOpenCase(actor, caseId, tx);
      const current = await tx.caseReferral.findFirst({ where: { id, caseId } });
      if (!current) throw new NotFoundException('Derivación no disponible');
      if (current.status === ReferralStatus.CERRADA) throw new ConflictException('La derivación ya fue cerrada y no admite cambios');
      if (data.status && data.status !== current.status && !REFERRAL_TRANSITIONS[current.status].includes(data.status)) throw new ConflictException('Cambio de estado no permitido');
      const now = new Date();
      const result = await tx.caseReferral.updateMany({ where: { id, caseId, version: data.expectedVersion }, data: { ...(data.status && data.status !== current.status ? { status: data.status } : {}), ...(data.status === ReferralStatus.ENVIADA ? { sentAt: now } : {}), ...(data.status === ReferralStatus.CON_RESPUESTA ? { responseAt: now } : {}), ...(data.status === ReferralStatus.CERRADA ? { closedAt: now } : {}), ...(data.contactName === undefined ? {} : { contactName: data.contactName?.trim() || null }), ...(data.responseNote === undefined ? {} : { responseNote: data.responseNote?.trim() || null }), version: { increment: 1 } } });
      if (result.count !== 1) throw new ConflictException('La derivación fue modificada por otra persona');
      await this.event(tx, caseId, actor, CaseEventType.REFERRAL_UPDATED, 'CASE_REFERRAL', id);
      await this.record(tx, actor, 'REFERRAL_UPDATED', 'CASE_REFERRAL', id, { caseId, status: data.status ?? current.status }, ctx);
      return tx.caseReferral.findUniqueOrThrow({ where: { id } });
    });
  }

  private async requireOpenCase(actor: string, caseId: string, tx: Tx) {
    const record = await this.institutions.requireCaseAccess(actor, caseId, true, tx);
    if (record.status === CaseStatus.CERRADO) throw new ConflictException('El expediente está cerrado y debe reabrirse antes de registrar acciones');
    return record;
  }
  private event(tx: Tx, caseId: string, actor: string, type: CaseEventType, entityType: string, entityId: string) {
    return tx.caseEvent.create({ data: { caseId, actorUserId: actor, eventType: type, correlationId: randomUUID(), relatedEntityType: entityType, relatedEntityId: entityId } });
  }
  private record(tx: Tx, actor: string, action: string, targetType: string, targetId: string, metadata: Record<string, unknown>, context: AuditRequestContext) {
    return tx.securityAudit.create({ data: this.audit.data({ actorUserId: actor, action, targetType, targetId, metadata, context }) });
  }
}
