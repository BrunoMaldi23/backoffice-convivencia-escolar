import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CaseEventType, CaseStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../../database/database.service';
import { SecurityAuditService, AuditRequestContext } from '../../common/security/security-audit.service';
import { InstitutionsService } from '../institutions/institutions.service';

type CreateCaseInput = { establishmentId: string; title: string; initialDescription?: string; receivedAt: Date; categoryCode: string; priority: string; currentStageId?: string; responsibleUserId?: string; nextAction?: string; nextActionDueAt?: Date };
type UpdateCaseInput = { expectedVersion: number; title?: string; categoryCode?: string; priority?: string; receivedAt?: Date; currentStageId?: string | null; nextAction?: string | null; nextActionDueAt?: Date | null };
type AssignInput = { responsibleUserId: string; expectedVersion: number; reason?: string };
type TransitionInput = { toStatus: CaseStatus; stageId?: string; reason?: string; expectedVersion: number };

const transitions: Record<CaseStatus, CaseStatus[]> = {
  ABIERTO: ['EN_EVALUACION', 'PAUSADO'], EN_EVALUACION: ['EN_PROCESO', 'PAUSADO', 'RESUELTO'],
  EN_PROCESO: ['PAUSADO', 'RESUELTO'], PAUSADO: ['EN_EVALUACION', 'EN_PROCESO'],
  RESUELTO: ['CERRADO', 'EN_PROCESO'], CERRADO: ['EN_EVALUACION']
};

const relevantTimelineEvents: CaseEventType[] = [
  CaseEventType.CASE_CREATED, CaseEventType.CASE_ASSIGNED, CaseEventType.CASE_STAGE_CHANGED,
  CaseEventType.CASE_TRANSITIONED, CaseEventType.CASE_PAUSED, CaseEventType.CASE_RESUMED,
  CaseEventType.CASE_RESOLVED, CaseEventType.CASE_CLOSED, CaseEventType.CASE_REOPENED,
  CaseEventType.REPORT_CREATED, CaseEventType.REPORT_VOIDED, CaseEventType.INTERVIEW_FINALIZED, CaseEventType.INTERVIEW_CORRECTED,
  CaseEventType.INTERVIEW_VOIDED, CaseEventType.DOCUMENT_UPLOADED, CaseEventType.DOCUMENT_VOIDED, CaseEventType.PROTOCOL_APPLIED, CaseEventType.PROTOCOL_REVOKED, CaseEventType.MEASURE_CREATED,
  CaseEventType.MEASURE_UPDATED, CaseEventType.FOLLOW_UP_CREATED, CaseEventType.FOLLOW_UP_VOIDED, CaseEventType.TASK_CREATED,
  CaseEventType.PARTICIPANT_UPDATED, CaseEventType.TASK_UPDATED, CaseEventType.TASK_COMPLETED, CaseEventType.TASK_CANCELLED, CaseEventType.SUMMONS_CREATED, CaseEventType.SUMMONS_UPDATED,
  CaseEventType.REFERRAL_CREATED, CaseEventType.REFERRAL_UPDATED
];

@Injectable()
export class CasesService {
  constructor(private readonly db: DatabaseService, private readonly institutions: InstitutionsService, private readonly audit: SecurityAuditService) {}

  async create(actorId: string, input: CreateCaseInput, context: AuditRequestContext) {
    return this.db.$transaction(async (tx) => {
      await this.institutions.requireActiveMembership(actorId, input.establishmentId, tx);
      await tx.$queryRaw`SELECT id FROM establishments WHERE id = ${input.establishmentId} FOR UPDATE`;
      const establishment = await tx.establishment.findUnique({ where: { id: input.establishmentId } });
      if (!establishment?.isActive) throw new NotFoundException('Establecimiento no disponible');
      if (input.currentStageId) await this.requireStage(tx, input.establishmentId, input.currentStageId);
      if (input.responsibleUserId) await this.institutions.requireActiveMembership(input.responsibleUserId, input.establishmentId, tx);
      const folio = establishment.nextCaseSequence;
      await tx.establishment.update({ where: { id: establishment.id }, data: { nextCaseSequence: { increment: 1 } } });
      const record = await tx.case.create({ data: { ...input, initialDescription: input.initialDescription ?? '', folio, createdByUserId: actorId } });
      const correlationId = randomUUID();
      if (input.responsibleUserId) await tx.caseAssignment.create({ data: { caseId: record.id, userId: input.responsibleUserId, assignedByUserId: actorId } });
      await this.event(tx, record.id, actorId, CaseEventType.CASE_CREATED, correlationId, { newStatus: record.status, newStageId: record.currentStageId, relatedEntityType: 'CASE' });
      await tx.securityAudit.create({ data: this.audit.data({ actorUserId: actorId, action: 'CASE_CREATED', targetType: 'CASE', targetId: record.id, metadata: { establishmentId: input.establishmentId, folio }, context }) });
      return record;
    });
  }

