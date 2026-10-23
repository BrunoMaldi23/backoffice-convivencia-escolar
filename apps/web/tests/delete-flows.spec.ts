import { beforeEach, describe, expect, it } from 'vitest';
import { isConflict } from '../src/lib/errors';
import { createFakeApi, type FakeApiOptions } from '../src/preview/fakeApi';
import { api, resetCsrf, setUnauthorizedHandler } from '../src/services/api';
import * as cases from '../src/services/cases';
import * as ops from '../src/services/caseOperations';

/**
 * Anulaciones (se conservan con motivo) y eliminaciones definitivas (registros aún reversibles) contra el servidor simulado, con las
 * mismas reglas que la API real (`apps/api` ya las prueba con PostgreSQL). Verifican lo que la interfaz da por hecho.
 */
let fake: ReturnType<typeof createFakeApi>;
const boot = (options: FakeApiOptions = {}) => {
  fake = createFakeApi({ latencyMs: 0, ...options });
  api.defaults.adapter = fake.adapter;
  resetCsrf();
};
beforeEach(() => { boot(); setUnauthorizedHandler(null); });
const rejection = async (promise: Promise<unknown>) => { try { await promise; } catch (error) { return error; } throw new Error('Se esperaba un rechazo'); };
const openCase = () => structuredClone(fake.db.cases.find((c) => c.status === 'ABIERTO')!);
const timelineOf = async (caseId: string) => (await cases.getTimeline(caseId, 1, 100, 'all')).items;

