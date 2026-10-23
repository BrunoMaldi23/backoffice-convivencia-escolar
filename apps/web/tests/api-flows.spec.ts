import { beforeEach, describe, expect, it } from 'vitest';
import { scanCases } from '../src/composables/useScoped';
import { fetchAllCases } from '../src/composables/useCases';
import { describeError, httpStatus, isConflict } from '../src/lib/errors';
import { createFakeApi, type FakeApiOptions } from '../src/preview/fakeApi';
import { api, resetCsrf, setUnauthorizedHandler } from '../src/services/api';
import * as admin from '../src/services/admin';
import * as cases from '../src/services/cases';
import * as ops from '../src/services/caseOperations';
import type { CaseRecord } from '../src/types/api';

/**
 * Flujos de los servicios contra el servidor simulado (mismo contrato que la API real, sin red ni base de datos). Verifican
 * las reglas que la interfaz debe respetar: versión esperada, máquina de estados, permisos, CSRF y límites de carga.
 */
let fake: ReturnType<typeof createFakeApi>;
const boot = (options: FakeApiOptions = {}) => {
  fake = createFakeApi({ latencyMs: 0, ...options });
  api.defaults.adapter = fake.adapter;
  resetCsrf();
};
beforeEach(() => { boot(); setUnauthorizedHandler(null); });

/** Copia del expediente de la base simulada: así la prueba conserva la versión que conocía antes de editar, como el navegador. */
const caseWith = (status: string) => structuredClone(fake.db.cases.find((c) => c.status === status)!);
const rejection = async (promise: Promise<unknown>) => { try { await promise; } catch (error) { return error; } throw new Error('Se esperaba un rechazo'); };

describe('expedientes', () => {
  it('lista con paginación y filtros del servidor', async () => {
    const page = await cases.listCases({ page: 2, limit: 5 });
    expect(page).toMatchObject({ page: 2, limit: 5, total: 14 });
    expect(page.items).toHaveLength(5);
    const open = await cases.listCases({ status: 'ABIERTO' });
    expect(open.items.every((c) => c.status === 'ABIERTO')).toBe(true);
  });

  it('crea un expediente con folio correlativo y versión 1', async () => {
    const establishmentId = fake.db.establishments[0]!.id;
    const a = await cases.createCase({ establishmentId, title: 'Caso A', receivedAt: new Date().toISOString(), categoryCode: 'CONVIVENCIA', priority: 'MEDIA' });
    const b = await cases.createCase({ establishmentId, title: 'Caso B', receivedAt: new Date().toISOString(), categoryCode: 'CONVIVENCIA', priority: 'ALTA' });
    expect(a.version).toBe(1);
    expect(b.folio).toBe(a.folio + 1);
    expect(a.status).toBe('ABIERTO');
  });

  it('rechaza con 409 una edición con versión obsoleta y el mensaje invita a recargar', async () => {
    const record = caseWith('ABIERTO');
    const updated = await cases.updateCase(record.id, { expectedVersion: record.version, priority: 'ALTA' });
    expect(updated.version).toBe(record.version + 1);
    const error = await rejection(cases.updateCase(record.id, { expectedVersion: record.version, priority: 'BAJA' }));
    expect(isConflict(error)).toBe(true);
    expect(describeError(error)).toMatch(/modificado por otra persona.*Recargue/);
    expect((await cases.getCase(record.id)).priority).toBe('ALTA');
  });

  it('aplica la máquina de estados, los motivos obligatorios y la reapertura', async () => {
    const record = caseWith('ABIERTO');
    const bad = await rejection(cases.transitionCase(record.id, { toStatus: 'CERRADO', expectedVersion: record.version }));
    expect(httpStatus(bad)).toBe(400);
    expect(describeError(bad)).toBe('Transición de estado no permitida');
    const noReason = await rejection(cases.transitionCase(record.id, { toStatus: 'PAUSADO', expectedVersion: record.version }));
    expect(describeError(noReason)).toBe('La transición requiere un motivo');

    let current: CaseRecord = await cases.transitionCase(record.id, { toStatus: 'EN_EVALUACION', expectedVersion: record.version });
    current = await cases.transitionCase(record.id, { toStatus: 'RESUELTO', expectedVersion: current.version, reason: 'Acuerdos cumplidos' });
    current = await cases.transitionCase(record.id, { toStatus: 'CERRADO', expectedVersion: current.version, reason: 'Sin pendientes' });
    expect(current).toMatchObject({ status: 'CERRADO', closureReason: 'Sin pendientes' });
    expect(current.closedAt).not.toBeNull();
    current = await cases.transitionCase(record.id, { toStatus: 'EN_EVALUACION', expectedVersion: current.version, reason: 'Nuevos antecedentes' });
    expect(current).toMatchObject({ status: 'EN_EVALUACION', closedAt: null });

    const types = (await cases.getTimeline(record.id)).items.map((e) => e.eventType);
    expect(types).toEqual(expect.arrayContaining(['CASE_RESOLVED', 'CASE_CLOSED', 'CASE_REOPENED']));
  });

  it('asigna responsable validando la versión', async () => {
    const record = caseWith('ABIERTO');
    const person = fake.db.users[1]!;
    const assigned = await cases.assignCase(record.id, { responsibleUserId: person.id, expectedVersion: record.version, reason: 'Carga de trabajo' });
    expect(assigned.responsibleUserId).toBe(person.id);
    expect(isConflict(await rejection(cases.assignCase(record.id, { responsibleUserId: person.id, expectedVersion: record.version })))).toBe(true);
  });
});

