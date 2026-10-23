import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import * as cookieParser from 'cookie-parser';
import { randomBytes } from 'node:crypto';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request: typeof import('supertest') = require('supertest');
import { CaseAccessLevel, CaseStatus } from '@prisma/client';
import { AppModule } from '../../app.module';
import { DatabaseService } from '../../database/database.service';

type Session = { agent: ReturnType<typeof request.agent>; csrf: string; userId: string };

describe('Casos HTTP con PostgreSQL', () => {
  let app: INestApplication;
  let db: DatabaseService;
  let establishmentId: string;
  let otherEstablishmentId: string;
  let stageId: string;
  let admin: Session;
  let writer: Session;
  let reader: Session;
  let outsider: Session;
  let restricted: Session;
  const userIds: string[] = [];
  const establishmentIds: string[] = [];

  const server = () => app.getHttpServer();
  const caseInput = (overrides: Record<string, unknown> = {}) => ({
    establishmentId,
    title: 'Situación de prueba institucional',
    initialDescription: 'Descripción mínima para validación de expediente.',
    receivedAt: '2026-10-22T12:00:00.000Z',
    categoryCode: 'CONVIVENCIA',
    priority: 'MEDIA',
    currentStageId: stageId,
    ...overrides
  });

  async function createUser(role: string, membership = true): Promise<Session> {
    const password = randomBytes(24).toString('base64url');
    const roleRecord = await db.role.findUniqueOrThrow({ where: { name: role } });
    const user = await db.user.create({ data: {
      email: `${role.toLowerCase()}-${randomBytes(8).toString('hex')}@test.local`,
      displayName: `Usuario ${role}`,
      passwordHash: await argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 }),
      roles: { create: { roleId: roleRecord.id } },
      ...(membership ? { establishmentMemberships: { create: { establishmentId } } } : {})
    } });
    userIds.push(user.id);
    const agent = request.agent(server());
    await agent.post('/api/auth/login').send({ email: user.email, password }).expect(201);
    const csrf = (await agent.get('/api/auth/csrf').expect(200)).body.token as string;
    return { agent, csrf, userId: user.id };
  }

  beforeAll(async () => {
    if (!process.env.DATABASE_URL || new URL(process.env.DATABASE_URL).pathname !== '/convivencia_test') throw new Error('Las pruebas requieren exclusivamente convivencia_test.');
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
    db = app.get(DatabaseService);
    const suffix = randomBytes(8).toString('hex');
    const establishment = await db.establishment.create({ data: { code: `CASE-${suffix}`, name: 'Establecimiento de pruebas Casos' } });
    const other = await db.establishment.create({ data: { code: `CASE-OTHER-${suffix}`, name: 'Segundo establecimiento de pruebas' } });
    establishmentId = establishment.id;
    otherEstablishmentId = other.id;
    establishmentIds.push(establishment.id, other.id);
    stageId = (await db.caseStage.create({ data: { establishmentId, code: 'RECEPCION', name: 'Recepción', displayOrder: 1 } })).id;
    admin = await createUser('SYSTEM_ADMIN');
    writer = await createUser('CONVIVENCIA');
    reader = await createUser('PSICOLOGO');
    outsider = await createUser('CONVIVENCIA', false);
    restricted = await createUser('DOCENTE');
  });

  afterAll(async () => {
    if (db) {
      const cases = await db.case.findMany({ where: { establishmentId: { in: establishmentIds } }, select: { id: true } });
      const caseIds = cases.map((item) => item.id);
      if (caseIds.length) {
        await db.securityAudit.deleteMany({ where: { targetType: 'CASE', targetId: { in: caseIds } } });
        await db.caseEvent.deleteMany({ where: { caseId: { in: caseIds } } });
        await db.caseAssignment.deleteMany({ where: { caseId: { in: caseIds } } });
        await db.caseAccessGrant.deleteMany({ where: { caseId: { in: caseIds } } });
        await db.case.deleteMany({ where: { id: { in: caseIds } } });
      }
      if (userIds.length) {
        await db.securityAudit.deleteMany({ where: { actorUserId: { in: userIds } } });
        await db.user.deleteMany({ where: { id: { in: userIds } } });
      }
      await db.caseStage.deleteMany({ where: { establishmentId: { in: establishmentIds } } });
      await db.establishment.deleteMany({ where: { id: { in: establishmentIds } } });
    }
    await app?.close();
  });

  it('crea un expediente, persiste su evento inicial y exige CSRF', async () => {
    await writer.agent.post('/api/cases').send(caseInput()).expect(403);
    await writer.agent.post('/api/cases').set('X-CSRF-Token', 'inválido').send(caseInput()).expect(403);
    const created = await writer.agent.post('/api/cases').set('X-CSRF-Token', writer.csrf).send(caseInput()).expect(201);
    expect(created.body.folio).toBe(1);
    expect(created.body.version).toBe(1);
    const timeline = await writer.agent.get(`/api/cases/${created.body.id}/timeline`).expect(200);
    expect(timeline.body.total).toBe(1);
    expect(timeline.body.items[0]).toMatchObject({ eventType: 'CASE_CREATED', caseId: created.body.id });
  });

  it('asigna folios únicos bajo creación concurrente y persiste cada timeline', async () => {
    const responses = await Promise.all(Array.from({ length: 8 }, (_, index) => writer.agent.post('/api/cases')
      .set('X-CSRF-Token', writer.csrf)
      .send(caseInput({ title: `Situación concurrente ${index}` }))));
    expect(responses.every((response) => response.status === 201)).toBe(true);
    const folios = responses.map((response) => response.body.folio as number).sort((a, b) => a - b);
    expect(new Set(folios).size).toBe(8);
    expect(folios).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
    const eventCount = await db.caseEvent.count({ where: { caseId: { in: responses.map((response) => response.body.id as string) }, eventType: 'CASE_CREATED' } });
    expect(eventCount).toBe(8);
  });

  it('aplica versionado optimista y mantiene la transacción sin evento parcial', async () => {
    const created = await writer.agent.post('/api/cases').set('X-CSRF-Token', writer.csrf).send(caseInput({ title: 'Caso con versión' })).expect(201);
    await writer.agent.patch(`/api/cases/${created.body.id}`).set('X-CSRF-Token', writer.csrf).send({ expectedVersion: 1, title: 'Caso actualizado' }).expect(200);
    await writer.agent.patch(`/api/cases/${created.body.id}`).set('X-CSRF-Token', writer.csrf).send({ expectedVersion: 1, title: 'Cambio obsoleto' }).expect(409);
    const persisted = await db.case.findUniqueOrThrow({ where: { id: created.body.id } });
    expect(persisted).toMatchObject({ title: 'Caso actualizado', version: 2 });
    expect(await db.caseEvent.count({ where: { caseId: created.body.id, eventType: 'CASE_UPDATED' } })).toBe(1);
  });

  it('deniega membresías inactivas, establecimientos ajenos y acceso sin grant', async () => {
    await db.establishmentMembership.update({ where: { establishmentId_userId: { establishmentId, userId: writer.userId } }, data: { isActive: false } });
    await writer.agent.post('/api/cases').set('X-CSRF-Token', writer.csrf).send(caseInput({ title: 'No debe crearse' })).expect(404);
    await db.establishmentMembership.update({ where: { establishmentId_userId: { establishmentId, userId: writer.userId } }, data: { isActive: true } });
    const created = await writer.agent.post('/api/cases').set('X-CSRF-Token', writer.csrf).send(caseInput({ title: 'Caso aislado' })).expect(201);
    await outsider.agent.get(`/api/cases/${created.body.id}`).expect(404);
    await reader.agent.get(`/api/cases/${created.body.id}`).expect(404);
    await admin.agent.get(`/api/cases/${created.body.id}`).expect(404);
    await restricted.agent.get(`/api/cases/${created.body.id}`).expect(403);
    await admin.agent.post('/api/cases').set('X-CSRF-Token', admin.csrf).send(caseInput({ establishmentId: otherEstablishmentId, title: 'Cruce institucional' })).expect(404);
  });

  it('respeta grants vigentes y deniega grants expirados o revocados', async () => {
    const created = await writer.agent.post('/api/cases').set('X-CSRF-Token', writer.csrf).send(caseInput({ title: 'Caso con grants' })).expect(201);
    const grant = await db.caseAccessGrant.create({ data: { caseId: created.body.id, userId: reader.userId, accessLevel: CaseAccessLevel.READ, grantedByUserId: writer.userId } });
    await reader.agent.get(`/api/cases/${created.body.id}`).expect(200);
    await reader.agent.patch(`/api/cases/${created.body.id}`).set('X-CSRF-Token', reader.csrf).send({ expectedVersion: 1, title: 'Sin escritura' }).expect(404);
    await db.caseAccessGrant.update({ where: { id: grant.id }, data: { expiresAt: new Date(Date.now() - 1_000) } });
    await reader.agent.get(`/api/cases/${created.body.id}`).expect(404);
    await db.caseAccessGrant.update({ where: { id: grant.id }, data: { expiresAt: null, revokedAt: new Date() } });
    await reader.agent.get(`/api/cases/${created.body.id}`).expect(404);
  });

  it('valida transiciones, cierre y reapertura trazables', async () => {
    const created = await writer.agent.post('/api/cases').set('X-CSRF-Token', writer.csrf).send(caseInput({ title: 'Máquina de estados' })).expect(201);
    const transition = (toStatus: CaseStatus, expectedVersion: number, reason?: string) => writer.agent.post(`/api/cases/${created.body.id}/transition`).set('X-CSRF-Token', writer.csrf).send({ toStatus, expectedVersion, reason });
    await transition(CaseStatus.CERRADO, 1, 'No permitido desde abierto').expect(400);
    await transition(CaseStatus.EN_EVALUACION, 1).expect(201);
    await transition(CaseStatus.EN_PROCESO, 2).expect(201);
    await transition(CaseStatus.RESUELTO, 3).expect(400);
    await transition(CaseStatus.RESUELTO, 3, 'Evaluación concluida').expect(201);
    await transition(CaseStatus.CERRADO, 4, 'Cierre documentado').expect(201);
    await transition(CaseStatus.EN_EVALUACION, 5).expect(400);
    await transition(CaseStatus.EN_EVALUACION, 5, 'Reapertura justificada').expect(201);
    const timeline = await writer.agent.get(`/api/cases/${created.body.id}/timeline`).expect(200);
    expect(timeline.body.items.map((event: { eventType: string }) => event.eventType)).toEqual(expect.arrayContaining(['CASE_RESOLVED', 'CASE_CLOSED', 'CASE_REOPENED']));
  });
});
