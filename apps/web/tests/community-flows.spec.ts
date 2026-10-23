import { beforeEach, describe, expect, it } from 'vitest';
import { createFakeApi, type FakeApiOptions } from '../src/preview/fakeApi';
import { httpStatus, isConflict } from '../src/lib/errors';
import { api, resetCsrf, setUnauthorizedHandler } from '../src/services/api';
import * as admin from '../src/services/admin';
import * as cases from '../src/services/cases';
import * as community from '../src/services/community';
import * as ops from '../src/services/caseOperations';
import { rutCheckDigit } from '../src/lib/rut';

/**
 * Flujos de comunidad educativa, citaciones y derivaciones contra el servidor simulado (mismo contrato que la API real,
 * `docs/api/community-contract.md`). No sustituyen las pruebas HTTP del backend con PostgreSQL.
 */
let fake: ReturnType<typeof createFakeApi>;
const boot = (options: FakeApiOptions = {}) => {
  fake = createFakeApi({ latencyMs: 0, ...options });
  api.defaults.adapter = fake.adapter;
  resetCsrf();
};
beforeEach(() => { boot(); setUnauthorizedHandler(null); });
const rejection = async (promise: Promise<unknown>) => { try { await promise; } catch (error) { return error; } throw new Error('Se esperaba un rechazo'); };
const rut = (body: number) => `${body}-${rutCheckDigit(String(body))}`;
const establishmentId = () => fake.db.establishments[0]!.id;
const openCase = () => structuredClone(fake.db.cases.find((c) => c.status === 'ABIERTO')!);

describe('establecimientos propios', () => {
  it('entrega establecimientos, etapas y personas sin permisos administrativos', async () => {
    boot({ roles: ['CONVIVENCIA'] });
    expect((await admin.listMyEstablishments())).toHaveLength(1);
    expect((await admin.listStages(establishmentId())).map((s) => s.displayOrder)).toEqual([1, 2, 3, 4]);
    expect((await admin.listMembers(establishmentId())).every((m) => m.displayName && Array.isArray(m.roles))).toBe(true);
  });
});

describe('cursos, estudiantes y apoderados', () => {
  it('valida el RUT, normaliza y rechaza duplicados', async () => {
    const base = { establishmentId: establishmentId(), firstNames: 'Ana', lastNames: 'Prueba' };
    expect(httpStatus(await rejection(community.createStudent({ ...base, rut: '12.345.678-9' })))).toBe(400);
    const created = await community.createStudent({ ...base, rut: '12.345.678-5' });
    expect(created.rut).toBe('12345678-5');
    expect(httpStatus(await rejection(community.createStudent({ ...base, rut: '12345678-5' })))).toBe(409);
  });

  it('busca por nombre y RUT con paginación del servidor', async () => {
    const all = await community.listStudents({ establishmentId: establishmentId(), limit: 3 });
    expect(all.items).toHaveLength(3);
    expect(all.total).toBeGreaterThan(3);
    const byName = await community.listStudents({ establishmentId: establishmentId(), search: 'demo 02' });
    expect(byName.items.map((s) => s.firstNames)).toEqual(['Estudiante demo 02']);
    const rutText = fake.db.students[0]!.rut.replace('-', '').slice(0, 6);
    expect((await community.listStudents({ establishmentId: establishmentId(), search: rutText })).total).toBeGreaterThan(0);
  });

  it('edita con versión esperada y rechaza un cambio concurrente', async () => {
    const student = structuredClone(fake.db.students[0]!);
    const updated = await community.updateStudent(student.id, { expectedVersion: student.version, firstNames: 'Nombre nuevo' });
    expect(updated.version).toBe(student.version + 1);
    const error = await rejection(community.updateStudent(student.id, { expectedVersion: student.version, firstNames: 'Choque' }));
    expect(isConflict(error)).toBe(true);
  });

  it('relaciona y desvincula apoderados dejando uno solo como principal', async () => {
    const student = fake.db.students[7]!;
    const [first, second] = fake.db.guardians;
    await community.linkStudentGuardian(student.id, { guardianId: first!.id, relationship: 'madre', isPrimary: true });
    await community.linkStudentGuardian(student.id, { guardianId: second!.id, relationship: 'padre', isPrimary: true });
    const detail = await community.getStudent(student.id);
    expect(detail.guardianLinks.filter((l) => l.isPrimary).map((l) => l.guardianId)).toEqual([second!.id]);
    await community.unlinkStudentGuardian(student.id, first!.id);
    expect((await community.getStudent(student.id)).guardianLinks).toHaveLength(1);
    expect(httpStatus(await rejection(community.unlinkStudentGuardian(student.id, first!.id)))).toBe(404);
  });

  it('importa todo o nada y crea los cursos que faltan', async () => {
    const id = establishmentId();
    const rows = [{ rut: rut(6000001), firstNames: 'Luis', lastNames: 'Peña', courseName: '3° Medio A' }, { rut: rut(6000002), firstNames: 'Eva', lastNames: 'Mora' }];
    const before = fake.db.students.length;
    expect(httpStatus(await rejection(community.importStudents({ establishmentId: id, academicYear: 2026, rows: [...rows, { rut: '1-9', firstNames: 'X', lastNames: 'Y' }] })))).toBe(400);
    expect(fake.db.students).toHaveLength(before);
    expect(await community.importStudents({ establishmentId: id, academicYear: 2026, rows })).toEqual({ created: 2, updated: 0, createdCourses: 1 });
    expect(await community.importStudents({ establishmentId: id, academicYear: 2026, rows: [rows[0]!] })).toEqual({ created: 0, updated: 1, createdCourses: 0 });
  });

  it('gestiona cursos sin duplicados y con control de versión', async () => {
    const id = establishmentId();
    const course = await community.createCourse({ establishmentId: id, name: '4° Medio B', academicYear: 2030 });
    expect(httpStatus(await rejection(community.createCourse({ establishmentId: id, name: '4° Medio B', academicYear: 2030 })))).toBe(409);
    const renamed = await community.updateCourse(course.id, { expectedVersion: 1, name: '4° Medio C' });
    expect(renamed.version).toBe(2);
    expect(isConflict(await rejection(community.updateCourse(course.id, { expectedVersion: 1, name: 'Otro' })))).toBe(true);
    expect((await community.listCourses({ establishmentId: id, academicYear: 2030 })).map((c) => c.name)).toEqual(['4° Medio C']);
  });

  it('respeta los permisos: un docente solo ve cursos', async () => {
    boot({ roles: ['DOCENTE'] });
    expect(await community.listCourses({ establishmentId: establishmentId() })).toBeInstanceOf(Array);
    expect(httpStatus(await rejection(community.listStudents({ establishmentId: establishmentId() })))).toBe(403);
    expect(httpStatus(await rejection(community.createCourse({ establishmentId: establishmentId(), name: 'X', academicYear: 2030 })))).toBe(403);
  });
});

