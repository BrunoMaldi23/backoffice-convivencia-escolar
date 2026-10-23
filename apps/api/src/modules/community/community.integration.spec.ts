import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import * as cookieParser from 'cookie-parser';
import { randomBytes } from 'node:crypto';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request: typeof import('supertest') = require('supertest');
import { AppModule } from '../../app.module';
import { DatabaseService } from '../../database/database.service';

/** Calcula el dígito verificador para armar RUT válidos de prueba. */
function rutOf(body: number) {
  let sum = 0; let factor = 2;
  for (const digit of String(body).split('').reverse()) { sum += Number(digit) * factor; factor = factor === 7 ? 2 : factor + 1; }
  const rest = 11 - (sum % 11);
  return `${body}-${rest === 11 ? '0' : rest === 10 ? 'K' : rest}`;
}

describe('Comunidad educativa, citaciones y derivaciones HTTP con PostgreSQL', () => {
  let app: INestApplication; let db: DatabaseService;
  let establishmentId: string; let otherEstablishmentId: string; let caseId: string; let closedCaseId: string;
  let userId: string; let outsiderId: string; let agent: ReturnType<typeof request.agent>; let outsider: ReturnType<typeof request.agent>; let csrf: string; let outsiderCsrf: string;
  const server = () => app.getHttpServer();
  const post = (path: string, body: object) => agent.post(`/api/${path}`).set('X-CSRF-Token', csrf).send(body);
  const patch = (path: string, body: object) => agent.patch(`/api/${path}`).set('X-CSRF-Token', csrf).send(body);

  beforeAll(async () => {
    if (!process.env.DATABASE_URL || new URL(process.env.DATABASE_URL).pathname !== '/convivencia_test') throw new Error('Las pruebas requieren exclusivamente convivencia_test.');
    app = (await Test.createTestingModule({ imports: [AppModule] }).compile()).createNestApplication(); app.setGlobalPrefix('api'); app.use(cookieParser()); app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true })); await app.init(); db = app.get(DatabaseService);
    const suffix = randomBytes(6).toString('hex');
    establishmentId = (await db.establishment.create({ data: { code: `COM-${suffix}`, name: 'Pruebas comunidad' } })).id;
    otherEstablishmentId = (await db.establishment.create({ data: { code: `OTR-${suffix}`, name: 'Otro establecimiento' } })).id;
    const role = await db.role.findUniqueOrThrow({ where: { name: 'CONVIVENCIA' } });
    const passwords = [randomBytes(20).toString('base64url'), randomBytes(20).toString('base64url')];
    const user = await db.user.create({ data: { email: `com-${suffix}@test.local`, displayName: 'Encargada de prueba', passwordHash: await argon2.hash(passwords[0]!), roles: { create: { roleId: role.id } }, establishmentMemberships: { create: { establishmentId } } } }); userId = user.id;
    const stranger = await db.user.create({ data: { email: `ext-${suffix}@test.local`, displayName: 'Persona de otro colegio', passwordHash: await argon2.hash(passwords[1]!), roles: { create: { roleId: role.id } }, establishmentMemberships: { create: { establishmentId: otherEstablishmentId } } } }); outsiderId = stranger.id;
    const stage = await db.caseStage.create({ data: { establishmentId, code: 'INICIO', name: 'Inicio', displayOrder: 1 } });
    const base = { establishmentId, initialDescription: '', receivedAt: new Date(), categoryCode: 'TEST', priority: 'MEDIA', createdByUserId: userId, currentStageId: stage.id };
    caseId = (await db.case.create({ data: { ...base, folio: 1, title: 'Expediente abierto' } })).id;
    closedCaseId = (await db.case.create({ data: { ...base, folio: 2, title: 'Expediente cerrado', status: 'CERRADO', closedAt: new Date() } })).id;
    agent = request.agent(server()); await agent.post('/api/auth/login').send({ email: user.email, password: passwords[0] }).expect(201); csrf = (await agent.get('/api/auth/csrf').expect(200)).body.token as string;
    outsider = request.agent(server()); await outsider.post('/api/auth/login').send({ email: stranger.email, password: passwords[1] }).expect(201); outsiderCsrf = (await outsider.get('/api/auth/csrf').expect(200)).body.token as string;
  });
  afterAll(async () => {
    if (db) {
      const cases = { caseId: { in: [caseId, closedCaseId] } };
      await db.caseSummons.deleteMany({ where: cases }); await db.caseReferral.deleteMany({ where: cases });
      await db.caseParticipant.deleteMany({ where: cases }); await db.participant.deleteMany({ where: { establishmentId } });
      await db.caseEvent.deleteMany({ where: cases }); await db.case.deleteMany({ where: { id: { in: [caseId, closedCaseId] } } }); await db.caseStage.deleteMany({ where: { establishmentId } });
      await db.student.deleteMany({ where: { establishmentId } }); await db.guardian.deleteMany({ where: { establishmentId } }); await db.staffMember.deleteMany({ where: { establishmentId } }); await db.course.deleteMany({ where: { establishmentId } });
      await db.user.deleteMany({ where: { id: { in: [userId, outsiderId] } } }); await db.establishment.deleteMany({ where: { id: { in: [establishmentId, otherEstablishmentId] } } });
    }
    await app?.close();
  });

  it('gestiona cursos con control de versión y sin duplicados', async () => {
    const course = await post('courses', { establishmentId, name: '1° Básico A', level: 'Básica', academicYear: 2026 }).expect(201);
    await post('courses', { establishmentId, name: '1° Básico A', academicYear: 2026 }).expect(409);
    const renamed = await patch(`courses/${course.body.id}`, { expectedVersion: 1, name: '1° Básico B' }).expect(200);
    expect(renamed.body.version).toBe(2);
    await patch(`courses/${course.body.id}`, { expectedVersion: 1, name: 'Otro' }).expect(409);
    const list = await agent.get('/api/courses').query({ establishmentId, academicYear: 2026 }).expect(200);
    expect(list.body).toHaveLength(1); expect(list.body[0]._count.students).toBe(0);
  });

  it('valida el RUT, normaliza, busca, edita con versión y aísla por establecimiento', async () => {
    const course = (await agent.get('/api/courses').query({ establishmentId }).expect(200)).body[0];
    await post('students', { establishmentId, rut: '12.345.678-9', firstNames: 'Ana', lastNames: 'Soto' }).expect(400);
    const created = await post('students', { establishmentId, rut: '12.345.678-5', firstNames: 'Ana María', lastNames: 'Soto Rojas', birthDate: '2015-03-21', courseId: course.id }).expect(201);
    expect(created.body.rut).toBe('12345678-5'); expect(created.body.course.name).toBe('1° Básico B');
    await post('students', { establishmentId, rut: '12345678-5', firstNames: 'Otra', lastNames: 'Persona' }).expect(409);
    expect((await agent.get('/api/students').query({ establishmentId, search: 'soto' }).expect(200)).body.total).toBe(1);
    expect((await agent.get('/api/students').query({ establishmentId, search: '12.345.678' }).expect(200)).body.total).toBe(1);
    expect((await agent.get('/api/students').query({ establishmentId, search: 'zzz' }).expect(200)).body.total).toBe(0);
    const updated = await patch(`students/${created.body.id}`, { expectedVersion: 1, firstNames: 'Ana M.', courseId: null }).expect(200);
    expect(updated.body.version).toBe(2); expect(updated.body.course).toBeNull();
    await patch(`students/${created.body.id}`, { expectedVersion: 1, firstNames: 'Choque' }).expect(409);
    await outsider.get('/api/students').query({ establishmentId }).expect(404);
    await outsider.get(`/api/students/${created.body.id}`).expect(404);
    await outsider.post('/api/students').set('X-CSRF-Token', outsiderCsrf).send({ establishmentId, rut: rutOf(9000001), firstNames: 'X', lastNames: 'Y' }).expect(404);
    const audits = await db.securityAudit.findMany({ where: { targetType: 'STUDENT', targetId: created.body.id } });
    expect(audits.length).toBeGreaterThanOrEqual(2); expect(JSON.stringify(audits)).not.toContain('12345678');
  });

  it('relaciona apoderados con estudiantes y permite quitar la relación', async () => {
    const student = (await agent.get('/api/students').query({ establishmentId, search: 'soto' }).expect(200)).body.items[0];
    const guardian = await post('guardians', { establishmentId, rut: rutOf(8000001), firstNames: 'Marta', lastNames: 'Rojas', email: 'MARTA@Test.local', phone: '+56 9 1111 2222' }).expect(201);
    expect(guardian.body.email).toBe('marta@test.local');
    await post('guardians', { establishmentId, firstNames: 'Sin RUT', lastNames: 'Uno' }).expect(201); await post('guardians', { establishmentId, firstNames: 'Sin RUT', lastNames: 'Dos' }).expect(201);
    await post(`students/${student.id}/guardians`, { guardianId: guardian.body.id, relationship: 'madre', isPrimary: true }).expect(201);
    const detail = (await agent.get(`/api/students/${student.id}`).expect(200)).body;
    expect(detail.guardianLinks).toHaveLength(1); expect(detail.guardianLinks[0].relationship).toBe('MADRE'); expect(detail.guardianLinks[0].guardian.firstNames).toBe('Marta');
    const guardianDetail = (await agent.get(`/api/guardians/${guardian.body.id}`).expect(200)).body; expect(guardianDetail.studentLinks[0].student.id).toBe(student.id);
    expect((await agent.get('/api/guardians').query({ establishmentId, studentId: student.id }).expect(200)).body.total).toBe(1);
    await patch(`guardians/${guardian.body.id}`, { expectedVersion: 1, phone: null }).expect(200);
    await patch(`guardians/${guardian.body.id}`, { expectedVersion: 1, phone: '1' }).expect(409);
    await post(`students/${student.id}/guardians/${guardian.body.id}/unlink`, {}).expect(201);
    await post(`students/${student.id}/guardians/${guardian.body.id}/unlink`, {}).expect(404);
  });

  it('administra funcionarios, con cuenta de usuario opcional y única', async () => {
    const staff = await post('staff', { establishmentId, rut: rutOf(7000001), firstNames: 'Pedro', lastNames: 'Vega', position: 'Inspector general', userId }).expect(201);
    expect(staff.body.user.id).toBe(userId);
    await post('staff', { establishmentId, firstNames: 'Otro', lastNames: 'Vega', position: 'Docente', userId }).expect(409);
    await post('staff', { establishmentId, firstNames: 'Ajeno', lastNames: 'Vega', position: 'Docente', userId: outsiderId }).expect(404);
    const updated = await patch(`staff/${staff.body.id}`, { expectedVersion: 1, position: 'Director' }).expect(200); expect(updated.body.position).toBe('Director');
    expect((await agent.get('/api/staff').query({ establishmentId, search: 'vega' }).expect(200)).body.total).toBe(1);
  });

  it('importa estudiantes todo o nada y actualiza los ya existentes', async () => {
    const rows = [{ rut: rutOf(6000001), firstNames: 'Luis', lastNames: 'Peña', courseName: '2° Básico A', birthDate: '2014-05-02' }, { rut: rutOf(6000002), firstNames: 'Eva', lastNames: 'Mora', courseName: '2° Básico A' }, { rut: rutOf(6000003), firstNames: 'Ian', lastNames: 'Cruz' }];
    const bad = await post('students/import', { establishmentId, academicYear: 2026, rows: [...rows, { rut: '1-1', firstNames: '', lastNames: 'X' }, { rut: rows[0]!.rut, firstNames: 'Dup', lastNames: 'Dup' }] }).expect(400);
    expect(bad.body.errors.map((e: { row: number }) => e.row)).toEqual(expect.arrayContaining([4, 5]));
    expect((await agent.get('/api/students').query({ establishmentId, search: 'Peña' }).expect(200)).body.total).toBe(0);
    const ok = await post('students/import', { establishmentId, academicYear: 2026, rows }).expect(201);
    expect(ok.body).toEqual({ created: 3, updated: 0, createdCourses: 1 });
    const again = await post('students/import', { establishmentId, academicYear: 2026, rows: [{ ...rows[0]!, lastNames: 'Peña Díaz' }] }).expect(201);
    expect(again.body).toEqual({ created: 0, updated: 1, createdCourses: 0 });
    expect((await agent.get('/api/students').query({ establishmentId, search: 'Peña Díaz' }).expect(200)).body.total).toBe(1);
  });

  it('vincula involucrados del directorio, reutiliza personas y lista los expedientes del estudiante', async () => {
    const student = (await agent.get('/api/students').query({ establishmentId, search: 'soto' }).expect(200)).body.items[0];
    await post('participants', { establishmentId, kind: 'APODERADO', studentId: student.id }).expect(400);
    await post('participants', { establishmentId, kind: 'ESTUDIANTE' }).expect(400);
    const first = await post('participants', { establishmentId, kind: 'ESTUDIANTE', studentId: student.id }).expect(201);
    expect(first.body.referenceLabel).toBe('Ana M. Soto Rojas');
    const second = await post('participants', { establishmentId, kind: 'ESTUDIANTE', studentId: student.id }).expect(201); expect(second.body.id).toBe(first.body.id);
    await post(`cases/${caseId}/participants`, { participantId: first.body.id, participationCode: 'AFECTADO' }).expect(201);
    const cases = (await agent.get(`/api/students/${student.id}/cases`).expect(200)).body;
    expect(cases).toHaveLength(1); expect(cases[0]).toMatchObject({ id: caseId, folio: 1, participationCode: 'AFECTADO' });
    await outsider.get(`/api/students/${student.id}/cases`).expect(404);
  });

  it('registra citaciones con estados válidos, versión y expediente abierto', async () => {
    const participant = (await agent.get(`/api/cases/${caseId}/participants`).expect(200)).body[0].participantId as string;
    await post(`cases/${caseId}/summons`, { scheduledAt: '2026-11-05T14:00:00.000Z', location: 'Oficina de convivencia', reason: 'Conversar sobre el caso' }).expect(400);
    const summons = await post(`cases/${caseId}/summons`, { participantId: participant, scheduledAt: '2026-11-05T14:00:00.000Z', location: 'Oficina de convivencia', reason: 'Conversar sobre el caso' }).expect(201);
    expect(summons.body.status).toBe('PROGRAMADA'); expect(summons.body.recipientLabel).toBe('Ana M. Soto Rojas');
    await post(`cases/${closedCaseId}/summons`, { recipientLabel: 'Apoderado', scheduledAt: '2026-11-05T14:00:00.000Z', location: 'Sala', reason: 'Motivo cualquiera' }).expect(409);
    await post(`cases/${caseId}/summons`, { recipientLabel: 'Apoderado de otra persona', scheduledAt: '2026-11-06T14:00:00.000Z', location: 'Sala 2', reason: 'Segunda reunión' }).expect(201);
    const moved = await post(`cases/${caseId}/summons/${summons.body.id}/update`, { expectedVersion: 1, scheduledAt: '2026-11-06T15:00:00.000Z', location: 'Sala 3' }).expect(201); expect(moved.body.version).toBe(2);
    await post(`cases/${caseId}/summons/${summons.body.id}/update`, { expectedVersion: 1, location: 'Choque' }).expect(409);
    await post(`cases/${caseId}/summons/${summons.body.id}/update`, { expectedVersion: 2, status: 'CANCELADA' }).expect(400);
    const done = await post(`cases/${caseId}/summons/${summons.body.id}/update`, { expectedVersion: 2, status: 'REALIZADA', outcomeNote: 'Asistieron ambas partes.' }).expect(201); expect(done.body.status).toBe('REALIZADA');
    await post(`cases/${caseId}/summons/${summons.body.id}/update`, { expectedVersion: 3, status: 'CANCELADA', outcomeNote: 'Ya no corresponde' }).expect(409);
    expect((await agent.get(`/api/cases/${caseId}/summons`).expect(200)).body).toHaveLength(2);
    const global = (await agent.get('/api/summons').query({ establishmentId, status: 'PROGRAMADA' }).expect(200)).body;
    expect(global.total).toBe(1); expect(global.items[0].case).toMatchObject({ id: caseId, folio: 1 });
    expect((await outsider.get('/api/summons').query({ establishmentId }).expect(200)).body.total).toBe(0);
    await outsider.get(`/api/cases/${caseId}/summons`).expect(404);
  });

  it('avanza derivaciones solo por transiciones válidas', async () => {
    const referral = await post(`cases/${caseId}/referrals`, { typeCode: 'salud', institutionName: 'CESFAM Norte', reason: 'Evaluación psicológica', contactName: 'Dra. Pérez' }).expect(201);
    expect(referral.body).toMatchObject({ status: 'PENDIENTE', typeCode: 'SALUD' });
    await post(`cases/${caseId}/referrals/${referral.body.id}/update`, { expectedVersion: 1, status: 'CON_RESPUESTA' }).expect(409);
    const sent = await post(`cases/${caseId}/referrals/${referral.body.id}/update`, { expectedVersion: 1, status: 'ENVIADA' }).expect(201); expect(sent.body.sentAt).not.toBeNull();
    await post(`cases/${caseId}/referrals/${referral.body.id}/update`, { expectedVersion: 1, status: 'CERRADA' }).expect(409);
    const answered = await post(`cases/${caseId}/referrals/${referral.body.id}/update`, { expectedVersion: 2, status: 'CON_RESPUESTA', responseNote: 'Hora asignada.' }).expect(201); expect(answered.body.responseAt).not.toBeNull();
    const closed = await post(`cases/${caseId}/referrals/${referral.body.id}/update`, { expectedVersion: 3, status: 'CERRADA' }).expect(201); expect(closed.body.closedAt).not.toBeNull();
    await post(`cases/${caseId}/referrals/${referral.body.id}/update`, { expectedVersion: 4, responseNote: 'Tarde' }).expect(409);
    await post(`cases/${closedCaseId}/referrals`, { typeCode: 'OTRO', institutionName: 'Red local', reason: 'Motivo cualquiera' }).expect(409);
    expect((await agent.get('/api/referrals').query({ establishmentId, status: 'CERRADA' }).expect(200)).body.total).toBe(1);
    expect((await outsider.get('/api/referrals').query({ establishmentId }).expect(200)).body.total).toBe(0);
    const timeline = (await agent.get(`/api/cases/${caseId}/timeline`).expect(200)).body.items.map((item: { eventType: string }) => item.eventType);
    expect(timeline).toEqual(expect.arrayContaining(['SUMMONS_CREATED', 'SUMMONS_UPDATED', 'REFERRAL_CREATED', 'REFERRAL_UPDATED']));
  });

  it('entrega etapas, personas y establecimientos propios sin permisos administrativos', async () => {
    const mine = (await agent.get('/api/me/establishments').expect(200)).body as { id: string }[];
    expect(mine.map((item) => item.id)).toEqual([establishmentId]);
    expect((await agent.get(`/api/establishments/${establishmentId}/stages`).expect(200)).body[0].code).toBe('INICIO');
    const members = (await agent.get(`/api/establishments/${establishmentId}/members`).expect(200)).body;
    expect(members).toEqual([{ id: userId, displayName: 'Encargada de prueba', roles: ['CONVIVENCIA'] }]);
    await outsider.get(`/api/establishments/${establishmentId}/stages`).expect(404);
    await outsider.get(`/api/establishments/${establishmentId}/members`).expect(404);
  });
});
