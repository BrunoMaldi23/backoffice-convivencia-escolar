/**
 * API SIMULADA EN MEMORIA. Solo para el modo `dev:preview` (revisión visual) y para pruebas automáticas.
 *
 * Es un adaptador de Axios que replica el contrato real (docs/api/backend-contracts.md): cookies/CSRF, versiones y 409,
 * 403 por permisos, 404 sin alcance, reglas de la máquina de estados y límite de cuerpo del servidor. No habla con la red ni con la
 * base de datos local. Los datos son sintéticos y están rotulados como tales; no existen credenciales ni cuentas de acceso:
 * en previsualización la sesión es sintética y el inicio de sesión real no está disponible.
 * Nunca debe llegar al paquete de producción: se importa solo detrás de `__UI_PREVIEW__` (falso en `vite build`).
 */
import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import type {
  AdminUser, AppNotification, AuditEntry, CaseDocument, CaseEvent, CaseEventType, CaseFollowUp, CaseMeasure, CaseParticipantLink, CaseRecord, CaseReport, CaseStage, CaseStatus,
  CaseTask, Establishment, Interview, Participant, Permission, ProtocolTemplate, ProtocolVersion, Role
} from '@/types/api';
import { CASE_STATUSES } from '@/types/api';
import { ROLE_PERMISSION_HINTS } from '@/lib/access';

const TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  ABIERTO: ['EN_EVALUACION', 'PAUSADO'], EN_EVALUACION: ['EN_PROCESO', 'PAUSADO', 'RESUELTO'], EN_PROCESO: ['PAUSADO', 'RESUELTO'],
  PAUSADO: ['EN_EVALUACION', 'EN_PROCESO'], RESUELTO: ['CERRADO', 'EN_PROCESO'], CERRADO: ['EN_EVALUACION']
};
const CSRF = 'token-csrf-sintetico';
const BODY_LIMIT_BYTES = 100 * 1024; // límite por defecto del servidor real (Express): rechaza con 413 por encima de ~100 KB.
const uuid = () => globalThis.crypto.randomUUID();

export const PREVIEW_ME_ID = '00000000-0000-4000-8000-000000000001';

interface Req { method: string; path: string; query: Record<string, string | undefined>; body: Record<string, unknown>; csrf: string | undefined }
interface Res { status: number; data?: unknown; headers?: Record<string, string> }
type Params = [string, string, string];
type Handler = (req: Req, params: Params) => Res | Promise<Res>;

export class FakeHttpError extends Error {
  constructor(public status: number, public detail: string | string[]) { super(Array.isArray(detail) ? detail.join(', ') : detail); }
}
const fail = (status: number, message: string): never => { throw new FakeHttpError(status, message); };

export interface FakeDb {
  me: AdminUser; loggedOut: boolean; users: AdminUser[]; roles: Role[]; permissions: Permission[]; audit: AuditEntry[]; establishments: Establishment[]; stages: CaseStage[];
  cases: CaseRecord[]; events: CaseEvent[]; reports: CaseReport[]; participants: Participant[]; links: CaseParticipantLink[]; interviews: Interview[];
  documents: (CaseDocument & { caseId: string; bytes: Uint8Array })[]; protocols: ProtocolTemplate[]; applications: { id: string; caseId: string; protocolVersionId: string }[];
  measures: CaseMeasure[]; followUps: CaseFollowUp[]; tasks: CaseTask[]; notifications: AppNotification[]; caseSequence: number;
}

const ago = (days: number, hours = 0) => new Date(Date.now() - days * 86_400_000 - hours * 3_600_000).toISOString();
const ahead = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