describe('contenido del expediente', () => {
  it('registra una denuncia y la modifica con control de versión', async () => {
    const record = caseWith('ABIERTO');
    const report = await cases.createReport(record.id, { receivedAt: new Date().toISOString(), channelCode: 'DIRECTO', classificationCode: 'LEVE', factualDescription: 'Relato de prueba' });
    const edited = await cases.updateReport(record.id, report.id, { expectedVersion: report.version, classificationCode: 'GRAVE' });
    expect(edited).toMatchObject({ classificationCode: 'GRAVE', version: report.version + 1 });
    expect(isConflict(await rejection(cases.updateReport(record.id, report.id, { expectedVersion: report.version, classificationCode: 'LEVE' })))).toBe(true);
  });

  it('crea un involucrado, lo asocia una sola vez y lo desvincula', async () => {
    const record = caseWith('ABIERTO');
    const participant = await cases.createParticipant({ establishmentId: record.establishmentId, kind: 'ESTUDIANTE', referenceLabel: 'Código E-77' });
    const link = await cases.linkParticipant(record.id, { participantId: participant.id, participationCode: 'TESTIGO' });
    expect(isConflict(await rejection(cases.linkParticipant(record.id, { participantId: participant.id, participationCode: 'TESTIGO' })))).toBe(true);
    expect((await cases.listCaseParticipants(record.id)).some((l) => l.id === link.id)).toBe(true);
    await cases.unlinkParticipant(record.id, link.id);
    expect((await cases.listCaseParticipants(record.id)).some((l) => l.id === link.id)).toBe(false);
  });

  it('lleva una entrevista de borrador a finalizada y exige corrección para reabrirla', async () => {
    const record = caseWith('ABIERTO');
    const body = { occurredAt: new Date().toISOString(), modalityCode: 'presencial', summary: 'Síntesis' };
    const draft = await cases.createInterview(record.id, body);
    expect(draft).toMatchObject({ status: 'BORRADOR', modalityCode: 'PRESENCIAL' });
    const edited = await cases.updateInterview(record.id, draft.id, { ...body, summary: 'Síntesis ampliada', expectedVersion: draft.version });
    const done = await cases.finalizeInterview(record.id, draft.id, edited.version);
    expect(done.status).toBe('FINALIZADA');
    const locked = await rejection(cases.updateInterview(record.id, draft.id, { ...body, expectedVersion: done.version }));
    expect(describeError(locked)).toMatch(/requiere corrección/);
    const reopened = await cases.correctInterview(record.id, draft.id, 'Error de transcripción');
    expect(reopened.status).toBe('BORRADOR');
  });

  it('gestiona medidas, seguimientos y tareas', async () => {
    const record = caseWith('ABIERTO');
    const measure = await ops.createMeasure(record.id, { title: 'Acompañamiento', responsibleUserIds: [fake.db.users[1]!.id] });
    expect(measure.responsibles).toHaveLength(1);
    const done = await ops.updateMeasure(record.id, measure.id, { expectedVersion: measure.version, status: 'COMPLETADA' });
    expect(done).toMatchObject({ status: 'COMPLETADA' });
    expect(done.completedAt).not.toBeNull();
    expect(isConflict(await rejection(ops.updateMeasure(record.id, measure.id, { expectedVersion: measure.version, status: 'CANCELADA' })))).toBe(true);

    const follow = await ops.createFollowUp(record.id, { occurredAt: new Date().toISOString(), note: 'Se conversó con el equipo' });
    expect((await ops.listFollowUps(record.id)).some((f) => f.id === follow.id)).toBe(true);

    const task = await ops.createTask(record.id, { title: 'Llamar a la familia' });
    expect((await ops.completeTask(record.id, task.id)).status).toBe('COMPLETADA');
    expect(httpStatus(await rejection(ops.completeTask(record.id, task.id)))).toBe(404);
  });

  it('no permite registrar medidas ni documentos en un expediente cerrado', async () => {
    const closed = caseWith('CERRADO');
    const measure = await rejection(ops.createMeasure(closed.id, { title: 'Nueva medida', responsibleUserIds: [] }));
    expect(describeError(measure)).toMatch(/cerrado y debe reabrirse/);
    const file = new File(['%PDF-1.4\nprueba'], 'a.pdf', { type: 'application/pdf' });
    expect(isConflict(await rejection(ops.uploadDocument(closed.id, { kind: 'DOCUMENTO', file })))).toBe(true);
  });

  it('aplica un protocolo publicado una sola vez', async () => {
    const record = caseWith('ABIERTO');
    const [template] = await ops.listProtocols(record.establishmentId);
    const version = template!.versions[0]!;
    await ops.applyProtocol(record.id, version.id);
    expect(describeError(await rejection(ops.applyProtocol(record.id, version.id)))).toMatch(/ya está aplicado/);
  });

  it('un protocolo nuevo nace como borrador, no se lista y se publica con el identificador devuelto', async () => {
    const record = caseWith('ABIERTO');
    const created = await ops.createProtocol({ establishmentId: record.establishmentId, code: 'nuevo', name: 'Protocolo nuevo', title: 'Versión 1', content: { etapas: ['A', 'B'] } });
    expect(created.versions[0]).toMatchObject({ status: 'BORRADOR', content: { etapas: ['A', 'B'] } });
    expect((await ops.listProtocols(record.establishmentId)).some((p) => p.id === created.id && p.versions.length)).toBe(false);
    await ops.publishProtocolVersion(created.versions[0]!.id, record.establishmentId);
    expect((await ops.listProtocols(record.establishmentId)).find((p) => p.id === created.id)?.versions).toHaveLength(1);
  });
});

