import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CaseEventType, InterviewStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { AuditRequestContext, SecurityAuditService } from '../../common/security/security-audit.service';
import { DatabaseService } from '../../database/database.service';
import { InstitutionsService } from '../institutions/institutions.service';

type InterviewInput = { occurredAt: Date; modalityCode: string; summary: string; restrictedNotes?: string; agreements?: string };

@Injectable()
export class InterviewsService {
  constructor(private readonly db: DatabaseService, private readonly institutions: InstitutionsService, private readonly audit: SecurityAuditService) {}
  async list(actorId: string, caseId: string) { await this.institutions.requireCaseAccess(actorId, caseId); return this.db.interview.findMany({ where: { caseId }, orderBy: { occurredAt: 'asc' } }); }
  async create(actorId: string, caseId: string, input: InterviewInput, context: AuditRequestContext) { return this.db.$transaction(async tx => {
    await this.institutions.requireCaseAccess(actorId, caseId, true, tx);
    const interview = await tx.interview.create({ data: { caseId, interviewerUserId: actorId, ...input, modalityCode: input.modalityCode.trim().toUpperCase() } });
    await this.event(tx, caseId, actorId, CaseEventType.INTERVIEW_CREATED, interview.id);
    await tx.securityAudit.create({ data: this.audit.data({ actorUserId: actorId, action: 'INTERVIEW_CREATED', targetType: 'INTERVIEW', targetId: interview.id, metadata: { caseId }, context }) });
    return interview;
  }); }
  async update(actorId: string, caseId: string, id: string, data: InterviewInput & { expectedVersion: number }, context: AuditRequestContext) { return this.db.$transaction(async tx => {
    await this.institutions.requireCaseAccess(actorId, caseId, true, tx);
    const found = await tx.interview.findFirst({ where: { id, caseId } }); if (!found) throw new NotFoundException('Entrevista no disponible');
    if (found.status === InterviewStatus.FINALIZADA) throw new ConflictException('La entrevista finalizada requiere corrección');
    const { expectedVersion, ...input } = data;
    const changed = await tx.interview.updateMany({ where: { id, caseId, version: expectedVersion, status: InterviewStatus.BORRADOR }, data: { ...input, modalityCode: input.modalityCode.trim().toUpperCase(), version: { increment: 1 } } });
    if (changed.count !== 1) throw new ConflictException('La entrevista fue modificada por otra persona');
    const interview = await tx.interview.findUniqueOrThrow({ where: { id } });
    await tx.securityAudit.create({ data: this.audit.data({ actorUserId: actorId, action: 'INTERVIEW_UPDATED', targetType: 'INTERVIEW', targetId: id, context }) }); return interview;
  }); }
  async finalize(actorId: string, caseId: string, id: string, expectedVersion: number, context: AuditRequestContext) { return this.db.$transaction(async tx => {
    await this.institutions.requireCaseAccess(actorId, caseId, true, tx);
    const changed = await tx.interview.updateMany({ where: { id, caseId, version: expectedVersion, status: InterviewStatus.BORRADOR }, data: { status: InterviewStatus.FINALIZADA, finalizedAt: new Date(), version: { increment: 1 } } });
    if (changed.count !== 1) throw new ConflictException('La entrevista no está disponible para finalizar');
    const interview = await tx.interview.findUniqueOrThrow({ where: { id } }); await this.event(tx, caseId, actorId, CaseEventType.INTERVIEW_FINALIZED, id);
    await tx.securityAudit.create({ data: this.audit.data({ actorUserId: actorId, action: 'INTERVIEW_FINALIZED', targetType: 'INTERVIEW', targetId: id, context }) }); return interview;
  }); }
  async correct(actorId: string, caseId: string, id: string, reason: string, context: AuditRequestContext) { return this.db.$transaction(async tx => {
    await this.institutions.requireCaseAccess(actorId, caseId, true, tx);
    const interview = await tx.interview.findFirst({ where: { id, caseId, status: InterviewStatus.FINALIZADA } }); if (!interview) throw new NotFoundException('Entrevista finalizada no disponible');
    await tx.interviewCorrection.create({ data: { interviewId: id, actorUserId: actorId, reason: reason.trim(), previousVersion: interview.version } });
    const updated = await tx.interview.update({ where: { id }, data: { status: InterviewStatus.BORRADOR, finalizedAt: null, version: { increment: 1 } } });
    await this.event(tx, caseId, actorId, CaseEventType.INTERVIEW_CORRECTED, id); await tx.securityAudit.create({ data: this.audit.data({ actorUserId: actorId, action: 'INTERVIEW_CORRECTED', targetType: 'INTERVIEW', targetId: id, context }) }); return updated;
  }); }
  private event(tx: Prisma.TransactionClient, caseId: string, actorId: string, eventType: CaseEventType, id: string) { return tx.caseEvent.create({ data: { caseId, actorUserId: actorId, eventType, correlationId: randomUUID(), relatedEntityType: 'INTERVIEW', relatedEntityId: id } }); }
}