/** Estado inicial sintético. Los nombres son marcadores ("Persona demo 02"); no representan a nadie. */
export function seedFakeDb(): FakeDb {
  const establishmentId = '10000000-0000-4000-8000-000000000001';
  const person = (n: number, roles: string[], active = true): AdminUser => ({
    id: n === 1 ? PREVIEW_ME_ID : `00000000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`, email: `persona${n}@demo.invalid`,
    displayName: n === 1 ? 'Usuario de previsualización' : `Persona demo ${String(n).padStart(2, '0')}`, isActive: active, createdAt: ago(60 - n), updatedAt: ago(10), roles
  });
  const users = [person(1, ['SYSTEM_ADMIN', 'CONVIVENCIA']), person(2, ['CONVIVENCIA']), person(3, ['PSICOLOGO']), person(4, ['DIRECTOR']), person(5, ['INSPECTOR_GENERAL'], false), person(6, ['TRABAJADOR_SOCIAL'], false)];
  const roles: Role[] = Object.entries(ROLE_PERMISSION_HINTS).map(([name, permissions], index) => ({ id: `20000000-0000-4000-8000-0000000000${String(index + 1).padStart(2, '0')}`, name, description: name, permissions: [...permissions] }));
  const permissions: Permission[] = [...new Set(Object.values(ROLE_PERMISSION_HINTS).flat())].sort().map((code, index) => ({ id: `30000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`, code, description: code }));

  const stageNames = ['Recepción', 'Indagación', 'Resolución', 'Seguimiento'];
  const stages: CaseStage[] = stageNames.map((name, index) => ({ id: `40000000-0000-4000-8000-00000000000${index + 1}`, establishmentId, code: name.slice(0, 4).toUpperCase(), name, displayOrder: index + 1, isActive: true, createdAt: ago(90), updatedAt: ago(90) }));

  const priorities = ['MEDIA', 'ALTA', 'BAJA', 'CRITICA', 'MEDIA', 'ALTA'];
  const categories = ['CONVIVENCIA', 'ACOSO', 'CIBERACOSO', 'VIOLENCIA', 'DISCRIMINACION', 'VULNERACION'];
  const statuses: CaseStatus[] = ['ABIERTO', 'EN_EVALUACION', 'EN_PROCESO', 'EN_PROCESO', 'PAUSADO', 'RESUELTO', 'CERRADO', 'EN_PROCESO', 'ABIERTO', 'EN_EVALUACION', 'CERRADO', 'EN_PROCESO', 'ABIERTO', 'RESUELTO'];
  const titles = ['Conflicto reiterado en recreos', 'Comentarios hostiles en grupo de mensajería', 'Situación de exclusión en un curso', 'Incidente en taller deportivo', 'Daño a material compartido', 'Denuncia por trato inadecuado', 'Mediación entre estudiantes', 'Agresión verbal en sala', 'Aviso sobre ausencias reiteradas', 'Conflicto entre apoderados', 'Seguimiento posterior a mediación', 'Situación en transporte escolar', 'Reporte de ciberacoso', 'Incidente en acto escolar'];
  const cases: CaseRecord[] = titles.map((title, index) => ({
    id: `50000000-0000-4000-8000-0000000000${String(index + 1).padStart(2, '0')}`, establishmentId, folio: index + 1, title: `${title} (sintético)`, initialDescription: 'Descripción de ejemplo para revisar el diseño. No corresponde a un caso real.',
    receivedAt: ago(40 - index * 2), categoryCode: categories[index % categories.length]!, priority: priorities[index % priorities.length]!, status: statuses[index]!,
    currentStageId: index % 4 === 3 ? null : stages[index % stages.length]!.id, responsibleUserId: index % 3 === 0 ? null : users[(index % 3) === 1 ? 0 : 1]!.id, createdByUserId: PREVIEW_ME_ID,
    closedAt: statuses[index] === 'CERRADO' ? ago(5) : null, closureReason: statuses[index] === 'CERRADO' ? 'Acuerdos cumplidos y seguimiento finalizado.' : null,
    nextAction: statuses[index] === 'CERRADO' ? null : 'Revisar avance con el equipo', nextActionDueAt: statuses[index] === 'CERRADO' ? null : index % 4 === 0 ? ago(2) : ahead(index % 9 + 1),
    version: 1 + (index % 3), createdAt: ago(40 - index * 2), updatedAt: ago(index % 7, index)
  }));
  const events: CaseEvent[] = cases.map((c) => ({ id: uuid(), caseId: c.id, actorUserId: PREVIEW_ME_ID, occurredAt: c.createdAt, eventType: 'CASE_CREATED', previousStatus: null, newStatus: 'ABIERTO', previousStageId: null, newStageId: c.currentStageId, correlationId: uuid(), relatedEntityType: 'CASE', relatedEntityId: c.id, metadata: null }));

  const first = cases[0]!.id; const second = cases[1]!.id;
  const participants: Participant[] = [
    { id: uuid(), establishmentId, kind: 'ESTUDIANTE', referenceLabel: 'Estudiante A (código interno E-01)', isActive: true, createdAt: ago(20), updatedAt: ago(20) },
    { id: uuid(), establishmentId, kind: 'APODERADO', referenceLabel: 'Apoderado/a de E-01', isActive: true, createdAt: ago(20), updatedAt: ago(20) }
  ];
  const links: CaseParticipantLink[] = participants.map((p, index) => ({ id: uuid(), caseId: first, participantId: p.id, participationCode: index === 0 ? 'AFECTADO' : 'OTRO', linkedByUserId: PREVIEW_ME_ID, linkedAt: ago(19), unlinkedAt: null, participant: p }));
  const reports: CaseReport[] = [{ id: uuid(), caseId: first, establishmentId, receivedAt: ago(30), channelCode: 'DIRECTO', classificationCode: 'GRAVE', factualDescription: 'Relato de ejemplo recibido por un funcionario. Texto sintético.', background: 'Antecedentes de ejemplo.', createdByUserId: PREVIEW_ME_ID, version: 1, createdAt: ago(30), updatedAt: ago(30) }];
  const interviews: Interview[] = [
    { id: uuid(), caseId: first, interviewerUserId: PREVIEW_ME_ID, occurredAt: ago(15), modalityCode: 'PRESENCIAL', summary: 'Síntesis de ejemplo de una entrevista finalizada.', restrictedNotes: 'Notas restringidas de ejemplo.', agreements: 'Acuerdos de ejemplo.', status: 'FINALIZADA', version: 3, finalizedAt: ago(15), createdAt: ago(15), updatedAt: ago(15) },
    { id: uuid(), caseId: first, interviewerUserId: PREVIEW_ME_ID, occurredAt: ago(2), modalityCode: 'VIDEOLLAMADA', summary: 'Borrador de ejemplo.', restrictedNotes: null, agreements: null, status: 'BORRADOR', version: 1, finalizedAt: null, createdAt: ago(2), updatedAt: ago(2) }
  ];
  const pdf = new TextEncoder().encode('%PDF-1.4\n% documento sintético de previsualización\n');
  const documents = [{ id: uuid(), caseId: first, kind: 'DOCUMENTO' as const, originalFilename: 'acta-ejemplo.pdf', contentType: 'application/pdf', sizeBytes: pdf.length, sha256: 'a'.repeat(64), createdAt: ago(14), uploadedByUserId: PREVIEW_ME_ID, bytes: pdf }];

  const versionId = '60000000-0000-4000-8000-000000000001';
  const protocols: ProtocolTemplate[] = [{
    id: '60000000-0000-4000-8000-0000000000a1', establishmentId, code: 'ACTUACION-BASE', name: 'Protocolo de actuación base (sintético)', isActive: true, createdAt: ago(80), updatedAt: ago(80),
    versions: [{ id: versionId, protocolTemplateId: '60000000-0000-4000-8000-0000000000a1', version: 1, title: 'Versión 1', content: { etapas: ['Recepción', 'Evaluación inicial', 'Medidas de resguardo', 'Seguimiento'] }, status: 'PUBLICADO', createdByUserId: PREVIEW_ME_ID, publishedAt: ago(80), createdAt: ago(80) }]
  }];
  const measures: CaseMeasure[] = [
    { id: uuid(), caseId: first, createdByUserId: PREVIEW_ME_ID, title: 'Acompañamiento en recreos', description: 'Medida de ejemplo.', dueAt: ago(1), status: 'PENDIENTE', version: 1, completedAt: null, createdAt: ago(18), updatedAt: ago(18), responsibles: [{ measureId: '', userId: users[1]!.id, assignedAt: ago(18) }] },
    { id: uuid(), caseId: second, createdByUserId: PREVIEW_ME_ID, title: 'Contacto con la familia', description: null, dueAt: ahead(6), status: 'PENDIENTE', version: 1, completedAt: null, createdAt: ago(8), updatedAt: ago(8), responsibles: [] },
    { id: uuid(), caseId: first, createdByUserId: PREVIEW_ME_ID, title: 'Apoyo psicosocial', description: null, dueAt: null, status: 'COMPLETADA', version: 2, completedAt: ago(3), createdAt: ago(25), updatedAt: ago(3), responsibles: [] }
  ];
  const followUps: CaseFollowUp[] = [{ id: uuid(), caseId: first, createdByUserId: PREVIEW_ME_ID, occurredAt: ago(6), note: 'Seguimiento de ejemplo: se conversó con el equipo.', nextAction: 'Nueva revisión', nextActionDueAt: ahead(3), createdAt: ago(6) }];
  const tasks: CaseTask[] = [
    { id: uuid(), caseId: first, createdByUserId: PREVIEW_ME_ID, assignedToUserId: PREVIEW_ME_ID, title: 'Preparar informe de avance', dueAt: ago(3), status: 'PENDIENTE', completedAt: null, createdAt: ago(10), updatedAt: ago(10) },
    { id: uuid(), caseId: second, createdByUserId: PREVIEW_ME_ID, assignedToUserId: null, title: 'Coordinar reunión con el curso', dueAt: ahead(2), status: 'PENDIENTE', completedAt: null, createdAt: ago(4), updatedAt: ago(4) },
    { id: uuid(), caseId: first, createdByUserId: PREVIEW_ME_ID, assignedToUserId: null, title: 'Registrar acuerdos', dueAt: ago(8), status: 'COMPLETADA', completedAt: ago(7), createdAt: ago(12), updatedAt: ago(7) }
  ];
  const notifications: AppNotification[] = [
    { id: uuid(), userId: PREVIEW_ME_ID, caseId: first, type: 'TASK_ASSIGNED', title: 'Nueva tarea asignada', body: 'Tiene una tarea asociada a un expediente.', readAt: null, createdAt: ago(0, 3) },
    { id: uuid(), userId: PREVIEW_ME_ID, caseId: second, type: 'TASK_ASSIGNED', title: 'Nueva tarea asignada', body: 'Tiene una tarea asociada a un expediente.', readAt: ago(1), createdAt: ago(2) }
  ];
  const audit: AuditEntry[] = [
    { id: uuid(), actorUserId: PREVIEW_ME_ID, action: 'AUTH_LOGIN', targetType: 'SESSION', targetId: null, metadata: { result: 'SUCCESS' }, createdAt: ago(0, 5) },
    { id: uuid(), actorUserId: PREVIEW_ME_ID, action: 'USER_CREATED', targetType: 'USER', targetId: users[1]!.id, metadata: { result: 'SUCCESS' }, createdAt: ago(1) },
    { id: uuid(), actorUserId: null, action: 'AUTH_LOGIN_FAILED', targetType: 'SESSION', targetId: null, metadata: { result: 'FAILURE' }, createdAt: ago(2) },
    { id: uuid(), actorUserId: PREVIEW_ME_ID, action: 'CASE_CREATED', targetType: 'CASE', targetId: first, metadata: { result: 'SUCCESS' }, createdAt: ago(3) }
  ];
  const establishments: Establishment[] = [{ id: establishmentId, code: 'PREVIEW', name: 'Establecimiento de previsualización', institutionalIdentifier: null, isActive: true, createdAt: ago(100), updatedAt: ago(100) }];
  return { me: users[0]!, loggedOut: false, users, roles, permissions, audit, establishments, stages, cases, events, reports, participants, links, interviews, documents, protocols, applications: [], measures, followUps, tasks, notifications, caseSequence: cases.length + 1 };
}