describe('documentos privados', () => {
  it('sube, lista y descarga como binario autorizado', async () => {
    const record = caseWith('ABIERTO');
    const file = new File(['%PDF-1.4\ncontenido de prueba'], 'informe.pdf', { type: 'application/pdf' });
    const uploaded = await ops.uploadDocument(record.id, { kind: 'EVIDENCIA', file });
    expect(uploaded).toMatchObject({ originalFilename: 'informe.pdf', kind: 'EVIDENCIA', sizeBytes: file.size });
    expect(JSON.stringify(uploaded)).not.toContain('storageKey');
    expect((await ops.listDocuments(record.id)).some((d) => d.id === uploaded.id)).toBe(true);
    const blob = await ops.downloadDocument(record.id, uploaded.id);
    expect(await blob.text()).toContain('contenido de prueba');
  });

  it('el servidor rechaza con 413 los cuerpos grandes y la interfaz lo explica', async () => {
    const record = caseWith('ABIERTO');
    const big = new File([new Uint8Array(200 * 1024)], 'grande.pdf', { type: 'application/pdf' });
    const error = await rejection(ops.uploadDocument(record.id, { kind: 'DOCUMENTO', file: big }));
    expect(httpStatus(error)).toBe(413);
    expect(describeError(error)).toMatch(/tamaño/);
  });

  it('rechaza formatos no permitidos', async () => {
    const record = caseWith('ABIERTO');
    const text = new File(['hola'], 'nota.txt', { type: 'text/plain' });
    expect(httpStatus(await rejection(ops.uploadDocument(record.id, { kind: 'DOCUMENTO', file: text })))).toBe(400);
  });
});