  async list(actorId: string, filters: { establishmentId?: string; status?: CaseStatus; responsibleUserId?: string; priority?: string; stageId?: string; from?: Date; to?: Date; page: number; limit: number }) {
    if (filters.establishmentId) await this.institutions.requireActiveMembership(actorId, filters.establishmentId);
    const where: Prisma.CaseWhereInput = { ...this.institutions.caseAccessWhere(actorId), ...(filters.establishmentId ? { establishmentId: filters.establishmentId } : {}), ...(filters.status ? { status: filters.status } : {}), ...(filters.responsibleUserId ? { responsibleUserId: filters.responsibleUserId } : {}), ...(filters.priority ? { priority: filters.priority } : {}), ...(filters.stageId ? { currentStageId: filters.stageId } : {}), ...((filters.from || filters.to) ? { receivedAt: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } } : {}) };
    const [items, total] = await this.db.$transaction([this.db.case.findMany({ where, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], skip: (filters.page - 1) * filters.limit, take: filters.limit }), this.db.case.count({ where })]);
    return { items, total, page: filters.page, limit: filters.limit };
  }

  async get(actorId: string, caseId: string) { return this.institutions.requireCaseAccess(actorId, caseId); }

  async update(actorId: string, caseId: string, input: UpdateCaseInput, context: AuditRequestContext) {
    return this.db.$transaction(async (tx) => {
      const before = await this.institutions.requireCaseAccess(actorId, caseId, true, tx);
      if (input.currentStageId) await this.requireStage(tx, before.establishmentId, input.currentStageId);
      const { expectedVersion, ...data } = input;
      const updated = await tx.case.updateMany({ where: { id: caseId, version: expectedVersion }, data: { ...data, version: { increment: 1 } } });
      if (updated.count !== 1) throw new ConflictException('El expediente fue modificado por otra persona');
      const after = await tx.case.findUniqueOrThrow({ where: { id: caseId } });
      await this.event(tx, caseId, actorId, input.currentStageId && input.currentStageId !== before.currentStageId ? CaseEventType.CASE_STAGE_CHANGED : CaseEventType.CASE_UPDATED, randomUUID(), { previousStatus: before.status, newStatus: after.status, previousStageId: before.currentStageId, newStageId: after.currentStageId });
      await tx.securityAudit.create({ data: this.audit.data({ actorUserId: actorId, action: 'CASE_UPDATED', targetType: 'CASE', targetId: caseId, changes: { version: { before: before.version, after: after.version } }, context }) });
      return after;
    });
  }

  async assign(actorId: string, caseId: string, input: AssignInput, context: AuditRequestContext) {
    return this.db.$transaction(async (tx) => {
      const before = await this.institutions.requireCaseAccess(actorId, caseId, true, tx);
      await this.institutions.requireActiveMembership(input.responsibleUserId, before.establishmentId, tx);
      const updated = await tx.case.updateMany({ where: { id: caseId, version: input.expectedVersion }, data: { responsibleUserId: input.responsibleUserId, version: { increment: 1 } } });
      if (updated.count !== 1) throw new ConflictException('El expediente fue modificado por otra persona');
      await tx.caseAssignment.updateMany({ where: { caseId, unassignedAt: null }, data: { unassignedAt: new Date() } });
      const assignment = await tx.caseAssignment.create({ data: { caseId, userId: input.responsibleUserId, assignedByUserId: actorId, reason: input.reason } });
      await this.event(tx, caseId, actorId, CaseEventType.CASE_ASSIGNED, randomUUID(), { previousStatus: before.status, newStatus: before.status, previousStageId: before.currentStageId, newStageId: before.currentStageId, relatedEntityType: 'CASE_ASSIGNMENT', relatedEntityId: assignment.id });
      await tx.securityAudit.create({ data: this.audit.data({ actorUserId: actorId, action: 'CASE_ASSIGNED', targetType: 'CASE', targetId: caseId, metadata: { responsibleUserId: input.responsibleUserId }, context }) });
      return tx.case.findUniqueOrThrow({ where: { id: caseId } });
    });
  }

  async transition(actorId: string, caseId: string, input: TransitionInput, context: AuditRequestContext) {
    return this.db.$transaction(async (tx) => {
      const before = await this.institutions.requireCaseAccess(actorId, caseId, true, tx);
      if (!transitions[before.status].includes(input.toStatus)) throw new BadRequestException('Transición de estado no permitida');
      const requiresReason = input.toStatus === CaseStatus.PAUSADO || input.toStatus === CaseStatus.RESUELTO || before.status === CaseStatus.PAUSADO || (before.status === CaseStatus.RESUELTO && input.toStatus === CaseStatus.EN_PROCESO) || input.toStatus === CaseStatus.CERRADO || before.status === CaseStatus.CERRADO;
      if (requiresReason && !input.reason?.trim()) throw new BadRequestException('La transición requiere un motivo');
      if (input.toStatus === CaseStatus.CERRADO) await this.requirePermission(actorId, 'cases.close');
      if (before.status === CaseStatus.CERRADO) await this.requirePermission(actorId, 'cases.reopen');
      if (input.stageId) await this.requireStage(tx, before.establishmentId, input.stageId);
      const updated = await tx.case.updateMany({ where: { id: caseId, version: input.expectedVersion }, data: { status: input.toStatus, currentStageId: input.stageId ?? before.currentStageId, closedAt: input.toStatus === CaseStatus.CERRADO ? new Date() : null, closureReason: input.toStatus === CaseStatus.CERRADO ? input.reason : null, version: { increment: 1 } } });
      if (updated.count !== 1) throw new ConflictException('El expediente fue modificado por otra persona');
      const type = input.toStatus === CaseStatus.PAUSADO ? CaseEventType.CASE_PAUSED : input.toStatus === CaseStatus.RESUELTO ? CaseEventType.CASE_RESOLVED : input.toStatus === CaseStatus.CERRADO ? CaseEventType.CASE_CLOSED : before.status === CaseStatus.CERRADO ? CaseEventType.CASE_REOPENED : before.status === CaseStatus.PAUSADO ? CaseEventType.CASE_RESUMED : CaseEventType.CASE_TRANSITIONED;
      await this.event(tx, caseId, actorId, type, randomUUID(), { previousStatus: before.status, newStatus: input.toStatus, previousStageId: before.currentStageId, newStageId: input.stageId ?? before.currentStageId });
      await tx.securityAudit.create({ data: this.audit.data({ actorUserId: actorId, action: type, targetType: 'CASE', targetId: caseId, metadata: { from: before.status, to: input.toStatus }, context }) });
      return tx.case.findUniqueOrThrow({ where: { id: caseId } });
    });
  }

  async timeline(actorId: string, caseId: string, page: number, limit: number, mode: 'relevant' | 'all' = 'relevant') {
    await this.institutions.requireCaseAccess(actorId, caseId);
    const where: Prisma.CaseEventWhereInput = { caseId, ...(mode === 'relevant' ? { eventType: { in: relevantTimelineEvents } } : {}) };
    const [items, total] = await this.db.$transaction([this.db.caseEvent.findMany({ where, orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * limit, take: limit }), this.db.caseEvent.count({ where })]);
    return { items, total, page, limit };
  }

  private async requireStage(tx: Prisma.TransactionClient, establishmentId: string, stageId: string) {
    const stage = await tx.caseStage.findFirst({ where: { id: stageId, establishmentId, isActive: true } });
    if (!stage) throw new BadRequestException('Etapa no disponible para el establecimiento');
  }

  private async requirePermission(userId: string, code: string) {
    const permission = await this.db.rolePermission.findFirst({ where: { permission: { code }, role: { users: { some: { userId } } } } });
    if (!permission) throw new ForbiddenException('Permiso insuficiente');
  }

  private async event(tx: Prisma.TransactionClient, caseId: string, actorUserId: string, eventType: CaseEventType, correlationId: string, data: Omit<Prisma.CaseEventUncheckedCreateInput, 'caseId' | 'actorUserId' | 'eventType' | 'correlationId'>) {
    await tx.caseEvent.create({ data: { caseId, actorUserId, eventType, correlationId, ...data } });
  }
}