export interface FakeApiOptions { db?: FakeDb; roles?: string[]; /** Latencia simulada por solicitud (ms). Las pruebas usan 0. */ latencyMs?: number }

export function createFakeApi(options: FakeApiOptions = {}) {
  const db = options.db ?? seedFakeDb();
  if (options.roles) db.me.roles = options.roles;
  const granted = () => new Set(db.me.roles.flatMap((role) => ROLE_PERMISSION_HINTS[role] ?? []));
  const require = (permission: string) => { if (!granted().has(permission)) fail(403, 'Permiso insuficiente'); };
  const findCase = (id: string) => db.cases.find((c) => c.id === id) ?? fail(404, 'Expediente no disponible');
  const openCase = (id: string) => { const c = findCase(id); if (c.status === 'CERRADO') fail(409, 'El expediente está cerrado y debe reabrirse antes de registrar acciones'); return c; };
  const stamp = (record: { updatedAt: string; version?: number }) => { record.updatedAt = new Date().toISOString(); if (record.version !== undefined) record.version += 1; };
  const event = (caseId: string, eventType: CaseEventType, extra: Partial<CaseEvent> = {}) => { db.events.push({ id: uuid(), caseId, actorUserId: db.me.id, occurredAt: new Date().toISOString(), eventType, previousStatus: null, newStatus: null, previousStageId: null, newStageId: null, correlationId: uuid(), relatedEntityType: null, relatedEntityId: null, metadata: null, ...extra }); };
  const log = (action: string, targetType: string, targetId: string | null) => db.audit.unshift({ id: uuid(), actorUserId: db.me.id, action, targetType, targetId, metadata: { result: 'SUCCESS' }, createdAt: new Date().toISOString() });
  const str = (value: unknown, name: string, min = 1, max = 4000) => { if (typeof value !== 'string' || value.trim().length < min || value.length > max) fail(400, `${name} inválido`); return (value as string).trim(); };
  const optStr = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : undefined);
  const expected = (body: Req['body']) => (Number.isInteger(body.expectedVersion) && (body.expectedVersion as number) >= 1 ? (body.expectedVersion as number) : fail(400, 'expectedVersion inválido'));
  const paginate = <T,>(items: T[], q: Req['query'], fallback = 20) => { const page = Math.max(1, Number(q.page ?? 1)); const limit = Math.min(100, Math.max(1, Number(q.limit ?? fallback))); return { items: items.slice((page - 1) * limit, page * limit), total: items.length, page, limit }; };
  const userView = (u: AdminUser) => ({ ...u });

  const routes: [string, RegExp, Handler][] = [];
  const on = (method: string, pattern: string, handler: Handler) => routes.push([method, new RegExp(`^${pattern.replace(/:[a-zA-Z]+/g, '([^/]+)')}$`), handler]);
  const body = (req: Req) => req.body;

  // ── Autenticación ──
  on('POST', '/auth/login', () => fail(401, 'Credenciales inválidas'));
  on('GET', '/auth/me', () => (db.loggedOut ? fail(401, 'Unauthorized') : { status: 200, data: { user: { id: db.me.id, email: db.me.email, displayName: db.me.displayName, roles: db.me.roles } } }));
  on('GET', '/auth/csrf', () => (db.loggedOut ? fail(401, 'Unauthorized') : { status: 200, data: { token: CSRF } }));
  on('POST', '/auth/logout', () => { db.loggedOut = true; return { status: 201, data: { success: true } }; });
  on('POST', '/auth/forgot-password', () => ({ status: 201, data: { message: 'Si la cuenta existe, recibirá instrucciones por correo.' } }));
  on('POST', '/auth/reset-password', () => fail(400, 'Código inválido, vencido o ya utilizado'));
  on('POST', '/auth/accept-invitation', () => fail(400, 'Código inválido, vencido o ya utilizado'));
  on('GET', '/health', () => ({ status: 200, data: { status: 'ok', database: 'connected', timestamp: new Date().toISOString() } }));

  // ── Usuarios, roles y auditoría ──
  on('GET', '/users', (req) => {
    require('users.read');
    const q = (req.query.search ?? '').toLowerCase();
    const list = db.users.filter((u) => (!q || u.email.includes(q) || u.displayName.toLowerCase().includes(q)) && (!req.query.role || u.roles.includes(req.query.role)) && (req.query.active === undefined || String(u.isActive) === req.query.active));
    return { status: 200, data: paginate(list.map(userView), req.query) };
  });
  on('GET', '/users/:id', (_r, [id]) => { require('users.read'); return { status: 200, data: userView(db.users.find((u) => u.id === id) ?? fail(404, 'Usuario no encontrado')) }; });
  on('POST', '/users', (req) => {
    require('users.create');
    const email = str(body(req).email, 'email', 5, 254).toLowerCase(); const displayName = str(body(req).displayName, 'displayName', 2, 120);
    const roles = Array.isArray(body(req).roles) ? (body(req).roles as string[]) : fail(400, 'roles inválido');
    if (roles.includes('SYSTEM_ADMIN')) fail(403, 'No se concede SYSTEM_ADMIN al crear cuentas');
    if (db.users.some((u) => u.email === email)) fail(409, 'El correo ya está registrado');
    const created: AdminUser = { id: uuid(), email, displayName, isActive: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), roles };
    db.users.unshift(created); log('USER_CREATED', 'USER', created.id);
    return { status: 201, data: userView(created) };
  });
  on('PATCH', '/users/:id', (req, [id]) => {
    require('users.update'); const user = db.users.find((u) => u.id === id) ?? fail(404, 'Usuario no encontrado');
    if (typeof body(req).email === 'string') user.email = String(body(req).email).toLowerCase(); if (typeof body(req).displayName === 'string') user.displayName = String(body(req).displayName).trim();
    user.updatedAt = new Date().toISOString(); log('USER_UPDATED', 'USER', id); return { status: 200, data: userView(user) };
  });
  on('PATCH', '/users/:id/status', (req, [id]) => {
    require('users.disable'); const user = db.users.find((u) => u.id === id) ?? fail(404, 'Usuario no encontrado');
    if (typeof body(req).isActive !== 'boolean') fail(400, 'isActive inválido');
    if (body(req).isActive && !user.isActive && user.id !== db.me.id && user.roles.length && user.email.startsWith('pendiente')) fail(409, 'La cuenta pendiente debe aceptar su invitación');
    if (!body(req).isActive && user.roles.includes('SYSTEM_ADMIN') && db.users.filter((u) => u.isActive && u.roles.includes('SYSTEM_ADMIN')).length < 2) fail(409, 'Debe existir al menos una persona administradora activa');
    user.isActive = Boolean(body(req).isActive); log(user.isActive ? 'USER_ACTIVATED' : 'USER_DISABLED', 'USER', id); return { status: 200, data: userView(user) };
  });
  on('PATCH', '/users/:id/roles', (req, [id]) => {
    require('roles.assign'); const user = db.users.find((u) => u.id === id) ?? fail(404, 'Usuario no encontrado'); const roles = Array.isArray(body(req).roles) ? (body(req).roles as string[]) : fail(400, 'roles inválido');
    if (roles.includes('SYSTEM_ADMIN') && !user.roles.includes('SYSTEM_ADMIN') && user.id === db.me.id) fail(403, 'No puede asignarse SYSTEM_ADMIN a sí mismo');
    user.roles = roles; log('USER_ROLES_CHANGED', 'USER', id); return { status: 200, data: userView(user) };
  });
  on('POST', '/users/:id/revoke-sessions', (_r, [id]) => { require('users.update'); if (!db.users.some((u) => u.id === id)) fail(404, 'Usuario no encontrado'); log('USER_SESSIONS_REVOKED', 'USER', id); return { status: 201, data: { success: true } }; });
  on('POST', '/users/:id/resend-invitation', (_r, [id]) => {
    require('users.update'); const user = db.users.find((u) => u.id === id) ?? fail(404, 'Usuario no encontrado'); if (user.isActive) fail(409, 'La cuenta ya está activa');
    log('USER_INVITATION_SENT', 'USER', id); return { status: 201, data: { success: true } };
  });
  on('GET', '/roles', () => { require('roles.read'); return { status: 200, data: db.roles }; });
  on('GET', '/roles/:id', (_r, [id]) => { require('roles.read'); return { status: 200, data: db.roles.find((r) => r.id === id) ?? fail(404, 'Rol no encontrado') }; });
  on('GET', '/permissions', () => { require('roles.read'); return { status: 200, data: db.permissions }; });
  on('GET', '/audit', (req) => {
    require('audit.read');
    const list = db.audit.filter((a) => (!req.query.action || a.action === req.query.action) && (!req.query.targetType || a.targetType === req.query.targetType));
    return { status: 200, data: paginate(list, req.query) };
  });

  // ── Instituciones ──
  on('GET', '/establishments', () => { require('institutions.read'); return { status: 200, data: db.establishments }; });
  on('POST', '/establishments', (req) => {
    require('institutions.manage'); const code = str(body(req).code, 'code', 2, 40).toUpperCase();
    if (db.establishments.some((e) => e.code === code)) fail(409, 'Registro institucional duplicado');
    const created: Establishment = { id: uuid(), code, name: str(body(req).name, 'name', 3, 180), institutionalIdentifier: optStr(body(req).institutionalIdentifier) ?? null, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    db.establishments.push(created); log('ESTABLISHMENT_CREATED', 'ESTABLISHMENT', created.id); return { status: 201, data: created };
  });
  on('PATCH', '/establishments/:id', (req, [id]) => {
    require('institutions.manage'); const item = db.establishments.find((e) => e.id === id) ?? fail(404, 'Establecimiento no encontrado');
    if (typeof body(req).name === 'string') item.name = String(body(req).name).trim(); if ('institutionalIdentifier' in body(req)) item.institutionalIdentifier = optStr(body(req).institutionalIdentifier) ?? null;
    if (typeof body(req).isActive === 'boolean') item.isActive = Boolean(body(req).isActive); stamp(item); log('ESTABLISHMENT_UPDATED', 'ESTABLISHMENT', id); return { status: 200, data: item };
  });
  on('POST', '/establishments/:id/memberships', (req, [id]) => { require('institutions.manage'); if (!db.establishments.some((e) => e.id === id)) fail(404, 'Establecimiento no disponible'); log('ESTABLISHMENT_MEMBERSHIP_CHANGED', 'ESTABLISHMENT_MEMBERSHIP', `${id}:${String(body(req).userId)}`); return { status: 201, data: { establishmentId: id, userId: body(req).userId, isActive: Boolean(body(req).isActive), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } }; });
  on('POST', '/establishments/:id/stages', (req, [id]) => {
    require('institutions.manage'); if (!db.establishments.some((e) => e.id === id)) fail(404, 'Establecimiento no disponible');
    const stage: CaseStage = { id: uuid(), establishmentId: id, code: str(body(req).code, 'code', 2, 40).toUpperCase(), name: str(body(req).name, 'name', 2, 120), displayOrder: Number(body(req).displayOrder), isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    db.stages.push(stage); log('CASE_STAGE_CREATED', 'CASE_STAGE', stage.id); return { status: 201, data: stage };
  });
  on('PATCH', '/establishments/:id/stages/:stageId', (req, [id, stageId]) => {
    require('institutions.manage'); const stage = db.stages.find((s) => s.id === stageId && s.establishmentId === id) ?? fail(404, 'Etapa no disponible');
    if (typeof body(req).name === 'string') stage.name = String(body(req).name).trim(); if (typeof body(req).displayOrder === 'number') stage.displayOrder = body(req).displayOrder as number; if (typeof body(req).isActive === 'boolean') stage.isActive = Boolean(body(req).isActive);
    stamp(stage); log('CASE_STAGE_UPDATED', 'CASE_STAGE', stageId); return { status: 200, data: stage };
  });
  on('POST', '/cases/:id/access-grants', (req, [id]) => { require('case-grants.manage'); findCase(id); log('CASE_ACCESS_GRANTED', 'CASE', id); return { status: 201, data: { id: uuid(), caseId: id, userId: body(req).userId, accessLevel: body(req).accessLevel, grantedByUserId: db.me.id, grantedAt: new Date().toISOString(), expiresAt: optStr(body(req).expiresAt) ?? null, revokedAt: null, reason: optStr(body(req).reason) ?? null } }; });
  on('POST', '/cases/:id/access-grants/:userId/revoke', (_r, [id, userId]) => { require('case-grants.manage'); findCase(id); log('CASE_ACCESS_REVOKED', 'CASE', id); return { status: 201, data: { id: uuid(), caseId: id, userId, accessLevel: 'READ', grantedByUserId: db.me.id, grantedAt: ago(1), expiresAt: null, revokedAt: new Date().toISOString(), reason: null } }; });

  // ── Expedientes ──
  on('GET', '/cases', (req) => {
    require('cases.read'); const q = req.query;
    const list = db.cases.filter((c) => (!q.establishmentId || c.establishmentId === q.establishmentId) && (!q.status || c.status === q.status) && (!q.responsibleUserId || c.responsibleUserId === q.responsibleUserId) && (!q.priority || c.priority === q.priority) && (!q.stageId || c.currentStageId === q.stageId) && (!q.from || c.receivedAt >= q.from) && (!q.to || c.receivedAt <= q.to))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return { status: 200, data: paginate(list, q) };
  });
  on('POST', '/cases', (req) => {
    require('cases.create'); const b = body(req);
    const establishment = db.establishments.find((e) => e.id === b.establishmentId && e.isActive) ?? fail(404, 'Establecimiento no disponible');
    if (b.currentStageId && !db.stages.some((s) => s.id === b.currentStageId && s.establishmentId === establishment.id)) fail(400, 'Etapa no disponible para el establecimiento');
    const created: CaseRecord = {
      id: uuid(), establishmentId: establishment.id, folio: db.caseSequence++, title: str(b.title, 'title', 3, 180), initialDescription: optStr(b.initialDescription) ?? '', receivedAt: str(b.receivedAt, 'receivedAt', 8, 40),
      categoryCode: str(b.categoryCode, 'categoryCode', 1, 50), priority: str(b.priority, 'priority', 1, 40), status: 'ABIERTO', currentStageId: (b.currentStageId as string) ?? null, responsibleUserId: (b.responsibleUserId as string) ?? null,
      createdByUserId: db.me.id, closedAt: null, closureReason: null, nextAction: optStr(b.nextAction) ?? null, nextActionDueAt: optStr(b.nextActionDueAt) ?? null, version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    db.cases.unshift(created); event(created.id, 'CASE_CREATED', { newStatus: 'ABIERTO', newStageId: created.currentStageId }); log('CASE_CREATED', 'CASE', created.id); return { status: 201, data: created };
  });
  on('GET', '/cases/:id', (_r, [id]) => { require('cases.read'); return { status: 200, data: findCase(id) }; });
  on('PATCH', '/cases/:id', (req, [id]) => {
    require('cases.update'); const c = findCase(id); const b = body(req); const version = expected(b);
    if (c.version !== version) fail(409, 'El expediente fue modificado por otra persona');
    if (b.currentStageId && !db.stages.some((s) => s.id === b.currentStageId && s.establishmentId === c.establishmentId)) fail(400, 'Etapa no disponible para el establecimiento');
    const stageChanged = 'currentStageId' in b && b.currentStageId !== c.currentStageId;
    for (const key of ['title', 'categoryCode', 'priority', 'receivedAt', 'currentStageId', 'nextAction', 'nextActionDueAt'] as const) if (key in b) (c as unknown as Record<string, unknown>)[key] = b[key] ?? null;
    stamp(c); event(c.id, stageChanged ? 'CASE_STAGE_CHANGED' : 'CASE_UPDATED', { previousStatus: c.status, newStatus: c.status, newStageId: c.currentStageId }); log('CASE_UPDATED', 'CASE', id); return { status: 200, data: c };
  });
  on('POST', '/cases/:id/assign', (req, [id]) => {
    require('cases.assign'); const c = findCase(id); if (c.version !== expected(body(req))) fail(409, 'El expediente fue modificado por otra persona');
    if (!db.users.some((u) => u.id === body(req).responsibleUserId && u.isActive)) fail(404, 'Establecimiento no disponible');
    c.responsibleUserId = String(body(req).responsibleUserId); stamp(c); event(c.id, 'CASE_ASSIGNED', { previousStatus: c.status, newStatus: c.status }); log('CASE_ASSIGNED', 'CASE', id); return { status: 201, data: c };
  });
  on('POST', '/cases/:id/transition', (req, [id]) => {
    require('cases.transition'); const c = findCase(id); const b = body(req); const to = b.toStatus as CaseStatus;
    if (!CASE_STATUSES.includes(to)) fail(400, 'toStatus inválido'); const version = expected(b);
    if (!TRANSITIONS[c.status].includes(to)) fail(400, 'Transición de estado no permitida');
    const needsReason = to === 'PAUSADO' || to === 'RESUELTO' || c.status === 'PAUSADO' || (c.status === 'RESUELTO' && to === 'EN_PROCESO') || to === 'CERRADO' || c.status === 'CERRADO';
    if (needsReason && !optStr(b.reason)) fail(400, 'La transición requiere un motivo');
    if (to === 'CERRADO') require('cases.close'); if (c.status === 'CERRADO') require('cases.reopen');
    if (c.version !== version) fail(409, 'El expediente fue modificado por otra persona');
    const from = c.status; c.status = to; if (b.stageId) c.currentStageId = String(b.stageId); c.closedAt = to === 'CERRADO' ? new Date().toISOString() : null; c.closureReason = to === 'CERRADO' ? optStr(b.reason) ?? null : null;
    stamp(c); const type: CaseEventType = to === 'PAUSADO' ? 'CASE_PAUSED' : to === 'RESUELTO' ? 'CASE_RESOLVED' : to === 'CERRADO' ? 'CASE_CLOSED' : from === 'CERRADO' ? 'CASE_REOPENED' : from === 'PAUSADO' ? 'CASE_RESUMED' : 'CASE_TRANSITIONED';
    event(c.id, type, { previousStatus: from, newStatus: to }); log(type, 'CASE', id); return { status: 201, data: c };
  });
  on('GET', '/cases/:id/timeline', (req, [id]) => { require('cases.timeline.read'); findCase(id); return { status: 200, data: paginate(db.events.filter((e) => e.caseId === id).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt)), req.query, 50) }; });

  // ── Denuncias, involucrados y entrevistas ──
  on('GET', '/cases/:id/reports', (_r, [id]) => { require('reports.read'); findCase(id); return { status: 200, data: db.reports.filter((r) => r.caseId === id) }; });
  on('POST', '/cases/:id/reports', (req, [id]) => {
    require('reports.create'); const c = findCase(id); const b = body(req);
    const created: CaseReport = { id: uuid(), caseId: id, establishmentId: c.establishmentId, receivedAt: str(b.receivedAt, 'receivedAt', 8, 40), channelCode: str(b.channelCode, 'channelCode', 2, 40), classificationCode: str(b.classificationCode, 'classificationCode', 2, 40), factualDescription: str(b.factualDescription, 'factualDescription', 3), background: optStr(b.background) ?? null, createdByUserId: db.me.id, version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    db.reports.push(created); event(id, 'REPORT_CREATED', { relatedEntityType: 'CASE_REPORT', relatedEntityId: created.id }); return { status: 201, data: created };
  });
  on('PATCH', '/cases/:id/reports/:rid', (req, [id, rid]) => {
    require('reports.update'); findCase(id); const report = db.reports.find((r) => r.id === rid && r.caseId === id) ?? fail(404, 'Denuncia no disponible'); const b = body(req);
    if (report.version !== expected(b)) fail(409, 'La denuncia fue modificada por otra persona');
    for (const key of ['channelCode', 'classificationCode', 'factualDescription', 'background'] as const) if (key in b) (report as unknown as Record<string, unknown>)[key] = b[key] ?? null;
    stamp(report); event(id, 'REPORT_UPDATED', { relatedEntityType: 'CASE_REPORT', relatedEntityId: rid }); return { status: 200, data: report };
  });
  on('POST', '/participants', (req) => {
    require('participants.manage'); const b = body(req); if (!db.establishments.some((e) => e.id === b.establishmentId)) fail(404, 'Establecimiento no disponible');
    const created: Participant = { id: uuid(), establishmentId: String(b.establishmentId), kind: b.kind as Participant['kind'], referenceLabel: str(b.referenceLabel, 'referenceLabel', 2, 160), isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    db.participants.push(created); return { status: 201, data: created };
  });
  on('GET', '/cases/:id/participants', (_r, [id]) => { require('participants.read'); findCase(id); return { status: 200, data: db.links.filter((l) => l.caseId === id && !l.unlinkedAt) }; });
  on('POST', '/cases/:id/participants', (req, [id]) => {
    require('participants.manage'); const c = findCase(id); const participant = db.participants.find((p) => p.id === body(req).participantId && p.establishmentId === c.establishmentId) ?? fail(404, 'Involucrado no disponible');
    if (db.links.some((l) => l.caseId === id && l.participantId === participant.id && !l.unlinkedAt)) fail(409, 'El involucrado ya está asociado');
    const link: CaseParticipantLink = { id: uuid(), caseId: id, participantId: participant.id, participationCode: str(body(req).participationCode, 'participationCode', 2, 40), linkedByUserId: db.me.id, linkedAt: new Date().toISOString(), unlinkedAt: null, participant };
    db.links.push(link); event(id, 'PARTICIPANT_LINKED', { relatedEntityType: 'CASE_PARTICIPANT', relatedEntityId: link.id }); return { status: 201, data: link };
  });
  on('POST', '/cases/:id/participants/:lid/unlink', (_r, [id, lid]) => {
    require('participants.manage'); findCase(id); const link = db.links.find((l) => l.id === lid && l.caseId === id && !l.unlinkedAt) ?? fail(404, 'Asociación no disponible');
    link.unlinkedAt = new Date().toISOString(); event(id, 'PARTICIPANT_UNLINKED', { relatedEntityType: 'CASE_PARTICIPANT', relatedEntityId: lid }); return { status: 201, data: link };
  });
  on('GET', '/cases/:id/interviews', (_r, [id]) => { require('interviews.read'); findCase(id); return { status: 200, data: db.interviews.filter((i) => i.caseId === id) }; });
  on('POST', '/cases/:id/interviews', (req, [id]) => {
    require('interviews.create'); findCase(id); const b = body(req);
    const created: Interview = { id: uuid(), caseId: id, interviewerUserId: db.me.id, occurredAt: str(b.occurredAt, 'occurredAt', 8, 40), modalityCode: str(b.modalityCode, 'modalityCode', 2, 40).toUpperCase(), summary: str(b.summary, 'summary', 3), restrictedNotes: optStr(b.restrictedNotes) ?? null, agreements: optStr(b.agreements) ?? null, status: 'BORRADOR', version: 1, finalizedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    db.interviews.push(created); event(id, 'INTERVIEW_CREATED', { relatedEntityType: 'INTERVIEW', relatedEntityId: created.id }); return { status: 201, data: created };
  });
  const interviewOf = (caseId: string, id: string) => { findCase(caseId); return db.interviews.find((i) => i.id === id && i.caseId === caseId) ?? fail(404, 'Entrevista no disponible'); };
  on('PATCH', '/cases/:id/interviews/:iid', (req, [id, iid]) => {
    require('interviews.update'); const interview = interviewOf(id, iid); const b = body(req);
    if (interview.status === 'FINALIZADA') fail(409, 'La entrevista finalizada requiere corrección');
    if (interview.version !== expected(b)) fail(409, 'La entrevista fue modificada por otra persona');
    Object.assign(interview, { occurredAt: str(b.occurredAt, 'occurredAt', 8, 40), modalityCode: str(b.modalityCode, 'modalityCode', 2, 40).toUpperCase(), summary: str(b.summary, 'summary', 3), restrictedNotes: optStr(b.restrictedNotes) ?? null, agreements: optStr(b.agreements) ?? null });
    stamp(interview); return { status: 200, data: interview };
  });
  on('POST', '/cases/:id/interviews/:iid/finalize', (req, [id, iid]) => {
    require('interviews.finalize'); const interview = interviewOf(id, iid);
    if (interview.status !== 'BORRADOR' || interview.version !== expected(body(req))) fail(409, 'La entrevista no está disponible para finalizar');
    interview.status = 'FINALIZADA'; interview.finalizedAt = new Date().toISOString(); stamp(interview); event(id, 'INTERVIEW_FINALIZED', { relatedEntityType: 'INTERVIEW', relatedEntityId: iid }); return { status: 201, data: interview };
  });
  on('POST', '/cases/:id/interviews/:iid/correct', (req, [id, iid]) => {
    require('interviews.correct'); const interview = interviewOf(id, iid); if (interview.status !== 'FINALIZADA') fail(404, 'Entrevista finalizada no disponible'); str(body(req).reason, 'reason', 5, 1000);
    interview.status = 'BORRADOR'; interview.finalizedAt = null; stamp(interview); event(id, 'INTERVIEW_CORRECTED', { relatedEntityType: 'INTERVIEW', relatedEntityId: iid }); return { status: 201, data: interview };
  });

  // ── Documentos ──
  on('GET', '/cases/:id/documents', (_r, [id]) => { require('documents.read'); findCase(id); return { status: 200, data: db.documents.filter((d) => d.caseId === id).map(({ bytes: _bytes, ...meta }) => meta) }; });
  on('POST', '/cases/:id/documents', (req, [id]) => {
    require('documents.create'); findCase(id); openCase(id); const b = body(req);
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(String(b.contentType))) fail(400, 'Tipo de archivo no permitido');
    const bytes = Uint8Array.from(atob(String(b.base64Content ?? '')), (ch) => ch.charCodeAt(0));
    const created = { id: uuid(), caseId: id, kind: b.kind as CaseDocument['kind'], originalFilename: str(b.originalFilename, 'originalFilename', 1, 180), contentType: String(b.contentType), sizeBytes: bytes.length, sha256: 'b'.repeat(64), createdAt: new Date().toISOString(), uploadedByUserId: db.me.id, bytes };
    db.documents.push(created); event(id, 'DOCUMENT_UPLOADED', { relatedEntityType: 'CASE_DOCUMENT', relatedEntityId: created.id }); const { bytes: _b, ...meta } = created; return { status: 201, data: meta };
  });
  on('GET', '/cases/:id/documents/:did/download', (_r, [id, did]) => {
    require('documents.read'); findCase(id); const doc = db.documents.find((d) => d.id === did && d.caseId === id) ?? fail(404, 'Documento no disponible');
    return { status: 200, data: new Blob([doc.bytes.slice().buffer], { type: doc.contentType }) };
  });

  // ── Protocolos, medidas, seguimientos, tareas y notificaciones ──
  on('GET', '/protocols/:eid', (_r, [eid]) => { require('protocols.read'); return { status: 200, data: db.protocols.filter((p) => p.establishmentId === eid).map((p) => ({ ...p, versions: p.versions.filter((v) => v.status === 'PUBLICADO') })) }; });
  on('POST', '/protocols', (req) => {
    require('protocols.manage'); const b = body(req); let content: unknown; try { content = JSON.parse(String(b.content)); } catch { fail(400, 'content debe ser JSON'); }
    const id = uuid(); const version: ProtocolVersion = { id: uuid(), protocolTemplateId: id, version: 1, title: str(b.title, 'title', 3, 180), content, status: 'BORRADOR', createdByUserId: db.me.id, publishedAt: null, createdAt: new Date().toISOString() };
    const template: ProtocolTemplate = { id, establishmentId: String(b.establishmentId), code: str(b.code, 'code', 2, 40).toUpperCase(), name: str(b.name, 'name', 3, 180), isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), versions: [version] };
    db.protocols.push(template); log('PROTOCOL_CREATED', 'PROTOCOL_TEMPLATE', id); return { status: 201, data: template };
  });
  on('POST', '/protocols/versions/:vid/publish', (req, [vid]) => {
    require('protocols.manage'); const version = db.protocols.flatMap((p) => p.versions).find((v) => v.id === vid) ?? fail(404, 'Versión de protocolo no disponible'); if (!body(req).establishmentId) fail(400, 'establishmentId inválido');
    version.status = 'PUBLICADO'; version.publishedAt = new Date().toISOString(); log('PROTOCOL_PUBLISHED', 'PROTOCOL_VERSION', vid); return { status: 201, data: version };
  });
  on('POST', '/cases/:id/protocols/:vid', (_r, [id, vid]) => {
    require('protocols.read'); findCase(id); if (!db.protocols.some((p) => p.versions.some((v) => v.id === vid && v.status === 'PUBLICADO'))) fail(404, 'Protocolo publicado no disponible');
    if (db.applications.some((a) => a.caseId === id && a.protocolVersionId === vid)) fail(409, 'El protocolo ya está aplicado');
    const application = { id: uuid(), caseId: id, protocolVersionId: vid, appliedByUserId: db.me.id, appliedAt: new Date().toISOString() }; db.applications.push(application);
    event(id, 'PROTOCOL_APPLIED', { relatedEntityType: 'PROTOCOL_VERSION', relatedEntityId: vid }); return { status: 201, data: application };
  });
  on('GET', '/cases/:id/measures', (_r, [id]) => { require('measures.read'); findCase(id); return { status: 200, data: db.measures.filter((m) => m.caseId === id) }; });
  on('POST', '/cases/:id/measures', (req, [id]) => {
    require('measures.manage'); openCase(id); const b = body(req); if (!Array.isArray(b.responsibleUserIds)) fail(400, 'responsibleUserIds inválido');
    const measureId = uuid(); const created: CaseMeasure = { id: measureId, caseId: id, createdByUserId: db.me.id, title: str(b.title, 'title', 3, 300), description: optStr(b.description) ?? null, dueAt: optStr(b.dueAt) ?? null, status: 'PENDIENTE', version: 1, completedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), responsibles: (b.responsibleUserIds as string[]).map((userId) => ({ measureId, userId, assignedAt: new Date().toISOString() })) };
    db.measures.push(created); event(id, 'MEASURE_CREATED', { relatedEntityType: 'CASE_MEASURE', relatedEntityId: measureId }); return { status: 201, data: created };
  });
  on('POST', '/cases/:id/measures/:mid/update', (req, [id, mid]) => {
    require('measures.manage'); findCase(id); const measure = db.measures.find((m) => m.id === mid && m.caseId === id) ?? fail(404, 'Medida no disponible'); const b = body(req);
    if (measure.version !== expected(b)) fail(409, 'La medida fue modificada por otra persona');
    if (b.status) { measure.status = b.status as CaseMeasure['status']; measure.completedAt = b.status === 'COMPLETADA' ? new Date().toISOString() : null; } if ('dueAt' in b) measure.dueAt = (b.dueAt as string | null) ?? null;
    stamp(measure); event(id, 'MEASURE_UPDATED', { relatedEntityType: 'CASE_MEASURE', relatedEntityId: mid }); return { status: 201, data: measure };
  });
  on('GET', '/cases/:id/follow-ups', (_r, [id]) => { require('follow-ups.read'); findCase(id); return { status: 200, data: db.followUps.filter((f) => f.caseId === id) }; });
  on('POST', '/cases/:id/follow-ups', (req, [id]) => {
    require('follow-ups.create'); findCase(id); const b = body(req);
    const created: CaseFollowUp = { id: uuid(), caseId: id, createdByUserId: db.me.id, occurredAt: str(b.occurredAt, 'occurredAt', 8, 40), note: str(b.note, 'note', 3), nextAction: optStr(b.nextAction) ?? null, nextActionDueAt: optStr(b.nextActionDueAt) ?? null, createdAt: new Date().toISOString() };
    db.followUps.push(created); event(id, 'FOLLOW_UP_CREATED', { relatedEntityType: 'CASE_FOLLOW_UP', relatedEntityId: created.id }); return { status: 201, data: created };
  });
  on('GET', '/cases/:id/tasks', (_r, [id]) => { require('tasks.read'); findCase(id); return { status: 200, data: db.tasks.filter((t) => t.caseId === id) }; });
  on('POST', '/cases/:id/tasks', (req, [id]) => {
    require('tasks.manage'); findCase(id); const b = body(req);
    const created: CaseTask = { id: uuid(), caseId: id, createdByUserId: db.me.id, assignedToUserId: (b.assignedToUserId as string) ?? null, title: str(b.title, 'title', 3, 300), dueAt: optStr(b.dueAt) ?? null, status: 'PENDIENTE', completedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    db.tasks.push(created); event(id, 'TASK_CREATED', { relatedEntityType: 'CASE_TASK', relatedEntityId: created.id }); return { status: 201, data: created };
  });
  on('POST', '/cases/:id/tasks/:tid/complete', (_r, [id, tid]) => {
    require('tasks.manage'); findCase(id); const task = db.tasks.find((t) => t.id === tid && t.caseId === id && t.status === 'PENDIENTE') ?? fail(404, 'Tarea pendiente no disponible');
    task.status = 'COMPLETADA'; task.completedAt = new Date().toISOString(); stamp(task); event(id, 'TASK_COMPLETED', { relatedEntityType: 'CASE_TASK', relatedEntityId: tid }); return { status: 201, data: task };
  });
  on('GET', '/notifications', () => { require('notifications.read'); return { status: 200, data: [...db.notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) }; });
  on('POST', '/notifications/:nid/read', (_r, [nid]) => {
    require('notifications.read'); const n = db.notifications.find((x) => x.id === nid && !x.readAt) ?? fail(404, 'Notificación no disponible'); n.readAt = new Date().toISOString(); return { status: 201, data: n };
  });

  const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);
  const PUBLIC_WRITES = new Set(['/auth/login', '/auth/forgot-password', '/auth/reset-password', '/auth/accept-invitation']);
  const adapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
    const method = (config.method ?? 'get').toUpperCase();
    const path = (config.url ?? '').split('?')[0]!;
    const query = Object.fromEntries(Object.entries((config.params ?? {}) as Record<string, unknown>).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)]));
    const raw = typeof config.data === 'string' ? config.data : '';
    const respond = (status: number, data: unknown, headers: Record<string, string> = {}) => {
      // La API real responde con copias serializadas: se clona para que nadie comparta objetos con la base en memoria.
      const copy = data instanceof Blob || data === undefined ? data : JSON.parse(JSON.stringify(data));
      const response = { data: copy, status, statusText: '', headers, config, request: {} };
      if (status >= 400) throw new AxiosError(`Request failed with status code ${status}`, status >= 500 ? 'ERR_BAD_RESPONSE' : 'ERR_BAD_REQUEST', config, {}, response);
      return response;
    };
    await new Promise((resolve) => setTimeout(resolve, options.latencyMs ?? 120)); // latencia mínima para ver los estados de carga
    try {
      if (new TextEncoder().encode(raw).length > BODY_LIMIT_BYTES) throw new FakeHttpError(413, 'request entity too large');
      const match = routes.map(([m, regex, handler]) => (m === method ? { regex, handler, result: regex.exec(path) } : null)).find((entry) => entry?.result);
      if (!match?.result) throw new FakeHttpError(404, `Cannot ${method} ${path}`);
      const isAuthProbe = path === '/auth/me' || path === '/auth/csrf' || path === '/health' || PUBLIC_WRITES.has(path);
      if (!isAuthProbe && db.loggedOut) throw new FakeHttpError(401, 'Unauthorized');
      const csrf = (config.headers.get('X-CSRF-Token') as string | undefined) ?? undefined;
      if (!SAFE.has(method) && !PUBLIC_WRITES.has(path) && csrf !== CSRF) throw new FakeHttpError(403, 'CSRF inválido');
      let parsed: Record<string, unknown> = {};
      if (raw) { try { parsed = JSON.parse(raw) as Record<string, unknown>; } catch { throw new FakeHttpError(400, 'JSON inválido'); } }
      const result = await match.handler({ method, path, query, body: parsed, csrf }, match.result.slice(1) as unknown as Params);
      return respond(result.status, result.data, result.headers);
    } catch (error) {
      if (error instanceof AxiosError) throw error;
      if (error instanceof FakeHttpError) return respond(error.status, { message: error.detail, error: error.status === 401 ? 'Unauthorized' : error.status === 403 ? 'Forbidden' : error.status === 404 ? 'Not Found' : error.status === 409 ? 'Conflict' : 'Bad Request', statusCode: error.status });
      throw error;
    }
  };
  return { adapter, db };
}
