import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import * as cookieParser from 'cookie-parser';
import { randomBytes } from 'node:crypto';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request: typeof import('supertest') = require('supertest');
import { AppModule } from '../../app.module';
import { DatabaseService } from '../../database/database.service';

describe('Operación de expedientes HTTP con PostgreSQL', () => {
  let app: INestApplication; let db: DatabaseService; let caseId: string; let establishmentId: string; let userId: string; let agent: ReturnType<typeof request.agent>; let csrf: string;
  const server = () => app.getHttpServer();
  beforeAll(async () => {
    if (!process.env.DATABASE_URL || new URL(process.env.DATABASE_URL).pathname !== '/convivencia_test') throw new Error('Las pruebas requieren exclusivamente convivencia_test.');
    app = (await Test.createTestingModule({ imports: [AppModule] }).compile()).createNestApplication(); app.setGlobalPrefix('api'); app.use(cookieParser()); app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true })); await app.init(); db = app.get(DatabaseService);
    const suffix = randomBytes(6).toString('hex'); const establishment = await db.establishment.create({ data: { code: `OPS-${suffix}`, name: 'Pruebas operación' } }); establishmentId = establishment.id;
    const role = await db.role.findUniqueOrThrow({ where: { name: 'CONVIVENCIA' } }); const password = randomBytes(20).toString('base64url'); const user = await db.user.create({ data: { email: `ops-${suffix}@test.local`, displayName: 'Operador de prueba', passwordHash: await argon2.hash(password), roles: { create: { roleId: role.id } }, establishmentMemberships: { create: { establishmentId } } } }); userId = user.id;
    const stage = await db.caseStage.create({ data: { establishmentId, code: 'INICIO', name: 'Inicio', displayOrder: 1 } }); caseId = (await db.case.create({ data: { establishmentId, folio: 1, title: 'Expediente de prueba', initialDescription: '', receivedAt: new Date(), categoryCode: 'TEST', priority: 'MEDIA', createdByUserId: userId, currentStageId: stage.id } })).id;
    agent = request.agent(server()); await agent.post('/api/auth/login').send({ email: user.email, password }).expect(201); csrf = (await agent.get('/api/auth/csrf').expect(200)).body.token as string;
  });
  afterAll(async () => { if (db) { await db.notification.deleteMany({ where: { caseId } }); await db.caseTask.deleteMany({ where: { caseId } }); await db.caseFollowUp.deleteMany({ where: { caseId } }); await db.caseMeasureResponsible.deleteMany({ where: { measure: { caseId } } }); await db.caseMeasure.deleteMany({ where: { caseId } }); await db.caseProtocolApplication.deleteMany({ where: { caseId } }); await db.caseSummons.deleteMany({ where: { caseId } }); await db.caseReferral.deleteMany({ where: { caseId } }); await db.caseDocument.deleteMany({ where: { caseId } }); await db.interviewCorrection.deleteMany({ where: { interview: { caseId } } }); await db.interview.deleteMany({ where: { caseId } }); await db.caseReport.deleteMany({ where: { caseId } }); await db.caseParticipant.deleteMany({ where: { caseId } }); await db.participant.deleteMany({ where: { establishmentId } }); await db.caseEvent.deleteMany({ where: { caseId } }); await db.case.deleteMany({ where: { id: caseId } }); await db.caseStage.deleteMany({ where: { establishmentId } }); await db.protocolVersion.deleteMany({ where: { protocolTemplate: { establishmentId } } }); await db.protocolTemplate.deleteMany({ where: { establishmentId } }); await db.user.delete({ where: { id: userId } }); await db.establishment.delete({ where: { id: establishmentId } }); } await app?.close(); });
  it('persiste denuncias, participantes, entrevistas y operación trazable', async () => {
    const report = await agent.post(`/api/cases/${caseId}/reports`).set('X-CSRF-Token', csrf).send({ receivedAt: '2026-10-23T12:00:00.000Z', channelCode: 'DIRECTO', classificationCode: 'CONV', factualDescription: 'Relato mínimo verificable.' }).expect(201);
    await agent.post(`/api/cases/${caseId}/reports/${report.body.id}/void`).set('X-CSRF-Token', csrf).send({ expectedVersion: 1, reason: 'Registro duplicado de prueba.' }).expect(201);
    expect((await agent.get(`/api/cases/${caseId}/reports`).expect(200)).body).toEqual([]);
    const participant = await agent.post('/api/participants').set('X-CSRF-Token', csrf).send({ establishmentId, kind: 'ESTUDIANTE', referenceLabel: 'Estudiante A' }).expect(201);
    const link = await agent.post(`/api/cases/${caseId}/participants`).set('X-CSRF-Token', csrf).send({ participantId: participant.body.id, participationCode: 'INVOLUCRADO' }).expect(201);
    await agent.patch(`/api/cases/${caseId}/participants/${link.body.id}`).set('X-CSRF-Token', csrf).send({ expectedVersion: 1, participationCode: 'AFECTADO' }).expect(200);
    const draft = await agent.post(`/api/cases/${caseId}/interviews`).set('X-CSRF-Token', csrf).send({ occurredAt: '2026-10-23T11:00:00.000Z', modalityCode: 'PRESENCIAL', summary: 'Borrador eliminable.' }).expect(201);
    await agent.delete(`/api/cases/${caseId}/interviews/${draft.body.id}`).set('X-CSRF-Token', csrf).send({ expectedVersion: 1 }).expect(200);
    expect((await agent.get(`/api/cases/${caseId}/interviews`).expect(200)).body.map((item: { id: string }) => item.id)).not.toContain(draft.body.id);
    expect((await agent.get(`/api/cases/${caseId}/timeline?mode=all`).expect(200)).body.items.map((item: { relatedEntityId: string | null }) => item.relatedEntityId)).not.toContain(draft.body.id);
    const interview = await agent.post(`/api/cases/${caseId}/interviews`).set('X-CSRF-Token', csrf).send({ occurredAt: '2026-10-23T12:00:00.000Z', modalityCode: 'PRESENCIAL', summary: 'Entrevista de prueba.' }).expect(201); await agent.post(`/api/cases/${caseId}/interviews/${interview.body.id}/finalize`).set('X-CSRF-Token', csrf).send({ expectedVersion: 1 }).expect(201);
    await agent.post(`/api/cases/${caseId}/interviews/${interview.body.id}/void`).set('X-CSRF-Token', csrf).send({ expectedVersion: 2, reason: 'Entrevista de prueba anulada.' }).expect(201);
    expect((await agent.get(`/api/cases/${caseId}/interviews`).expect(200)).body).toEqual([]);
    const document = await agent.post(`/api/cases/${caseId}/documents`).set('X-CSRF-Token', csrf).send({ kind: 'DOCUMENTO', originalFilename: 'evidencia.pdf', contentType: 'application/pdf', base64Content: Buffer.from('%PDF-test').toString('base64') }).expect(201); expect(document.body.sha256).toMatch(/^[a-f0-9]{64}$/);
    const video = await agent.post(`/api/cases/${caseId}/documents`).set('X-CSRF-Token', csrf).send({ kind: 'EVIDENCIA', originalFilename: 'Extracto cámara patio', externalUrl: 'https://colegio.sharepoint.com/:v:/s/Convivencia/Ejemplo' }).expect(201); expect(video.body).toMatchObject({ originalFilename: 'Extracto cámara patio', sizeBytes: 0, externalUrl: 'https://colegio.sharepoint.com/:v:/s/Convivencia/Ejemplo' });
    await agent.get(`/api/cases/${caseId}/documents/${video.body.id}/download`).expect(409);
    await agent.post(`/api/cases/${caseId}/documents/${document.body.id}/void`).set('X-CSRF-Token', csrf).send({ expectedVersion: 1, reason: 'Archivo de prueba anulado.' }).expect(201);
    expect((await agent.get(`/api/cases/${caseId}/documents`).expect(200)).body.map((item: { id: string }) => item.id)).not.toContain(document.body.id);
    const protocol = await db.protocolTemplate.create({ data: { establishmentId, code: 'PROTO-PRUEBA', name: 'Protocolo de prueba', versions: { create: { version: 1, title: 'Versión de prueba', content: {}, status: 'PUBLICADO', publishedAt: new Date(), createdByUserId: userId } } }, include: { versions: true } });
    const application = await agent.post(`/api/cases/${caseId}/protocols/${protocol.versions[0].id}`).set('X-CSRF-Token', csrf).send({}).expect(201);
    const revoked = await agent.post(`/api/cases/${caseId}/protocol-applications/${application.body.id}/revoke`).set('X-CSRF-Token', csrf).send({ expectedVersion: 1, reason: 'Aplicación registrada por error.' }).expect(201);
    expect(revoked.body).toMatchObject({ revocationReason: 'Aplicación registrada por error.' });
    const measure = await agent.post(`/api/cases/${caseId}/measures`).set('X-CSRF-Token', csrf).send({ title: 'Medida de prueba', responsibleUserIds: [userId] }).expect(201);
    const updatedMeasure = await agent.post(`/api/cases/${caseId}/measures/${measure.body.id}/update`).set('X-CSRF-Token', csrf).send({ expectedVersion: 1, title: 'Medida de prueba actualizada', description: 'Descripción actualizada.', dueAt: '2026-10-25T00:00:00.000Z', responsibleUserIds: [] }).expect(201);
    expect(updatedMeasure.body).toMatchObject({ title: 'Medida de prueba actualizada', description: 'Descripción actualizada.', responsibles: [] });
    await agent.post(`/api/cases/${caseId}/measures/${measure.body.id}/update`).set('X-CSRF-Token', csrf).send({ expectedVersion: 2, status: 'COMPLETADA' }).expect(201);
    const referral = await agent.post(`/api/cases/${caseId}/referrals`).set('X-CSRF-Token', csrf).send({ typeCode: 'SALUD', institutionName: 'Centro inicial', reason: 'Motivo inicial.' }).expect(201);
    const updatedReferral = await agent.post(`/api/cases/${caseId}/referrals/${referral.body.id}/update`).set('X-CSRF-Token', csrf).send({ expectedVersion: 1, typeCode: 'OPD', institutionName: 'Oficina de protección', reason: 'Motivo actualizado.', contactName: 'Contacto de prueba' }).expect(201);
    expect(updatedReferral.body).toMatchObject({ typeCode: 'OPD', institutionName: 'Oficina de protección', reason: 'Motivo actualizado.', contactName: 'Contacto de prueba' });
    const followUp = await agent.post(`/api/cases/${caseId}/follow-ups`).set('X-CSRF-Token', csrf).send({ occurredAt: '2026-10-23T13:00:00.000Z', note: 'Seguimiento de prueba.' }).expect(201);
    await agent.post(`/api/cases/${caseId}/follow-ups/${followUp.body.id}/void`).set('X-CSRF-Token', csrf).send({ expectedVersion: 1, reason: 'Seguimiento duplicado de prueba.' }).expect(201);
    expect((await agent.get(`/api/cases/${caseId}/follow-ups`).expect(200)).body).toEqual([]);
    const task = await agent.post(`/api/cases/${caseId}/tasks`).set('X-CSRF-Token', csrf).send({ title: 'Tarea de prueba', assignedToUserId: userId }).expect(201);
    await agent.post(`/api/cases/${caseId}/tasks/${task.body.id}/update`).set('X-CSRF-Token', csrf).send({ expectedVersion: 1, title: 'Tarea de prueba actualizada' }).expect(201);
    await agent.post(`/api/cases/${caseId}/tasks/${task.body.id}/complete`).set('X-CSRF-Token', csrf).send({}).expect(201);
    const cancelled = await agent.post(`/api/cases/${caseId}/tasks`).set('X-CSRF-Token', csrf).send({ title: 'Tarea cancelada de prueba' }).expect(201);
    await agent.post(`/api/cases/${caseId}/tasks/${cancelled.body.id}/update`).set('X-CSRF-Token', csrf).send({ expectedVersion: 1, status: 'CANCELADA' }).expect(201);
    const timeline = await agent.get(`/api/cases/${caseId}/timeline`).expect(200); expect(timeline.body.items.map((item: { eventType: string }) => item.eventType)).toEqual(expect.arrayContaining(['PARTICIPANT_UPDATED', 'REPORT_VOIDED', 'INTERVIEW_VOIDED', 'DOCUMENT_VOIDED', 'FOLLOW_UP_VOIDED', 'TASK_UPDATED', 'TASK_COMPLETED', 'TASK_CANCELLED'])); await agent.get('/api/notifications').expect(200);
  });

  it('elimina definitivamente registros reversibles, sin dejarlos en el expediente ni en la línea de tiempo', async () => {
    const send = (method: 'post' | 'delete', path: string, body: object) => agent[method](`/api/cases/${caseId}/${path}`).set('X-CSRF-Token', csrf).send(body);
    const remove = (path: string, expectedVersion = 1) => send('delete', path, { expectedVersion });
    const ids: string[] = [];
    const report = await send('post', 'reports', { receivedAt: '2026-10-23T12:00:00.000Z', channelCode: 'DIRECTO', classificationCode: 'CONV', factualDescription: 'Denuncia eliminable.' }).expect(201); ids.push(report.body.id);
    await remove(`reports/${report.body.id}`, 9).expect(409);
    await remove(`reports/${report.body.id}`).expect(200);
    expect((await agent.get(`/api/cases/${caseId}/reports`).expect(200)).body.map((item: { id: string }) => item.id)).not.toContain(report.body.id);

    const pdf = Buffer.from('%PDF-eliminable').toString('base64');
    const document = await send('post', 'documents', { kind: 'DOCUMENTO', originalFilename: 'eliminable.pdf', contentType: 'application/pdf', base64Content: pdf }).expect(201); ids.push(document.body.id);
    await remove(`documents/${document.body.id}`).expect(200);
    await agent.get(`/api/cases/${caseId}/documents/${document.body.id}/download`).expect(404);

    const followUp = await send('post', 'follow-ups', { occurredAt: '2026-10-23T13:00:00.000Z', note: 'Seguimiento eliminable.' }).expect(201); ids.push(followUp.body.id);
    await remove(`follow-ups/${followUp.body.id}`).expect(200);
    expect((await agent.get(`/api/cases/${caseId}/follow-ups`).expect(200)).body).toEqual([]);

    const protocol = await db.protocolTemplate.create({ data: { establishmentId, code: 'PROTO-ELIMINABLE', name: 'Protocolo eliminable', versions: { create: { version: 1, title: 'Versión de prueba', content: {}, status: 'PUBLICADO', publishedAt: new Date(), createdByUserId: userId } } }, include: { versions: true } });
    const application = await send('post', `protocols/${protocol.versions[0]!.id}`, {}).expect(201); ids.push(application.body.id);
    await remove(`protocol-applications/${application.body.id}`).expect(200);
    expect((await agent.get(`/api/cases/${caseId}/protocol-applications`).expect(200)).body.map((item: { id: string }) => item.id)).not.toContain(application.body.id);
    await db.protocolTemplate.update({ where: { id: protocol.id }, data: { isActive: false } });

    const pending = await send('post', 'tasks', { title: 'Tarea eliminable' }).expect(201); ids.push(pending.body.id);
    await remove(`tasks/${pending.body.id}`).expect(200);
    const done = await send('post', 'tasks', { title: 'Tarea completada' }).expect(201);
    await send('post', `tasks/${done.body.id}/complete`, {}).expect(201);
    await remove(`tasks/${done.body.id}`, 2).expect(409);

    const timeline = await agent.get(`/api/cases/${caseId}/timeline`).query({ mode: 'all', limit: 100 }).expect(200);
    expect(timeline.body.items.filter((item: { relatedEntityId: string | null }) => item.relatedEntityId && ids.includes(item.relatedEntityId))).toEqual([]);
    const audits = await db.securityAudit.findMany({ where: { targetId: { in: ids }, action: { endsWith: '_DELETED' } } });
    expect(audits.map((item) => item.action).sort()).toEqual(['DOCUMENT_DELETED', 'PROTOCOL_APPLICATION_DELETED', 'REPORT_DELETED', 'FOLLOW_UP_DELETED', 'TASK_DELETED'].sort());
    expect(JSON.stringify(audits)).not.toContain('eliminable');

    // Un expediente cerrado debe reabrirse antes de eliminar registros.
    const closed = await db.case.create({ data: { establishmentId, folio: 90, title: 'Expediente cerrado', initialDescription: '', receivedAt: new Date(), categoryCode: 'TEST', priority: 'MEDIA', createdByUserId: userId, status: 'CERRADO', closedAt: new Date() } });
    const old = await db.caseReport.create({ data: { caseId: closed.id, establishmentId, receivedAt: new Date(), channelCode: 'DIRECTO', classificationCode: 'CONV', factualDescription: 'Antecedente.', createdByUserId: userId } });
    await agent.delete(`/api/cases/${closed.id}/reports/${old.id}`).set('X-CSRF-Token', csrf).send({ expectedVersion: 1 }).expect(409);
    await db.caseReport.delete({ where: { id: old.id } }); await db.caseEvent.deleteMany({ where: { caseId: closed.id } }); await db.case.delete({ where: { id: closed.id } });
  });

  it('solo acepta enlaces HTTPS de OneDrive o SharePoint como evidencia audiovisual', async () => {
    const link = (externalUrl: string) => agent.post(`/api/cases/${caseId}/documents`).set('X-CSRF-Token', csrf).send({ kind: 'EVIDENCIA', originalFilename: 'Video de prueba', externalUrl });
    await link('http://colegio.sharepoint.com/:v:/s/Convivencia/Ejemplo').expect(400);
    await link('https://sitio-externo.example.com/video.mp4').expect(400);
    await link('https://colegio.sharepoint.com.sitio-externo.example.com/video').expect(400);
    await link('no es un enlace').expect(400);
    const sharepoint = await link('https://colegio-my.sharepoint.com/:v:/g/personal/convivencia/EjemploDeVideo').expect(201);
    const short = await link('https://1drv.ms/v/s!EjemploDeVideo').expect(201);
    expect(sharepoint.body.externalUrl).toContain('sharepoint.com'); expect(short.body.externalUrl).toContain('1drv.ms');
    await agent.delete(`/api/cases/${caseId}/documents/${sharepoint.body.id}`).set('X-CSRF-Token', csrf).send({ expectedVersion: 1 }).expect(200);
    await agent.delete(`/api/cases/${caseId}/documents/${short.body.id}`).set('X-CSRF-Token', csrf).send({ expectedVersion: 1 }).expect(200);
  });
});
