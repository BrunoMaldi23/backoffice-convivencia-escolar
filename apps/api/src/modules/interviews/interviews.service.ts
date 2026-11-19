import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CaseEventType, DocumentKind, DocumentStorageProvider, InterviewStatus, Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { AuditRequestContext, SecurityAuditService } from '../../common/security/security-audit.service';
import { DatabaseService } from '../../database/database.service';
import { InstitutionsService } from '../institutions/institutions.service';
import { PrivateStorageService } from '../case-operations/private-storage.service';
import { InterviewPdfService } from './interview-pdf.service';

type InterviewInput = { occurredAt: Date; modalityCode: string; summary: string; restrictedNotes?: string; agreements?: string; studentName?: string; guardianName?: string; courseName?: string; requestedBy?: string[]; reasonCategories?: string[]; interviewReason?: string };

@Injectable()
export class InterviewsService {
  constructor(private readonly db: DatabaseService, private readonly institutions: InstitutionsService, private readonly audit: SecurityAuditService, private readonly storage: PrivateStorageService, private readonly pdf: InterviewPdfService) {}
  async list(actorId: string, caseId: string) { await this.institutions.requireCaseAccess(actorId, caseId); return this.db.interview.findMany({ where: { caseId, voidedAt: null }, orderBy: { occurredAt: 'asc' } }); }
  async create(actorId: string, caseId: string, input: InterviewInput, context: AuditRequestContext) { return this.db.$transaction(async tx => {
    await this.institutions.requireCaseAccess(actorId, caseId, true, tx);
    const interview = await tx.interview.create({ data: { caseId, interviewerUserId: actorId, ...input, studentName: input.studentName?.trim() || 'Sin registro', requestedBy: input.requestedBy ?? [], reasonCategories: input.reasonCategories ?? [], modalityCode: input.modalityCode.trim().toUpperCase() } });
    await this.event(tx, caseId, actorId, CaseEventType.INTERVIEW_CREATED, interview.id);
    await tx.securityAudit.create({ data: this.audit.data({ actorUserId: actorId, action: 'INTERVIEW_CREATED', targetType: 'INTERVIEW', targetId: interview.id, metadata: { caseId }, context }) });
    return interview;
  }); }
  async update(actorId: string, caseId: string, id: string, data: InterviewInput & { expectedVersion: number }, context: AuditRequestContext) { return this.db.$transaction(async tx => {
    await this.institutions.requireCaseAccess(actorId, caseId, true, tx);
    const found = await tx.interview.findFirst({ where: { id, caseId, voidedAt: null } }); if (!found) throw new NotFoundException('Entrevista no disponible');
    if (found.status === InterviewStatus.FINALIZADA) throw new ConflictException('La entrevista finalizada requiere corrección');
    const { expectedVersion, ...input } = data;
    const changed = await tx.interview.updateMany({ where: { id, caseId, version: expectedVersion, status: InterviewStatus.BORRADOR, voidedAt: null }, data: { ...input, ...(input.studentName === undefined ? {} : { studentName: input.studentName.trim() || 'Sin registro' }), ...(input.requestedBy === undefined ? {} : { requestedBy: input.requestedBy }), ...(input.reasonCategories === undefined ? {} : { reasonCategories: input.reasonCategories }), modalityCode: input.modalityCode.trim().toUpperCase(), version: { increment: 1 } } });
    if (changed.count !== 1) throw new ConflictException('La entrevista fue modificada por otra persona');
    const interview = await tx.interview.findUniqueOrThrow({ where: { id } });
    await tx.securityAudit.create({ data: this.audit.data({ actorUserId: actorId, action: 'INTERVIEW_UPDATED', targetType: 'INTERVIEW', targetId: id, context }) }); return interview;
  }); }
  async finalize(actorId: string, caseId: string, id: string, data: { expectedVersion: number; intervieweeSignature?: string; interviewerSignature?: string }, context: AuditRequestContext) {
    const source = await this.db.interview.findFirst({ where: { id, caseId, version: data.expectedVersion, status: InterviewStatus.BORRADOR, voidedAt: null }, include: { interviewer: { select: { displayName: true } }, case: { include: { establishment: { select: { id: true, name: true } } } } } });
    if (!source) throw new ConflictException('La entrevista no está disponible para finalizar');
    if (!data.intervieweeSignature || !data.interviewerSignature) {
      if (source.studentName) throw new ConflictException('Se requieren ambas firmas para finalizar esta entrevista');
      return this.db.$transaction(async tx => {
        const changed = await tx.interview.updateMany({ where: { id, caseId, version: data.expectedVersion, status: InterviewStatus.BORRADOR, voidedAt: null }, data: { status: InterviewStatus.FINALIZADA, finalizedAt: new Date(), version: { increment: 1 } } });
        if (!changed.count) throw new ConflictException('La entrevista fue modificada por otra persona');
        const interview = await tx.interview.findUniqueOrThrow({ where: { id } }); await this.event(tx, caseId, actorId, CaseEventType.INTERVIEW_FINALIZED, id); return interview;
      });
    }
    const content = await this.pdf.create({ establishmentName: source.case.establishment.name, studentName: source.studentName, guardianName: source.guardianName, courseName: source.courseName, occurredAt: source.occurredAt, interviewerName: source.interviewer.displayName, requestedBy: source.requestedBy, reasonCategories: source.reasonCategories, interviewReason: source.interviewReason, summary: source.summary, agreements: source.agreements, intervieweeSignature: data.intervieweeSignature, interviewerSignature: data.interviewerSignature });
    const saved = this.storage.validate(content, 'application/pdf');
    const storageKey = this.storage.newSupabaseKey(source.case.establishment.id, caseId);
    await this.storage.save(DocumentStorageProvider.SUPABASE, storageKey, content, 'application/pdf');
    try { return await this.db.$transaction(async tx => {
      await this.institutions.requireCaseAccess(actorId, caseId, true, tx);
      const current = await tx.interview.findFirst({ where: { id, caseId, version: data.expectedVersion, status: InterviewStatus.BORRADOR, voidedAt: null } });
      if (!current) throw new ConflictException('La entrevista fue modificada por otra persona');
      const document = await tx.caseDocument.create({ data: { caseId, uploadedByUserId: actorId, kind: DocumentKind.DOCUMENTO, originalFilename: `entrevista-${id}.pdf`, storageProvider: DocumentStorageProvider.SUPABASE, storageKey, contentType: 'application/pdf', sizeBytes: saved.sizeBytes, sha256: saved.sha256 } });
      const interview = await tx.interview.update({ where: { id }, data: { status: InterviewStatus.FINALIZADA, finalizedAt: new Date(), finalDocumentId: document.id, version: { increment: 1 } } });
      await this.event(tx, caseId, actorId, CaseEventType.INTERVIEW_FINALIZED, id);
      await tx.securityAudit.create({ data: this.audit.data({ actorUserId: actorId, action: 'INTERVIEW_FINALIZED', targetType: 'INTERVIEW', targetId: id, metadata: { caseId, documentId: document.id, sha256: createHash('sha256').update(content).digest('hex') }, context }) });
      return interview;
    }); } catch (error) { await this.storage.remove(DocumentStorageProvider.SUPABASE, storageKey); throw error; }
  }
  async correct(actorId: string, caseId: string, id: string, reason: string, context: AuditRequestContext) { return this.db.$transaction(async tx => {
    await this.institutions.requireCaseAccess(actorId, caseId, true, tx);
    const interview = await tx.interview.findFirst({ where: { id, caseId, status: InterviewStatus.FINALIZADA, voidedAt: null } }); if (!interview) throw new NotFoundException('Entrevista finalizada no disponible');
    await tx.interviewCorrection.create({ data: { interviewId: id, actorUserId: actorId, reason: reason.trim(), previousVersion: interview.version } });
    const updated = await tx.interview.update({ where: { id }, data: { status: InterviewStatus.BORRADOR, finalizedAt: null, version: { increment: 1 } } });
    await this.event(tx, caseId, actorId, CaseEventType.INTERVIEW_CORRECTED, id); await tx.securityAudit.create({ data: this.audit.data({ actorUserId: actorId, action: 'INTERVIEW_CORRECTED', targetType: 'INTERVIEW', targetId: id, context }) }); return updated;
  }); }
  async removeDraft(actorId: string, caseId: string, id: string, expectedVersion: number, context: AuditRequestContext) { return this.db.$transaction(async tx => {
    await this.institutions.requireCaseAccess(actorId, caseId, true, tx);
    const draft = await tx.interview.findFirst({ where: { id, caseId, status: InterviewStatus.BORRADOR, version: expectedVersion, voidedAt: null } });
    if (!draft) throw new ConflictException('El borrador no está disponible para eliminar');
    await tx.interviewCorrection.deleteMany({ where: { interviewId: id } });
    await tx.caseEvent.deleteMany({ where: { caseId, relatedEntityType: 'INTERVIEW', relatedEntityId: id } });
    await tx.interview.delete({ where: { id } });
    await tx.securityAudit.create({ data: this.audit.data({ actorUserId: actorId, action: 'INTERVIEW_DRAFT_DELETED', targetType: 'INTERVIEW', targetId: id, metadata: { caseId }, context }) });
    return { id };
  }); }
  async void(actorId: string, caseId: string, id: string, data: { expectedVersion: number; reason: string }, context: AuditRequestContext) { return this.db.$transaction(async tx => {
    await this.institutions.requireCaseAccess(actorId, caseId, true, tx);
    const changed = await tx.interview.updateMany({ where: { id, caseId, version: data.expectedVersion, voidedAt: null }, data: { voidedAt: new Date(), voidReason: data.reason.trim(), version: { increment: 1 } } });
    if (changed.count !== 1) throw new ConflictException('La entrevista fue modificada o ya fue anulada');
    const interview = await tx.interview.findUniqueOrThrow({ where: { id } });
    await this.event(tx, caseId, actorId, CaseEventType.INTERVIEW_VOIDED, id);
    await tx.securityAudit.create({ data: this.audit.data({ actorUserId: actorId, action: 'INTERVIEW_VOIDED', targetType: 'INTERVIEW', targetId: id, metadata: { caseId }, context }) });
    return interview;
  }); }
  private event(tx: Prisma.TransactionClient, caseId: string, actorId: string, eventType: CaseEventType, id: string) { return tx.caseEvent.create({ data: { caseId, actorUserId: actorId, eventType, correlationId: randomUUID(), relatedEntityType: 'INTERVIEW', relatedEntityId: id } }); }
}