describe('involucrados desde el directorio', () => {
  it('reutiliza a la persona, valida el tipo y alimenta los expedientes del estudiante', async () => {
    const id = establishmentId();
    const student = fake.db.students[3]!;
    expect(httpStatus(await rejection(cases.createParticipant({ establishmentId: id, kind: 'APODERADO', studentId: student.id })))).toBe(400);
    expect(httpStatus(await rejection(cases.createParticipant({ establishmentId: id, kind: 'ESTUDIANTE' })))).toBe(400);
    const first = await cases.createParticipant({ establishmentId: id, kind: 'ESTUDIANTE', studentId: student.id });
    const again = await cases.createParticipant({ establishmentId: id, kind: 'ESTUDIANTE', studentId: student.id });
    expect(again.id).toBe(first.id);
    expect(first.referenceLabel).toBe(`${student.firstNames} ${student.lastNames}`);
    const target = openCase();
    await cases.linkParticipant(target.id, { participantId: first.id, participationCode: 'AFECTADO' });
    expect((await community.listStudentCases(student.id)).map((c) => c.id)).toContain(target.id);
  });
});

describe('citaciones', () => {
  it('programa, reprograma y cierra con las reglas del servidor', async () => {
    const target = openCase();
    const input = { recipientLabel: 'Apoderado/a de prueba', scheduledAt: new Date(Date.now() + 86_400_000).toISOString(), location: 'Sala 1', reason: 'Conversar sobre el caso' };
    const summons = await ops.createSummons(target.id, input);
    expect(summons).toMatchObject({ status: 'PROGRAMADA', version: 1 });
    const moved = await ops.updateSummons(target.id, summons.id, { expectedVersion: 1, location: 'Sala 2' });
    expect(moved).toMatchObject({ location: 'Sala 2', version: 2 });
    expect(isConflict(await rejection(ops.updateSummons(target.id, summons.id, { expectedVersion: 1, location: 'Choque' })))).toBe(true);
    expect(httpStatus(await rejection(ops.updateSummons(target.id, summons.id, { expectedVersion: 2, status: 'CANCELADA' })))).toBe(400);
    const done = await ops.updateSummons(target.id, summons.id, { expectedVersion: 2, status: 'REALIZADA', outcomeNote: 'Asistieron.' });
    expect(done.status).toBe('REALIZADA');
    expect(isConflict(await rejection(ops.updateSummons(target.id, summons.id, { expectedVersion: 3, status: 'NO_ASISTIO' })))).toBe(true);
  });

  it('no permite registrar en un expediente cerrado y filtra el listado global', async () => {
    const closed = structuredClone(fake.db.cases.find((c) => c.status === 'CERRADO')!);
    const input = { recipientLabel: 'Alguien', scheduledAt: new Date().toISOString(), location: 'Sala', reason: 'Motivo cualquiera' };
    expect(isConflict(await rejection(ops.createSummons(closed.id, input)))).toBe(true);
    const programmed = await ops.listSummons({ status: 'PROGRAMADA' });
    expect(programmed.items.length).toBeGreaterThan(0);
    expect(programmed.items.every((s) => s.status === 'PROGRAMADA' && s.case)).toBe(true);
  });
});

describe('derivaciones', () => {
  it('avanza solo por transiciones válidas', async () => {
    const target = openCase();
    const referral = await ops.createReferral(target.id, { typeCode: 'salud', institutionName: 'CESFAM Norte', reason: 'Evaluación psicológica' });
    expect(referral).toMatchObject({ status: 'PENDIENTE', typeCode: 'SALUD' });
    expect(isConflict(await rejection(ops.updateReferral(target.id, referral.id, { expectedVersion: 1, status: 'CON_RESPUESTA' })))).toBe(true);
    const sent = await ops.updateReferral(target.id, referral.id, { expectedVersion: 1, status: 'ENVIADA' });
    expect(sent.sentAt).not.toBeNull();
    const answered = await ops.updateReferral(target.id, referral.id, { expectedVersion: 2, status: 'CON_RESPUESTA', responseNote: 'Hora asignada.' });
    const closed = await ops.updateReferral(target.id, referral.id, { expectedVersion: answered.version, status: 'CERRADA' });
    expect(closed.closedAt).not.toBeNull();
    expect(isConflict(await rejection(ops.updateReferral(target.id, referral.id, { expectedVersion: closed.version, responseNote: 'Tarde' })))).toBe(true);
    expect((await ops.listReferrals({ status: 'CERRADA' })).items.map((r) => r.id)).toContain(referral.id);
  });
});
