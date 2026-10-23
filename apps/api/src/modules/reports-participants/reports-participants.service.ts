import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CaseEventType, ParticipantKind, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AuditRequestContext, SecurityAuditService } from '../../common/security/security-audit.service';
import { DatabaseService } from '../../database/database.service';
import { InstitutionsService } from '../institutions/institutions.service';
@Injectable()
export class ReportsParticipantsService {
  constructor(private readonly db: DatabaseService, private readonly institutions: InstitutionsService, private readonly audit: SecurityAuditService) {}
  async listReports(actor: string, caseId: string) { await this.institutions.requireCaseAccess(actor, caseId); return this.db.caseReport.findMany({ where: { caseId }, orderBy: { receivedAt: 'asc' } }); }
  async createReport(actor: string, caseId: string, data: { receivedAt: Date; channelCode: string; classificationCode: string; factualDescription: string; background?: string }, ctx: AuditRequestContext) { return this.db.$transaction(async tx => { const c = await this.institutions.requireCaseAccess(actor, caseId, true, tx); const r = await tx.caseReport.create({ data: { caseId, establishmentId: c.establishmentId, createdByUserId: actor, ...data } }); await this.event(tx, caseId, actor, CaseEventType.REPORT_CREATED, r.id); await tx.securityAudit.create({ data: this.audit.data({ actorUserId: actor, action: 'REPORT_CREATED', targetType: 'CASE_REPORT', targetId: r.id, metadata: { caseId }, context: ctx }) }); return r; }); }
  async updateReport(actor: string, caseId: string, id: string, data: { expectedVersion: number; channelCode?: string; classificationCode?: string; factualDescription?: string; background?: string | null }, ctx: AuditRequestContext) { return this.db.$transaction(async tx => { await this.institutions.requireCaseAccess(actor, caseId, true, tx); const { expectedVersion, ...update } = data; const result = await tx.caseReport.updateMany({ where: { id, caseId, version: expectedVersion }, data: { ...update, version: { increment: 1 } } }); if (result.count !== 1) throw new ConflictException('La denuncia fue modificada por otra persona'); const r = await tx.caseReport.findUniqueOrThrow({ where: { id } }); await this.event(tx, caseId, actor, CaseEventType.REPORT_UPDATED, id); await tx.securityAudit.create({ data: this.audit.data({ actorUserId: actor, action: 'REPORT_UPDATED', targetType: 'CASE_REPORT', targetId: id, context: ctx }) }); return r; }); }
  /**
   * Crea el involucrado. Puede apuntar a una persona del directorio (estudiante, apoderado o funcionario);
   * en ese caso la etiqueta por defecto es su nombre y, si ya existe un involucrado activo para esa persona, se reutiliza.
   */
  async createParticipant(actor: string, establishmentId: string, input: { kind: ParticipantKind; referenceLabel?: string; studentId?: string; guardianId?: string; staffMemberId?: string }, ctx: AuditRequestContext) {
    const links = [input.studentId, input.guardianId, input.staffMemberId].filter(Boolean);
    if (links.length > 1) throw new BadRequestException('Indique una sola persona del directorio');
    return this.db.$transaction(async tx => {
      await this.institutions.requireActiveMembership(actor, establishmentId, tx);
      const person = await this.directoryPerson(tx, establishmentId, input);
      if (person) { const existing = await tx.participant.findFirst({ where: { establishmentId, isActive: true, ...person.link } }); if (existing) return existing; }
      const referenceLabel = input.referenceLabel?.trim() || person?.label;
      if (!referenceLabel) throw new BadRequestException('Indique una referencia o elija una persona del directorio');
      const p = await tx.participant.create({ data: { establishmentId, kind: input.kind, referenceLabel, ...(person?.link ?? {}) } });
      await tx.securityAudit.create({ data: this.audit.data({ actorUserId: actor, action: 'PARTICIPANT_CREATED', targetType: 'PARTICIPANT', targetId: p.id, metadata: { establishmentId, kind: input.kind, fromDirectory: Boolean(person) }, context: ctx }) });
      return p;
    });
  }
  private async directoryPerson(tx: Prisma.TransactionClient, establishmentId: string, input: { kind: ParticipantKind; studentId?: string; guardianId?: string; staffMemberId?: string }) {
    const name = (person: { firstNames: string; lastNames: string }) => `${person.firstNames} ${person.lastNames}`;
    if (input.studentId) {
      if (input.kind !== ParticipantKind.ESTUDIANTE) throw new BadRequestException('El tipo de involucrado no corresponde a un estudiante');
      const student = await tx.student.findFirst({ where: { id: input.studentId, establishmentId, isActive: true } });
      if (!student) throw new NotFoundException('Estudiante no disponible');
      return { label: name(student), link: { studentId: student.id } };
    }
    if (input.guardianId) {
      if (input.kind !== ParticipantKind.APODERADO) throw new BadRequestException('El tipo de involucrado no corresponde a un apoderado');
      const guardian = await tx.guardian.findFirst({ where: { id: input.guardianId, establishmentId, isActive: true } });
      if (!guardian) throw new NotFoundException('Apoderado no disponible');
      return { label: name(guardian), link: { guardianId: guardian.id } };
    }
    if (input.staffMemberId) {
      if (input.kind !== ParticipantKind.FUNCIONARIO) throw new BadRequestException('El tipo de involucrado no corresponde a un funcionario');
      const member = await tx.staffMember.findFirst({ where: { id: input.staffMemberId, establishmentId, isActive: true } });
      if (!member) throw new NotFoundException('Funcionario no disponible');
      return { label: name(member), link: { staffMemberId: member.id } };
    }
    return null;
  }
  async listParticipants(actor: string, caseId: string) { await this.institutions.requireCaseAccess(actor, caseId); return this.db.caseParticipant.findMany({ where: { caseId, unlinkedAt: null }, include: { participant: true }, orderBy: { linkedAt: 'asc' } }); }
  async link(actor: string, caseId: string, participantId: string, participationCode: string, ctx: AuditRequestContext) { return this.db.$transaction(async tx => { const c = await this.institutions.requireCaseAccess(actor, caseId, true, tx); const p = await tx.participant.findFirst({ where: { id: participantId, establishmentId: c.establishmentId, isActive: true } }); if (!p) throw new NotFoundException('Involucrado no disponible'); const exists = await tx.caseParticipant.findFirst({ where: { caseId, participantId, unlinkedAt: null } }); if (exists) throw new ConflictException('El involucrado ya está asociado'); const link = await tx.caseParticipant.create({ data: { caseId, participantId, participationCode: participationCode.trim().toUpperCase(), linkedByUserId: actor } }); await this.event(tx, caseId, actor, CaseEventType.PARTICIPANT_LINKED, link.id); await tx.securityAudit.create({ data: this.audit.data({ actorUserId: actor, action: 'PARTICIPANT_LINKED', targetType: 'CASE_PARTICIPANT', targetId: link.id, metadata: { caseId }, context: ctx }) }); return link; }); }
  async unlink(actor: string, caseId: string, linkId: string, ctx: AuditRequestContext) { return this.db.$transaction(async tx => { await this.institutions.requireCaseAccess(actor, caseId, true, tx); const link = await tx.caseParticipant.findFirst({ where: { id: linkId, caseId, unlinkedAt: null } }); if (!link) throw new NotFoundException('Asociación no disponible'); const updated = await tx.caseParticipant.update({ where: { id: linkId }, data: { unlinkedAt: new Date() } }); await this.event(tx, caseId, actor, CaseEventType.PARTICIPANT_UNLINKED, linkId); await tx.securityAudit.create({ data: this.audit.data({ actorUserId: actor, action: 'PARTICIPANT_UNLINKED', targetType: 'CASE_PARTICIPANT', targetId: linkId, context: ctx }) }); return updated; }); }
  private event(tx: Prisma.TransactionClient, caseId: string, actor: string, type: CaseEventType, id: string) { return tx.caseEvent.create({ data: { caseId, actorUserId: actor, eventType: type, correlationId: randomUUID(), relatedEntityType: type.startsWith('REPORT') ? 'CASE_REPORT' : 'CASE_PARTICIPANT', relatedEntityId: id } }); }
}
