import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CaseEventType, CaseStatus, DocumentKind, DocumentStorageProvider, MeasureStatus, Prisma, ProtocolVersionStatus, TaskStatus } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { AuditRequestContext, SecurityAuditService } from '../../common/security/security-audit.service';
import { DatabaseService } from '../../database/database.service';
import { InstitutionsService } from '../institutions/institutions.service';
import { PrivateStorageService } from './private-storage.service';

/** Límite de protección para los listados globales: se consulta uno extra para informar resultados parciales con honestidad. */
const GLOBAL_WORK_ITEMS_LIMIT = 500;
const RICE_2026_PROTOCOLS = [
  'Maltrato, acoso escolar o violencia entre integrantes de la comunidad educativa',
  'Violencia o agresión de adulto(s) a estudiante(s)',
  'Violencia o agresión entre estudiantes',
  'Violencia o agresión entre adultos',
  'Posible vulneración de derechos',
  'Retención y apoyo a estudiantes embarazadas, madres y padres',
  'Sospecha de agresiones sexuales o hechos de connotación sexual',
  'Drogas y alcohol',
  'Conducta suicida',
  'Desregulación emocional y conductual',
  'Enfermedad o accidente escolar interno',
  'Admisión',
  'Becas y rebajas',
  'Salidas pedagógicas',
  'Aula Segura',
  'Restricción del uso de dispositivos móviles',
  'Revisión de mochilas, bolsos, casilleros y pertenencias',
] as const;

/** Campos estrictamente necesarios para enlazar una fila global con su expediente.
 * Evita serializar descripciones, auditoría y metadatos del expediente en cada fila. */
const globalCaseSummary = { select: { id: true, folio: true, title: true, status: true } } as const;