describe('eliminación definitiva', () => {
  it('quita la denuncia del expediente y de su línea de tiempo, y exige la versión vigente', async () => {
    const target = openCase();
    const report = await cases.createReport(target.id, { receivedAt: new Date().toISOString(), channelCode: 'DIRECTO', classificationCode: 'LEVE', factualDescription: 'Denuncia eliminable' });
    expect(isConflict(await rejection(cases.deleteReport(target.id, report.id, 9)))).toBe(true);
    await cases.deleteReport(target.id, report.id, report.version);
    expect((await cases.listReports(target.id)).map((r) => r.id)).not.toContain(report.id);
    expect((await timelineOf(target.id)).some((event) => event.relatedEntityId === report.id)).toBe(false);
  });

  it('elimina documentos, seguimientos y aplicaciones de protocolo', async () => {
    const target = openCase();
    const follow = await ops.createFollowUp(target.id, { occurredAt: new Date().toISOString(), note: 'Seguimiento eliminable' });
    await ops.deleteFollowUp(target.id, follow.id, follow.version);
    expect((await ops.listFollowUps(target.id)).map((item) => item.id)).not.toContain(follow.id);

    const document = fake.db.documents.find((d) => d.caseId === target.id) ?? fake.db.documents[0]!;
    const documentCase = fake.db.cases.find((c) => c.id === document.caseId)!;
    if (documentCase.status !== 'CERRADO') {
      await ops.deleteDocument(document.caseId, document.id, document.version);
      expect((await ops.listDocuments(document.caseId)).map((d) => d.id)).not.toContain(document.id);
    }

    const version = fake.db.protocols[0]!.versions[0]!;
    const application = await ops.applyProtocol(target.id, version.id);
    await ops.deleteProtocolApplication(target.id, application.id, application.version);
    expect((await ops.listProtocolApplications(target.id)).map((item) => item.id)).not.toContain(application.id);
  });

  it('solo elimina tareas pendientes', async () => {
    const target = openCase();
    const pending = await ops.createTask(target.id, { title: 'Tarea eliminable' });
    await ops.deleteTask(target.id, pending.id, pending.version);
    expect((await ops.listTasks(target.id)).map((task) => task.id)).not.toContain(pending.id);
    const done = await ops.createTask(target.id, { title: 'Tarea completada' });
    const completed = await ops.completeTask(target.id, done.id);
    expect(isConflict(await rejection(ops.deleteTask(target.id, done.id, completed.version)))).toBe(true);
  });

  it('un expediente cerrado debe reabrirse antes de eliminar', async () => {
    const closed = structuredClone(fake.db.cases.find((c) => c.status === 'CERRADO')!);
    const report = fake.db.reports.find((r) => r.caseId === closed.id) ?? { id: crypto.randomUUID(), caseId: closed.id, establishmentId: closed.establishmentId, receivedAt: new Date().toISOString(), channelCode: 'DIRECTO', classificationCode: 'LEVE', factualDescription: 'x', background: null, createdByUserId: fake.db.me.id, version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    if (!fake.db.reports.includes(report)) fake.db.reports.push(report);
    expect(isConflict(await rejection(cases.deleteReport(closed.id, report.id, report.version)))).toBe(true);
  });
});

describe('anulación', () => {
  it('oculta el registro, exige el motivo y conserva el antecedente', async () => {
    const target = openCase();
    const report = await cases.createReport(target.id, { receivedAt: new Date().toISOString(), channelCode: 'DIRECTO', classificationCode: 'LEVE', factualDescription: 'Denuncia anulable' });
    await expect(cases.voidReport(target.id, report.id, { expectedVersion: report.version, reason: 'no' })).rejects.toBeTruthy();
    await cases.voidReport(target.id, report.id, { expectedVersion: report.version, reason: 'Registrada por error.' });
    expect((await cases.listReports(target.id)).map((r) => r.id)).not.toContain(report.id);
    expect((await timelineOf(target.id)).some((event) => event.eventType === 'REPORT_VOIDED' && event.relatedEntityId === report.id)).toBe(true);
    expect(isConflict(await rejection(cases.voidReport(target.id, report.id, { expectedVersion: report.version, reason: 'Otra vez.' })))).toBe(false);
  });
});

describe('cuerpo de las solicitudes', () => {
  // La API real rechaza con 400 los campos desconocidos: el `id` del registro va en la ruta, nunca en el cuerpo.
  it('no envía el identificador del registro ni otros campos de la mutación', async () => {
    const target = openCase();
    const task = await ops.createTask(target.id, { title: 'Tarea con edición' });
    const edited = await ops.updateTask(target.id, task.id, { id: task.id, expectedVersion: task.version, title: 'Tarea editada' } as Parameters<typeof ops.updateTask>[2]);
    expect(edited.title).toBe('Tarea editada');
    const cancelled = await ops.updateTask(target.id, task.id, { id: task.id, expectedVersion: edited.version, status: 'CANCELADA' } as Parameters<typeof ops.updateTask>[2]);
    expect(cancelled.status).toBe('CANCELADA');

    const follow = await ops.createFollowUp(target.id, { occurredAt: new Date().toISOString(), note: 'Seguimiento anulable' });
    await ops.voidFollowUp(target.id, follow.id, { id: follow.id, expectedVersion: follow.version, reason: 'Registrado por error.' } as Parameters<typeof ops.voidFollowUp>[2]);

    const report = await cases.createReport(target.id, { receivedAt: new Date().toISOString(), channelCode: 'DIRECTO', classificationCode: 'LEVE', factualDescription: 'Denuncia anulable' });
    await cases.voidReport(target.id, report.id, { id: report.id, expectedVersion: report.version, reason: 'Registrada por error.' } as Parameters<typeof cases.voidReport>[2]);

    const document = fake.db.documents.find((d) => fake.db.cases.find((c) => c.id === d.caseId)?.status !== 'CERRADO')!;
    await ops.voidDocument(document.caseId, document.id, { id: document.id, expectedVersion: document.version, reason: 'Cargado por error.' } as Parameters<typeof ops.voidDocument>[2]);

    const version = fake.db.protocols[0]!.versions[0]!;
    const application = await ops.applyProtocol(target.id, version.id);
    await ops.revokeProtocolApplication(target.id, application.id, { id: application.id, expectedVersion: application.version, reason: 'Aplicado por error.' } as Parameters<typeof ops.revokeProtocolApplication>[2]);
  });
});
