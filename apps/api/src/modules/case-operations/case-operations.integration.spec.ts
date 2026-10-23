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
  afterAll(async () => { if (db) { await db.notification.deleteMany({ where: { caseId } }); await db.caseTask.deleteMany({ where: { caseId } }); await db.caseFollowUp.deleteMany({ where: { caseId } }); await db.caseMeasureResponsible.deleteMany({ where: { measure: { caseId } } }); await db.caseMeasure.deleteMany({ where: { caseId } }); await db.caseProtocolApplication.deleteMany({ where: { caseId } }); await db.caseDocument.deleteMany({ where: { caseId } }); await db.interviewCorrection.deleteMany({ where: { interview: { caseId } } }); await db.interview.deleteMany({ where: { caseId } }); await db.caseReport.deleteMany({ where: { caseId } }); await db.caseParticipant.deleteMany({ where: { caseId } }); await db.participant.deleteMany({ where: { establishmentId } }); await db.caseEvent.deleteMany({ where: { caseId } }); await db.case.deleteMany({ where: { id: caseId } }); await db.caseStage.deleteMany({ where: { establishmentId } }); await db.protocolVersion.deleteMany({ where: { protocolTemplate: { establishmentId } } }); await db.protocolTemplate.deleteMany({ where: { establishmentId } }); await db.user.delete({ where: { id: userId } }); await db.establishment.delete({ where: { id: establishmentId } }); } await app?.close(); });
  it('persiste denuncias, participantes, entrevistas y operación trazable', async () => {
    await agent.post(`/api/cases/${caseId}/reports`).set('X-CSRF-Token', csrf).send({ receivedAt: '2026-10-23T12:00:00.000Z', channelCode: 'DIRECTO', classificationCode: 'CONV', factualDescription: 'Relato mínimo verificable.' }).expect(201);
    const participant = await agent.post('/api/participants').set('X-CSRF-Token', csrf).send({ establishmentId, kind: 'ESTUDIANTE', referenceLabel: 'Estudiante A' }).expect(201); await agent.post(`/api/cases/${caseId}/participants`).set('X-CSRF-Token', csrf).send({ participantId: participant.body.id, participationCode: 'INVOLUCRADO' }).expect(201);
    const interview = await agent.post(`/api/cases/${caseId}/interviews`).set('X-CSRF-Token', csrf).send({ occurredAt: '2026-10-23T12:00:00.000Z', modalityCode: 'PRESENCIAL', summary: 'Entrevista de prueba.' }).expect(201); await agent.post(`/api/cases/${caseId}/interviews/${interview.body.id}/finalize`).set('X-CSRF-Token', csrf).send({ expectedVersion: 1 }).expect(201);
    const document = await agent.post(`/api/cases/${caseId}/documents`).set('X-CSRF-Token', csrf).send({ kind: 'EVIDENCIA', originalFilename: 'evidencia.pdf', contentType: 'application/pdf', base64Content: Buffer.from('%PDF-test').toString('base64') }).expect(201); expect(document.body.sha256).toMatch(/^[a-f0-9]{64}$/);
    const measure = await agent.post(`/api/cases/${caseId}/measures`).set('X-CSRF-Token', csrf).send({ title: 'Medida de prueba', responsibleUserIds: [userId] }).expect(201); await agent.post(`/api/cases/${caseId}/measures/${measure.body.id}/update`).set('X-CSRF-Token', csrf).send({ expectedVersion: 1, status: 'COMPLETADA' }).expect(201);
    await agent.post(`/api/cases/${caseId}/follow-ups`).set('X-CSRF-Token', csrf).send({ occurredAt: '2026-10-23T13:00:00.000Z', note: 'Seguimiento de prueba.' }).expect(201); const task = await agent.post(`/api/cases/${caseId}/tasks`).set('X-CSRF-Token', csrf).send({ title: 'Tarea de prueba', assignedToUserId: userId }).expect(201); await agent.post(`/api/cases/${caseId}/tasks/${task.body.id}/complete`).set('X-CSRF-Token', csrf).send({}).expect(201);
    const timeline = await agent.get(`/api/cases/${caseId}/timeline`).expect(200); expect(timeline.body.items.map((item: { eventType: string }) => item.eventType)).toEqual(expect.arrayContaining(['INTERVIEW_FINALIZED', 'DOCUMENT_UPLOADED', 'MEASURE_CREATED', 'FOLLOW_UP_CREATED', 'TASK_COMPLETED'])); await agent.get('/api/notifications').expect(200);
  });
});