@Injectable()
export class CaseOperationsService {
  constructor(private readonly db: DatabaseService, private readonly institutions: InstitutionsService, private readonly audit: SecurityAuditService, private readonly storage: PrivateStorageService) {}
  private globalCaseWhere(actor: string, includeClosed: boolean): Prisma.CaseWhereInput { return { ...this.institutions.caseAccessWhere(actor), archivedAt: null, ...(includeClosed ? {} : { status: { not: CaseStatus.CERRADO } }) }; }
  private async globalMeta(actor: string, includeClosed: boolean) { const totalCases = await this.db.case.count({ where: this.globalCaseWhere(actor, includeClosed) }); return { scanned: totalCases, eligible: totalCases, totalCases, truncated: false }; }
  async listGlobalDocuments(actor: string, includeClosed: boolean) { const where = this.globalCaseWhere(actor, includeClosed); const [items, meta] = await Promise.all([this.db.caseDocument.findMany({ where: { voidedAt: null, case: where }, select: { id: true, kind: true, originalFilename: true, contentType: true, sizeBytes: true, sha256: true, externalUrl: true, version: true, createdAt: true, uploadedByUserId: true, case: globalCaseSummary }, orderBy: { createdAt: 'desc' }, take: GLOBAL_WORK_ITEMS_LIMIT + 1 }), this.globalMeta(actor, includeClosed)]); return { rows: items.slice(0, GLOBAL_WORK_ITEMS_LIMIT).map(({ case: record, ...item }) => ({ case: record, item })), ...meta, truncated: items.length > GLOBAL_WORK_ITEMS_LIMIT }; }
  async listGlobalMeasures(actor: string, includeClosed: boolean) { const where = this.globalCaseWhere(actor, includeClosed); const [items, meta] = await Promise.all([this.db.caseMeasure.findMany({ where: { case: where }, include: { responsibles: { select: { userId: true } }, case: globalCaseSummary }, orderBy: [{ dueAt: 'asc' }, { createdAt: 'asc' }], take: GLOBAL_WORK_ITEMS_LIMIT + 1 }), this.globalMeta(actor, includeClosed)]); return { rows: items.slice(0, GLOBAL_WORK_ITEMS_LIMIT).map(({ case: record, ...item }) => ({ case: record, item })), ...meta, truncated: items.length > GLOBAL_WORK_ITEMS_LIMIT }; }
  async listGlobalFollowUps(actor: string, includeClosed: boolean) { const where = this.globalCaseWhere(actor, includeClosed); const [items, meta] = await Promise.all([this.db.caseFollowUp.findMany({ where: { voidedAt: null, case: where }, include: { case: globalCaseSummary }, orderBy: { occurredAt: 'desc' }, take: GLOBAL_WORK_ITEMS_LIMIT + 1 }), this.globalMeta(actor, includeClosed)]); return { rows: items.slice(0, GLOBAL_WORK_ITEMS_LIMIT).map(({ case: record, ...item }) => ({ case: record, item })), ...meta, truncated: items.length > GLOBAL_WORK_ITEMS_LIMIT }; }
  async listGlobalTasks(actor: string, includeClosed: boolean) { const where = this.globalCaseWhere(actor, includeClosed); const [items, meta] = await Promise.all([this.db.caseTask.findMany({ where: { case: where }, include: { case: globalCaseSummary }, orderBy: [{ dueAt: 'asc' }, { createdAt: 'asc' }], take: GLOBAL_WORK_ITEMS_LIMIT + 1 }), this.globalMeta(actor, includeClosed)]); return { rows: items.slice(0, GLOBAL_WORK_ITEMS_LIMIT).map(({ case: record, ...item }) => ({ case: record, item })), ...meta, truncated: items.length > GLOBAL_WORK_ITEMS_LIMIT }; }
  async listGlobalInterviews(actor: string, includeClosed: boolean) { const where = this.globalCaseWhere(actor, includeClosed); const [items, meta] = await Promise.all([this.db.interview.findMany({ where: { voidedAt: null, case: where }, include: { case: globalCaseSummary }, orderBy: { occurredAt: 'desc' }, take: GLOBAL_WORK_ITEMS_LIMIT + 1 }), this.globalMeta(actor, includeClosed)]); return { rows: items.slice(0, GLOBAL_WORK_ITEMS_LIMIT).map(({ case: record, ...item }) => ({ case: record, item })), ...meta, truncated: items.length > GLOBAL_WORK_ITEMS_LIMIT }; }
  /** Datos pesados que el panel muestra juntos. Cada bloque conserva su permiso específico. */
  async dashboardWorkItems(actor: string, permissions: ReadonlySet<string>) {
    const allowed = <T>(permission: string, query: () => Promise<T>) => permissions.has(permission) ? query() : Promise.resolve(undefined);
    const [tasks, measures, followUps, interviews] = await Promise.all([
      allowed('tasks.read', () => this.listGlobalTasks(actor, false)),
      allowed('measures.read', () => this.listGlobalMeasures(actor, false)),
      allowed('follow-ups.read', () => this.listGlobalFollowUps(actor, false)),
      allowed('interviews.read', () => this.listGlobalInterviews(actor, false))
    ]);
    return { tasks, measures, followUps, interviews };
  }
  async listGlobalReports(actor: string, includeClosed: boolean) { const where = this.globalCaseWhere(actor, includeClosed); const [items, meta] = await Promise.all([this.db.caseReport.findMany({ where: { voidedAt: null, case: where }, include: { case: globalCaseSummary }, orderBy: { receivedAt: 'desc' }, take: GLOBAL_WORK_ITEMS_LIMIT + 1 }), this.globalMeta(actor, includeClosed)]); return { rows: items.slice(0, GLOBAL_WORK_ITEMS_LIMIT).map(({ case: record, ...item }) => ({ case: record, item })), ...meta, truncated: items.length > GLOBAL_WORK_ITEMS_LIMIT }; }
  async listDocuments(actor: string, caseId: string) { await this.institutions.requireCaseAccess(actor, caseId); return this.db.caseDocument.findMany({ where: { caseId, voidedAt: null }, select: { id: true, kind: true, originalFilename: true, contentType: true, sizeBytes: true, sha256: true, externalUrl: true, version: true, createdAt: true, uploadedByUserId: true }, orderBy: { createdAt: 'asc' } }); }
  async uploadDocument(actor: string, caseId: string, input: { kind: DocumentKind; originalFilename: string; externalUrl?: string }, context: AuditRequestContext) {
    if (input.kind !== DocumentKind.EVIDENCIA) throw new BadRequestException('Los documentos se cargan mediante la URL segura de carga');
    return this.linkVideoEvidence(actor, caseId, input.originalFilename, input.externalUrl!, context);
  }
  async beginDocumentUpload(actor: string, caseId: string, input: { originalFilename: string; contentType: string; sizeBytes: number }) {
    this.storage.validateDeclaredUpload(input.contentType, input.sizeBytes);
    await this.cleanupExpiredUploads();
    const record = await this.requireOpenCase(actor, caseId, this.db);
    const intent = await this.db.documentUploadIntent.create({ data: { caseId, createdByUserId: actor, originalFilename: input.originalFilename.trim(), contentType: input.contentType, declaredSizeBytes: input.sizeBytes, storageKey: this.storage.newSupabaseKey(record.establishmentId, caseId), expiresAt: new Date(Date.now() + 15 * 60_000) } });
    try { return { uploadId: intent.id, signedUrl: await this.storage.createSignedUploadUrl(intent.storageKey), expiresAt: intent.expiresAt }; }
    catch (error) { await this.db.documentUploadIntent.delete({ where: { id: intent.id } }); throw error; }
  }
  async completeDocumentUpload(actor: string, caseId: string, uploadId: string, context: AuditRequestContext) {
    const intent = await this.db.documentUploadIntent.findFirst({ where: { id: uploadId, caseId, createdByUserId: actor, expiresAt: { gt: new Date() } } });
    if (!intent) throw new NotFoundException('La carga no está disponible o venció');
    const content = await this.storage.read(DocumentStorageProvider.SUPABASE, intent.storageKey);
    const saved = this.storage.validate(content, intent.contentType, intent.declaredSizeBytes);
    let claimed = false;
    try {
      return await this.db.$transaction(async tx => {
        const deleted = await tx.documentUploadIntent.deleteMany({ where: { id: intent.id, caseId, createdByUserId: actor, expiresAt: { gt: new Date() } } });
        if (deleted.count !== 1) throw new NotFoundException('La carga ya fue confirmada o venció');
        claimed = true;
        const record = await this.requireOpenCase(actor, caseId, tx);
        const document = await tx.caseDocument.create({ data: { caseId: record.id, uploadedByUserId: actor, kind: DocumentKind.DOCUMENTO, originalFilename: intent.originalFilename, contentType: intent.contentType, storageKey: intent.storageKey, storageProvider: DocumentStorageProvider.SUPABASE, ...saved } });
        await this.event(tx, caseId, actor, CaseEventType.DOCUMENT_UPLOADED, 'CASE_DOCUMENT', document.id);
        await this.auditEvent(tx, actor, 'DOCUMENT_UPLOADED', 'CASE_DOCUMENT', document.id, { caseId, kind: DocumentKind.DOCUMENTO, sizeBytes: saved.sizeBytes, sha256: saved.sha256 }, context);
        return document;
      });
    } catch (error) {
      if (claimed) {
        await this.db.documentUploadIntent.deleteMany({ where: { id: intent.id } });
        await this.storage.remove(DocumentStorageProvider.SUPABASE, intent.storageKey);
      }
      throw error;
    }
  }
  async cancelDocumentUpload(actor: string, caseId: string, uploadId: string) {
    const intent = await this.db.documentUploadIntent.findFirst({ where: { id: uploadId, caseId, createdByUserId: actor } });
    if (!intent) return { success: true };
    await this.db.documentUploadIntent.delete({ where: { id: intent.id } });
    await this.storage.remove(DocumentStorageProvider.SUPABASE, intent.storageKey);
    return { success: true };
  }
  async downloadDocument(actor: string, caseId: string, id: string) { await this.institutions.requireCaseAccess(actor, caseId); const document = await this.db.caseDocument.findFirst({ where: { id, caseId, voidedAt: null } }); if (!document) throw new NotFoundException('Documento no disponible'); if (document.externalUrl) throw new ConflictException('La evidencia audiovisual se abre desde OneDrive o SharePoint'); return { document, content: await this.storage.read(document.storageProvider, document.storageKey) }; }
  async voidDocument(actor: string, caseId: string, id: string, data: { expectedVersion: number; reason: string }, context: AuditRequestContext) { return this.db.$transaction(async tx => { await this.requireOpenCase(actor, caseId, tx); const current = await tx.caseDocument.findFirst({ where: { id, caseId, version: data.expectedVersion, voidedAt: null }, include: { finalInterview: { select: { id: true } } } }); if (!current) throw new ConflictException('El documento fue modificado o ya fue anulado'); if (current.finalInterview) throw new ConflictException('El acta firmada de una entrevista no se puede anular'); const document = await tx.caseDocument.update({ where: { id }, data: { voidedAt: new Date(), voidReason: data.reason.trim(), version: { increment: 1 } } }); await this.event(tx, caseId, actor, CaseEventType.DOCUMENT_VOIDED, 'CASE_DOCUMENT', id); await this.auditEvent(tx, actor, 'DOCUMENT_VOIDED', 'CASE_DOCUMENT', id, { caseId }, context); return document; }); }
  async removeDocument(actor: string, caseId: string, id: string, expectedVersion: number, context: AuditRequestContext) {
    const document = await this.db.$transaction(async tx => {
      await this.requireOpenCase(actor, caseId, tx);
      const current = await tx.caseDocument.findFirst({ where: { id, caseId, version: expectedVersion, voidedAt: null }, include: { finalInterview: { select: { id: true } } } });
      if (!current) throw new ConflictException('El documento fue modificado o ya no está disponible para eliminar');
      if (current.finalInterview) throw new ConflictException('El acta firmada de una entrevista no se puede eliminar');
      await tx.caseEvent.deleteMany({ where: { caseId, relatedEntityType: 'CASE_DOCUMENT', relatedEntityId: id } });
      await tx.caseDocument.delete({ where: { id } });
      await this.auditEvent(tx, actor, 'DOCUMENT_DELETED', 'CASE_DOCUMENT', id, { caseId }, context);
      return current;
    });
    if (!document.externalUrl) await this.storage.remove(document.storageProvider, document.storageKey);
    return { id };
  }
  async createProtocol(actor: string, establishmentId: string, input: { code: string; name: string; categoryCodes: string[]; title: string; content: Prisma.InputJsonValue }, context: AuditRequestContext) { return this.db.$transaction(async tx => { await this.institutions.requireActiveMembership(actor, establishmentId, tx); const template = await tx.protocolTemplate.create({ data: { establishmentId, code: input.code.trim().toUpperCase(), name: input.name.trim(), categoryCodes: input.categoryCodes, versions: { create: { version: 1, title: input.title.trim(), content: input.content, createdByUserId: actor } } }, include: { versions: true } }); await this.auditEvent(tx, actor, 'PROTOCOL_CREATED', 'PROTOCOL_TEMPLATE', template.id, { establishmentId, categoryCodes: input.categoryCodes }, context); return template; }); }
  async importRice2026(actor: string, establishmentId: string, context: AuditRequestContext) { return this.db.$transaction(async tx => {
    await this.institutions.requireActiveMembership(actor, establishmentId, tx);
    const catalog = RICE_2026_PROTOCOLS.map((name, index) => ({ index, name, code: `RICE-2026-ANEXO-${String(index + 1).padStart(2, '0')}` }));
    const previous = await tx.protocolTemplate.findMany({ where: { establishmentId, code: { in: catalog.map((item) => item.code) } }, select: { code: true } });
    const known = new Set(previous.map((item) => item.code));
    const pending = catalog.filter((item) => !known.has(item.code));
    const now = new Date();
    const templates = pending.map((item) => ({ id: randomUUID(), establishmentId, code: item.code, name: item.name, categoryCodes: [] as string[] }));
    if (templates.length) {
      await tx.protocolTemplate.createMany({ data: templates, skipDuplicates: true });
      const createdIds = new Map(templates.map((item) => [item.code, item.id]));
      await tx.protocolVersion.createMany({ data: pending.map((item) => ({ protocolTemplateId: createdIds.get(item.code)!, version: 1, title: 'Reglamento Interno de Convivencia Educativa 2026', content: { fuente: 'Reglamento Interno de Convivencia Educativa 2026', anexo: item.index + 1, referencia: `Anexo ${item.index + 1}`, descripcion: `Catálogo institucional: Anexo ${item.index + 1} del Reglamento Interno de Convivencia Educativa 2026. Consulte el documento institucional vigente para el procedimiento íntegro.`, etapas: ['Aplicar el procedimiento y los plazos establecidos en el anexo institucional vigente.'] }, status: ProtocolVersionStatus.PUBLICADO, publishedAt: now, createdByUserId: actor })) });
    }
    await this.auditEvent(tx, actor, 'RICE_2026_PROTOCOLS_IMPORTED', 'ESTABLISHMENT', establishmentId, { created: pending.length, existing: previous.length }, context);
    return { created: pending.length, existing: previous.length, total: RICE_2026_PROTOCOLS.length };
  }); }
  async publishProtocol(actor: string, establishmentId: string, versionId: string, context: AuditRequestContext) { return this.db.$transaction(async tx => { await this.institutions.requireActiveMembership(actor, establishmentId, tx); const version = await tx.protocolVersion.findFirst({ where: { id: versionId, protocolTemplate: { establishmentId } } }); if (!version) throw new NotFoundException('Versión de protocolo no disponible'); const published = await tx.protocolVersion.update({ where: { id: versionId }, data: { status: ProtocolVersionStatus.PUBLICADO, publishedAt: new Date() } }); await this.auditEvent(tx, actor, 'PROTOCOL_PUBLISHED', 'PROTOCOL_VERSION', versionId, { establishmentId }, context); return published; }); }
  async listProtocols(actor: string, establishmentId: string) { await this.institutions.requireActiveMembership(actor, establishmentId); return this.db.protocolTemplate.findMany({ where: { establishmentId, isActive: true }, include: { versions: { where: { status: ProtocolVersionStatus.PUBLICADO }, orderBy: { version: 'desc' } } }, orderBy: { name: 'asc' } }); }
  async applyProtocol(actor: string, caseId: string, versionId: string, context: AuditRequestContext) { return this.db.$transaction(async tx => { const caseRecord = await this.institutions.requireCaseAccess(actor, caseId, true, tx); const version = await tx.protocolVersion.findFirst({ where: { id: versionId, status: ProtocolVersionStatus.PUBLICADO, protocolTemplate: { establishmentId: caseRecord.establishmentId, isActive: true } }, include: { protocolTemplate: true } }); if (!version || (version.protocolTemplate.categoryCodes.length && !version.protocolTemplate.categoryCodes.includes(caseRecord.categoryCode))) throw new NotFoundException('Protocolo no disponible para la categoría del caso'); try { const application = await tx.caseProtocolApplication.create({ data: { caseId, protocolVersionId: versionId, appliedByUserId: actor, appliedAt: new Date() } }); await this.event(tx, caseId, actor, CaseEventType.PROTOCOL_APPLIED, 'PROTOCOL_VERSION', versionId); await this.auditEvent(tx, actor, 'PROTOCOL_APPLIED', 'CASE_PROTOCOL_APPLICATION', application.id, { caseId }, context); return application; } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('El protocolo ya está aplicado'); throw error; } }); }
  async listProtocolApplications(actor: string, caseId: string) { await this.institutions.requireCaseAccess(actor, caseId); return this.db.caseProtocolApplication.findMany({ where: { caseId }, orderBy: { appliedAt: 'desc' } }); }
  async revokeProtocolApplication(actor: string, caseId: string, id: string, input: { expectedVersion: number; reason: string }, context: AuditRequestContext) { return this.db.$transaction(async tx => { await this.institutions.requireCaseAccess(actor, caseId, true, tx); const current = await tx.caseProtocolApplication.findFirst({ where: { id, caseId } }); if (!current) throw new NotFoundException('Aplicación de protocolo no disponible'); if (current.revokedAt) throw new ConflictException('La aplicación del protocolo ya fue revocada'); const result = await tx.caseProtocolApplication.updateMany({ where: { id, caseId, version: input.expectedVersion, revokedAt: null }, data: { revokedAt: new Date(), revocationReason: input.reason.trim(), version: { increment: 1 } } }); if (result.count !== 1) throw new ConflictException('La aplicación del protocolo fue modificada por otra persona'); const application = await tx.caseProtocolApplication.findUniqueOrThrow({ where: { id } }); await this.event(tx, caseId, actor, CaseEventType.PROTOCOL_REVOKED, 'CASE_PROTOCOL_APPLICATION', id); await this.auditEvent(tx, actor, 'PROTOCOL_REVOKED', 'CASE_PROTOCOL_APPLICATION', id, { caseId }, context); return application; }); }
  async removeProtocolApplication(actor: string, caseId: string, id: string, expectedVersion: number, context: AuditRequestContext) { return this.db.$transaction(async tx => {
    await this.requireOpenCase(actor, caseId, tx);
    const current = await tx.caseProtocolApplication.findFirst({ where: { id, caseId, version: expectedVersion, revokedAt: null } });
    if (!current) throw new ConflictException('La aplicación fue modificada, revocada o ya no está disponible para eliminar');
    await tx.caseEvent.deleteMany({ where: { caseId, OR: [{ relatedEntityType: 'CASE_PROTOCOL_APPLICATION', relatedEntityId: id }, { eventType: CaseEventType.PROTOCOL_APPLIED, relatedEntityId: current.protocolVersionId }] } });
    await tx.caseProtocolApplication.delete({ where: { id } });
    await this.auditEvent(tx, actor, 'PROTOCOL_APPLICATION_DELETED', 'CASE_PROTOCOL_APPLICATION', id, { caseId }, context);
    return { id };
  }); }
  async listMeasures(actor: string, caseId: string) { await this.institutions.requireCaseAccess(actor, caseId); return this.db.caseMeasure.findMany({ where: { caseId }, include: { responsibles: true }, orderBy: [{ dueAt: 'asc' }, { createdAt: 'asc' }] }); }
  async createMeasure(actor: string, caseId: string, input: { title: string; description?: string; dueAt?: Date; responsibleUserIds: string[] }, context: AuditRequestContext) { return this.db.$transaction(async tx => { const c = await this.institutions.requireCaseAccess(actor, caseId, true, tx); for (const userId of input.responsibleUserIds) await this.institutions.requireActiveMembership(userId, c.establishmentId, tx); const measure = await tx.caseMeasure.create({ data: { caseId, createdByUserId: actor, title: input.title.trim(), description: input.description?.trim(), dueAt: input.dueAt, responsibles: { create: input.responsibleUserIds.map(userId => ({ userId })) }, }, include: { responsibles: true } }); await this.event(tx, caseId, actor, CaseEventType.MEASURE_CREATED, 'CASE_MEASURE', measure.id); await this.auditEvent(tx, actor, 'MEASURE_CREATED', 'CASE_MEASURE', measure.id, { caseId }, context); return measure; }); }
  async updateMeasure(actor: string, caseId: string, id: string, input: { expectedVersion: number; title?: string; description?: string | null; status?: MeasureStatus; dueAt?: Date | null; responsibleUserIds?: string[] }, context: AuditRequestContext) { return this.db.$transaction(async tx => { const record = await this.institutions.requireCaseAccess(actor, caseId, true, tx); if (input.responsibleUserIds) for (const userId of input.responsibleUserIds) await this.institutions.requireActiveMembership(userId, record.establishmentId, tx); const completedAt = input.status === MeasureStatus.COMPLETADA ? new Date() : input.status ? null : undefined; const result = await tx.caseMeasure.updateMany({ where: { id, caseId, version: input.expectedVersion }, data: { ...(input.title === undefined ? {} : { title: input.title.trim() }), ...(input.description === undefined ? {} : { description: input.description?.trim() || null }), ...(input.status === undefined ? {} : { status: input.status, completedAt }), ...(input.dueAt === undefined ? {} : { dueAt: input.dueAt }), version: { increment: 1 } } }); if (result.count !== 1) throw new ConflictException('La medida fue modificada por otra persona'); if (input.responsibleUserIds) { await tx.caseMeasureResponsible.deleteMany({ where: { measureId: id } }); if (input.responsibleUserIds.length) await tx.caseMeasureResponsible.createMany({ data: input.responsibleUserIds.map(userId => ({ measureId: id, userId })), skipDuplicates: true }); } const measure = await tx.caseMeasure.findUniqueOrThrow({ where: { id }, include: { responsibles: true } }); await this.event(tx, caseId, actor, CaseEventType.MEASURE_UPDATED, 'CASE_MEASURE', id); await this.auditEvent(tx, actor, 'MEASURE_UPDATED', 'CASE_MEASURE', id, { caseId }, context); return measure; }); }
  async createFollowUp(actor: string, caseId: string, input: { occurredAt: Date; note: string; nextAction?: string; nextActionDueAt?: Date }, context: AuditRequestContext) { return this.db.$transaction(async tx => { await this.institutions.requireCaseAccess(actor, caseId, true, tx); const item = await tx.caseFollowUp.create({ data: { caseId, createdByUserId: actor, ...input } }); await this.event(tx, caseId, actor, CaseEventType.FOLLOW_UP_CREATED, 'CASE_FOLLOW_UP', item.id); await this.auditEvent(tx, actor, 'FOLLOW_UP_CREATED', 'CASE_FOLLOW_UP', item.id, { caseId }, context); return item; }); }
  async listFollowUps(actor: string, caseId: string) { await this.institutions.requireCaseAccess(actor, caseId); return this.db.caseFollowUp.findMany({ where: { caseId, voidedAt: null }, orderBy: { occurredAt: 'asc' } }); }
  async voidFollowUp(actor: string, caseId: string, id: string, data: { expectedVersion: number; reason: string }, context: AuditRequestContext) { return this.db.$transaction(async tx => { await this.requireOpenCase(actor, caseId, tx); const changed = await tx.caseFollowUp.updateMany({ where: { id, caseId, version: data.expectedVersion, voidedAt: null }, data: { voidedAt: new Date(), voidReason: data.reason.trim(), version: { increment: 1 } } }); if (!changed.count) throw new ConflictException('El seguimiento fue modificado o ya fue anulado'); const followUp = await tx.caseFollowUp.findUniqueOrThrow({ where: { id } }); await this.event(tx, caseId, actor, CaseEventType.FOLLOW_UP_VOIDED, 'CASE_FOLLOW_UP', id); await this.auditEvent(tx, actor, 'FOLLOW_UP_VOIDED', 'CASE_FOLLOW_UP', id, { caseId }, context); return followUp; }); }
  async removeFollowUp(actor: string, caseId: string, id: string, expectedVersion: number, context: AuditRequestContext) { return this.db.$transaction(async tx => {
    await this.requireOpenCase(actor, caseId, tx);
    const current = await tx.caseFollowUp.findFirst({ where: { id, caseId, version: expectedVersion, voidedAt: null } });
    if (!current) throw new ConflictException('El seguimiento fue modificado o ya no está disponible para eliminar');
    await tx.caseEvent.deleteMany({ where: { caseId, relatedEntityType: 'CASE_FOLLOW_UP', relatedEntityId: id } });
    await tx.caseFollowUp.delete({ where: { id } });
    await this.auditEvent(tx, actor, 'FOLLOW_UP_DELETED', 'CASE_FOLLOW_UP', id, { caseId }, context);
    return { id };
  }); }
  async createTask(actor: string, caseId: string, input: { title: string; dueAt?: Date; assignedToUserId?: string }, context: AuditRequestContext) { return this.db.$transaction(async tx => { const c = await this.institutions.requireCaseAccess(actor, caseId, true, tx); if (input.assignedToUserId) await this.institutions.requireActiveMembership(input.assignedToUserId, c.establishmentId, tx); const task = await tx.caseTask.create({ data: { caseId, createdByUserId: actor, ...input, title: input.title.trim() } }); await this.event(tx, caseId, actor, CaseEventType.TASK_CREATED, 'CASE_TASK', task.id); await this.auditEvent(tx, actor, 'TASK_CREATED', 'CASE_TASK', task.id, { caseId }, context); if (task.assignedToUserId) await this.notify(tx, task.assignedToUserId, caseId, 'TASK_ASSIGNED', 'Nueva tarea asignada', 'Tiene una tarea asociada a un expediente.'); return task; }); }
  async updateTask(actor: string, caseId: string, id: string, input: { expectedVersion: number; title?: string; dueAt?: Date | null; assignedToUserId?: string | null; status?: TaskStatus }, context: AuditRequestContext) { return this.db.$transaction(async tx => { const c = await this.requireOpenCase(actor, caseId, tx); if (input.assignedToUserId) await this.institutions.requireActiveMembership(input.assignedToUserId, c.establishmentId, tx); const { expectedVersion, status, title, ...changes } = input; if (status && status !== TaskStatus.CANCELADA) throw new BadRequestException('Use la acción correspondiente para completar una tarea'); const data: Prisma.CaseTaskUpdateManyMutationInput = { ...changes, ...(title ? { title: title.trim() } : {}), ...(status ? { status, completedAt: null } : {}), version: { increment: 1 } }; const changed = await tx.caseTask.updateMany({ where: { id, caseId, status: TaskStatus.PENDIENTE, version: expectedVersion }, data }); if (changed.count !== 1) throw new ConflictException('La tarea fue modificada, completada o cancelada por otra persona'); const task = await tx.caseTask.findUniqueOrThrow({ where: { id } }); const eventType = status === TaskStatus.CANCELADA ? CaseEventType.TASK_CANCELLED : CaseEventType.TASK_UPDATED; await this.event(tx, caseId, actor, eventType, 'CASE_TASK', id); await this.auditEvent(tx, actor, eventType, 'CASE_TASK', id, { caseId }, context); if (input.assignedToUserId && input.assignedToUserId !== task.createdByUserId) await this.notify(tx, input.assignedToUserId, caseId, 'TASK_ASSIGNED', 'Tarea reasignada', 'Tiene una tarea asociada a un expediente.'); return task; }); }
  async removeTask(actor: string, caseId: string, id: string, expectedVersion: number, context: AuditRequestContext) { return this.db.$transaction(async tx => {
    await this.requireOpenCase(actor, caseId, tx);
    const current = await tx.caseTask.findFirst({ where: { id, caseId, version: expectedVersion, status: TaskStatus.PENDIENTE } });
    if (!current) throw new ConflictException('Solo una tarea pendiente y sin cambios puede eliminarse definitivamente');
    await tx.caseEvent.deleteMany({ where: { caseId, relatedEntityType: 'CASE_TASK', relatedEntityId: id } });
    await tx.caseTask.delete({ where: { id } });
    await this.auditEvent(tx, actor, 'TASK_DELETED', 'CASE_TASK', id, { caseId }, context);
    return { id };
  }); }
  async completeTask(actor: string, caseId: string, id: string, context: AuditRequestContext) { return this.db.$transaction(async tx => { await this.institutions.requireCaseAccess(actor, caseId, true, tx); const task = await tx.caseTask.findFirst({ where: { id, caseId, status: TaskStatus.PENDIENTE } }); if (!task) throw new NotFoundException('Tarea pendiente no disponible'); const updated = await tx.caseTask.update({ where: { id }, data: { status: TaskStatus.COMPLETADA, completedAt: new Date(), version: { increment: 1 } } }); await this.event(tx, caseId, actor, CaseEventType.TASK_COMPLETED, 'CASE_TASK', id); await this.auditEvent(tx, actor, 'TASK_COMPLETED', 'CASE_TASK', id, { caseId }, context); return updated; }); }
  async listTasks(actor: string, caseId: string) { await this.institutions.requireCaseAccess(actor, caseId); return this.db.caseTask.findMany({ where: { caseId }, orderBy: [{ dueAt: 'asc' }, { createdAt: 'asc' }] }); }
  async listNotifications(actor: string) { return this.db.notification.findMany({ where: { userId: actor }, orderBy: { createdAt: 'desc' }, take: 100 }); }
  async markRead(actor: string, id: string) { const changed = await this.db.notification.updateMany({ where: { id, userId: actor, readAt: null }, data: { readAt: new Date() } }); if (!changed.count) throw new NotFoundException('Notificación no disponible'); return this.db.notification.findUniqueOrThrow({ where: { id } }); }
  private async linkVideoEvidence(actor: string, caseId: string, title: string, externalUrl: string, context: AuditRequestContext) {
    const url = this.oneDriveUrl(externalUrl);
    return this.db.$transaction(async tx => {
      const record = await this.requireOpenCase(actor, caseId, tx);
      const document = await tx.caseDocument.create({ data: { caseId: record.id, uploadedByUserId: actor, kind: DocumentKind.EVIDENCIA, originalFilename: title.trim(), storageKey: randomUUID(), contentType: 'application/vnd.microsoft.stream-link+json', sizeBytes: 0, sha256: createHash('sha256').update(url.toString()).digest('hex'), externalUrl: url.toString() } });
      await this.event(tx, caseId, actor, CaseEventType.DOCUMENT_UPLOADED, 'CASE_DOCUMENT', document.id);
      await this.auditEvent(tx, actor, 'DOCUMENT_UPLOADED', 'CASE_DOCUMENT', document.id, { caseId, kind: DocumentKind.EVIDENCIA, evidenceType: 'VIDEO_LINK', host: url.hostname }, context);
      return document;
    });
  }
  private oneDriveUrl(value: string) {
    let url: URL;
    try { url = new URL(value.trim()); } catch { throw new BadRequestException('Pegue un enlace válido de OneDrive o SharePoint'); }
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || !(host === '1drv.ms' || host.endsWith('.sharepoint.com'))) throw new BadRequestException('Use un enlace institucional de OneDrive o SharePoint');
    return url;
  }
  private async cleanupExpiredUploads() {
    const expired = await this.db.documentUploadIntent.findMany({ where: { expiresAt: { lte: new Date() } }, take: 100 });
    if (!expired.length) return;
    await this.db.documentUploadIntent.deleteMany({ where: { id: { in: expired.map(item => item.id) } } });
    await Promise.all(expired.map(async item => { try { await this.storage.remove(DocumentStorageProvider.SUPABASE, item.storageKey); } catch { /* La limpieza se reintentará en la siguiente carga. */ } }));
  }
  private async requireOpenCase(actor: string, caseId: string, tx: Prisma.TransactionClient | DatabaseService) { const record = await this.institutions.requireCaseAccess(actor, caseId, true, tx); if (record.status === CaseStatus.CERRADO) throw new ConflictException('El expediente está cerrado y debe reabrirse antes de registrar acciones'); return record; }
  private event(tx: Prisma.TransactionClient, caseId: string, actor: string, type: CaseEventType, entityType: string, entityId: string) { return tx.caseEvent.create({ data: { caseId, actorUserId: actor, eventType: type, correlationId: randomUUID(), relatedEntityType: entityType, relatedEntityId: entityId } }); }
  private auditEvent(tx: Prisma.TransactionClient, actor: string, action: string, targetType: string, targetId: string, metadata: Record<string, unknown>, context: AuditRequestContext) { return tx.securityAudit.create({ data: this.audit.data({ actorUserId: actor, action, targetType, targetId, metadata, context }) }); }
  private async notify(tx: Prisma.TransactionClient, userId: string, caseId: string, type: string, title: string, body: string) { const notification = await tx.notification.create({ data: { userId, caseId, type, title, body } }); await this.event(tx, caseId, userId, CaseEventType.NOTIFICATION_CREATED, 'NOTIFICATION', notification.id); }
}