describe('permisos por rol (el servidor es la autoridad)', () => {
  it('un docente sin permisos globales recibe 403 en expedientes', async () => {
    boot({ roles: ['DOCENTE'] });
    const error = await rejection(cases.listCases());
    expect(httpStatus(error)).toBe(403);
    expect(describeError(error)).toBe('No tiene permisos para realizar esta acción.');
  });

  it('la dirección ve usuarios y auditoría pero no expedientes ni puede crear cuentas', async () => {
    boot({ roles: ['DIRECTOR'] });
    expect((await admin.listUsers()).total).toBeGreaterThan(0);
    expect((await admin.listAudit()).items.length).toBeGreaterThan(0);
    expect(httpStatus(await rejection(cases.listCases()))).toBe(403);
    expect(httpStatus(await rejection(admin.createUser({ email: 'x@demo.invalid', displayName: 'Persona X', roles: ['DOCENTE'] })))).toBe(403);
  });

  it('el servidor no concede SYSTEM_ADMIN al crear cuentas', async () => {
    const error = await rejection(admin.createUser({ email: 'adm@demo.invalid', displayName: 'Nueva administración', roles: ['SYSTEM_ADMIN'] }));
    expect(httpStatus(error)).toBe(403);
  });
});

describe('administración de usuarios', () => {
  it('crea una cuenta inactiva por invitación y permite reenviarla, pero no activarla a mano si es nueva', async () => {
    const created = await admin.createUser({ email: 'Nueva@Demo.invalid', displayName: 'Persona nueva', roles: ['CONVIVENCIA'] });
    expect(created).toMatchObject({ email: 'nueva@demo.invalid', isActive: false });
    await expect(admin.resendInvitation(created.id)).resolves.toBeUndefined();
    const activeUser = fake.db.users.find((u) => u.isActive && u.id !== fake.db.me.id)!;
    expect(isConflict(await rejection(admin.resendInvitation(activeUser.id)))).toBe(true);
    expect(isConflict(await rejection(admin.createUser({ email: 'nueva@demo.invalid', displayName: 'Duplicada', roles: ['DOCENTE'] })))).toBe(true);
  });

  it('filtra y busca usuarios en el servidor', async () => {
    expect((await admin.listUsers({ search: 'persona demo 02' })).items.map((u) => u.email)).toEqual(['persona2@demo.invalid']);
    expect((await admin.listUsers({ role: 'DIRECTOR' })).items.every((u) => u.roles.includes('DIRECTOR'))).toBe(true);
    expect((await admin.listUsers({ active: false })).items.every((u) => !u.isActive)).toBe(true);
  });

  it('cambia roles, activa y desactiva cuentas', async () => {
    const target = fake.db.users.find((u) => u.id !== fake.db.me.id && u.isActive)!;
    expect((await admin.assignUserRoles(target.id, ['PSICOLOGO', 'DOCENTE'])).roles).toEqual(['PSICOLOGO', 'DOCENTE']);
    expect((await admin.setUserStatus(target.id, false)).isActive).toBe(false);
    expect((await admin.setUserStatus(target.id, true)).isActive).toBe(true);
    await expect(admin.revokeUserSessions(target.id)).resolves.toBeUndefined();
    expect((await admin.listAudit({ action: 'USER_ROLES_CHANGED' })).items.length).toBeGreaterThan(0);
  });
});

describe('vistas globales', () => {
  it('reúne el contenido de los expedientes abiertos y avisa la base de los datos', async () => {
    const all = await fetchAllCases();
    expect(all).toMatchObject({ total: 14, truncated: false });
    const result = await scanCases(all, ops.listTasks);
    expect(result.rows.length).toBe(fake.db.tasks.filter((t) => fake.db.cases.some((c) => c.id === t.caseId && c.status !== 'CERRADO')).length);
    expect(result.scanned).toBe(result.eligible);
    expect(result.rows.every((row) => row.case.id === row.item.caseId)).toBe(true);
    const withClosed = await scanCases(all, ops.listTasks, { includeClosed: true });
    expect(withClosed.eligible).toBe(14);
  });

  it('propaga un 403 de permisos en lugar de mostrar datos vacíos', async () => {
    boot({ roles: ['CONVIVENCIA'] });
    fake.db.me.roles = ['CONVIVENCIA'];
    const all = await fetchAllCases();
    fake.db.me.roles = ['INSPECTOR_GENERAL'];
    expect(httpStatus(await rejection(scanCases(all, ops.listTasks)))).toBe(403);
  });

  it('marca notificaciones como leídas con confirmación del servidor', async () => {
    const [first] = (await ops.listNotifications()).filter((n) => !n.readAt);
    const read = await ops.markNotificationRead(first!.id);
    expect(read.readAt).not.toBeNull();
    expect(httpStatus(await rejection(ops.markNotificationRead(first!.id)))).toBe(404);
  });
});
