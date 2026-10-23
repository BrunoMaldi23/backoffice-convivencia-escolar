/**
 * DATOS SINTÉTICOS DE DEMOSTRACIÓN. Solo se cargan en modo `ui-preview`.
 *
 * No representan personas, cursos ni casos reales. Los nombres son marcadores ("Estudiante demo 07"),
 * los correos usan el dominio reservado `.invalid` y no se generan RUT ni datos de contacto reales.
 */
import type {
  AuditEvent, CalendarEvent, CaseSummary, Citation, Complaint, Course, DashboardData, DocumentItem, DocumentTemplate, FollowUp,
  Guardian, Interview, Measure, Priority, Protocol, Referral, ResourceMap, RoleItem, StaffMember, Student, Task, UserAccount
} from '@/types/models';

const DAY = 86_400_000;
const now = Date.now();
const at = (days: number, hour = 9, minute = 0) => {
  const d = new Date(now + days * DAY);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};
const pick = <T>(list: readonly T[], i: number): T => list[i % list.length]!;
const pad = (n: number, size = 3) => String(n).padStart(size, '0');
const range = (count: number) => Array.from({ length: count }, (_, i) => i);

const COURSES = ['1° Básico A', '3° Básico B', '5° Básico A', '6° Básico B', '7° Básico A', '8° Básico B', 'I Medio A', 'II Medio B', 'III Medio A', 'IV Medio A'];
const PRIORITIES: Priority[] = ['media', 'alta', 'baja', 'critica', 'media', 'alta'];
const RESPONSIBLES = ['Encargado/a de convivencia (demo)', 'Psicólogo/a (demo)', 'Inspectoría general (demo)', 'Orientador/a (demo)', 'Trabajador/a social (demo)'];
const CASE_TYPES = ['Conflicto entre pares', 'Maltrato escolar', 'Ciberacoso', 'Agresión verbal', 'Daño a la propiedad', 'Situación de vulneración'];
const folio = (prefix: string, i: number) => `${prefix}-2026-${pad(i + 1, 4)}`;

const cases: CaseSummary[] = range(18).map((i) => ({
  id: `caso-${i + 1}`, folio: folio('CC', i), type: pick(CASE_TYPES, i), course: pick(COURSES, i * 3), priority: pick(PRIORITIES, i),
  status: pick(['abierto', 'en_proceso', 'en_proceso', 'en_revision', 'abierto', 'pendiente'], i), responsible: pick(RESPONSIBLES, i),
  createdAt: at(-(i * 4 + 2)), updatedAt: at(-(i % 6), 11 + (i % 5))
}));

const closedCases: CaseSummary[] = range(9).map((i) => ({
  id: `caso-c-${i + 1}`, folio: folio('CC', i + 40), type: pick(CASE_TYPES, i + 2), course: pick(COURSES, i * 2), priority: pick(PRIORITIES, i + 2),
  status: 'cerrado', responsible: pick(RESPONSIBLES, i + 1), createdAt: at(-(i * 9 + 60)), updatedAt: at(-(i * 5 + 10))
}));

const complaints: Complaint[] = range(12).map((i) => ({
  id: `denuncia-${i + 1}`, folio: folio('DN', i), channel: pick(['Presencial', 'Correo institucional', 'Buzón interno', 'Entrevista'], i),
  category: pick(['Maltrato entre estudiantes', 'Maltrato de adulto a estudiante', 'Acoso escolar', 'Discriminación', 'Otro'], i),
  classification: pick(['Sin clasificar', 'Falta leve', 'Falta grave', 'Falta gravísima'], i), status: pick(['recibida', 'clasificada', 'en_revision', 'derivada', 'desestimada'], i),
  assignedTo: pick(RESPONSIBLES, i + 2), receivedAt: at(-(i * 3 + 1), 10)
}));

const measures: Measure[] = range(14).map((i) => ({
  id: `medida-${i + 1}`, folio: folio('MR', i), caseFolio: cases[i % cases.length]!.folio,
  type: pick(['Apoyo psicosocial', 'Adecuación de horario', 'Acompañamiento en recreos', 'Separación de espacios', 'Comunicación con apoderado'], i),
  responsible: pick(RESPONSIBLES, i), priority: pick(PRIORITIES, i + 1), status: pick(['vigente', 'pendiente', 'vigente', 'finalizada', 'vencida'], i),
  startDate: at(-(i * 2 + 3)), endDate: i % 3 === 0 ? null : at(i * 3 + 5)
}));

const protocols: Protocol[] = [
  ['PR-01', 'Actuación frente a maltrato entre estudiantes', 'Convivencia'], ['PR-02', 'Actuación frente a maltrato de adulto a estudiante', 'Convivencia'],
  ['PR-03', 'Ciberacoso y uso de redes sociales', 'Convivencia digital'], ['PR-04', 'Vulneración de derechos', 'Resguardo'],
  ['PR-05', 'Desregulación emocional y conductual', 'Bienestar'], ['PR-06', 'Accidentes escolares', 'Seguridad']
].map(([code, name, category], i) => ({
  id: `protocolo-${i + 1}`, code: code!, name: name!, category: category!, stages: 4 + (i % 3), activeCases: (i * 2) % 5,
  status: i === 5 ? 'borrador' : 'publicado', updatedAt: at(-(i * 20 + 15))
}));

const followUps: FollowUp[] = range(12).map((i) => ({
  id: `seguimiento-${i + 1}`, caseFolio: cases[i % cases.length]!.folio,
  type: pick(['Revisión de medida', 'Entrevista de seguimiento', 'Contacto con apoderado', 'Reunión de equipo'], i), responsible: pick(RESPONSIBLES, i + 3),
  scheduledAt: at(i - 4, 9 + (i % 6)), status: i < 4 ? pick(['realizada', 'realizada', 'vencida', 'realizada'], i) : 'programada'
}));

const students: Student[] = range(16).map((i) => ({
  id: `estudiante-${i + 1}`, name: `Estudiante demo ${pad(i + 1, 2)}`, course: pick(COURSES, i), enrollment: `M-${pad(i + 101)}`,
  status: i === 11 ? 'retirado' : 'matriculado', activeCases: i % 4 === 0 ? 1 : 0
}));

const guardians: Guardian[] = range(12).map((i) => ({
  id: `apoderado-${i + 1}`, name: `Apoderado/a demo ${pad(i + 1, 2)}`, relation: pick(['Madre', 'Padre', 'Abuela', 'Tutor legal', 'Tío'], i),
  students: 1 + (i % 2), contact: 'Registrado (oculto en demostración)', status: 'activo'
}));

const staff: StaffMember[] = range(10).map((i) => ({
  id: `funcionario-${i + 1}`, name: `Funcionario/a demo ${pad(i + 1, 2)}`,
  position: pick(['Docente de aula', 'Inspector/a', 'Psicólogo/a', 'Orientador/a', 'Asistente de la educación'], i),
  area: pick(['Enseñanza básica', 'Enseñanza media', 'Convivencia escolar', 'Inspectoría'], i), email: `funcionario${pad(i + 1, 2)}@demo.invalid`,
  status: i === 7 ? 'inactivo' : 'activo'
}));

const courses: Course[] = COURSES.map((name, i) => ({
  id: `curso-${i + 1}`, name, level: i < 6 ? 'Enseñanza básica' : 'Enseñanza media', headTeacher: `Docente demo ${pad(i + 1, 2)}`, students: 28 + (i % 8), year: 2026
}));

const tasks: Task[] = range(14).map((i) => ({
  id: `tarea-${i + 1}`, title: pick(['Registrar antecedentes de la entrevista', 'Citar a apoderado', 'Revisar medida de resguardo', 'Preparar informe para dirección', 'Coordinar derivación', 'Actualizar bitácora del caso'], i),
  caseFolio: i % 5 === 4 ? null : cases[i % cases.length]!.folio, responsible: pick(RESPONSIBLES, i), priority: pick(PRIORITIES, i + 2),
  status: pick(['pendiente', 'en_curso', 'completada', 'vencida', 'pendiente', 'en_curso'], i), dueDate: at(i - 3, 17)
}));

const interviews: Interview[] = range(10).map((i) => ({
  id: `entrevista-${i + 1}`, folio: folio('EN', i), caseFolio: cases[i % cases.length]!.folio,
  participant: pick(['Estudiante', 'Apoderado/a', 'Docente', 'Estudiante y apoderado/a'], i), interviewer: pick(RESPONSIBLES, i + 1),
  mode: pick(['Presencial', 'Videollamada', 'Presencial'], i), status: i < 4 ? 'realizada' : pick(['programada', 'reprogramada', 'programada'], i), scheduledAt: at(i - 4, 10 + (i % 5), 30)
}));

const citations: Citation[] = range(9).map((i) => ({
  id: `citacion-${i + 1}`, folio: folio('CT', i), caseFolio: cases[i % cases.length]!.folio, recipient: pick(['Apoderado/a', 'Apoderado/a suplente', 'Tutor/a legal'], i),
  channel: pick(['Agenda escolar', 'Correo institucional', 'Llamada telefónica'], i), status: pick(['enviada', 'confirmada', 'no_asiste', 'realizada', 'enviada'], i), scheduledAt: at(i - 2, 8 + (i % 4), 15)
}));

const referrals: Referral[] = range(8).map((i) => ({
  id: `derivacion-${i + 1}`, folio: folio('DR', i), caseFolio: cases[i % cases.length]!.folio,
  institution: pick(['Centro de salud familiar (demo)', 'Oficina local de la niñez (demo)', 'Programa de apoyo psicosocial (demo)', 'Red de salud mental (demo)'], i),
  institutionType: pick(['Salud', 'Protección', 'Psicosocial', 'Salud mental'], i), responsible: pick(RESPONSIBLES, i + 4),
  status: pick(['enviada', 'en_atencion', 'sin_respuesta', 'cerrada'], i), sentAt: at(-(i * 6 + 4))
}));

const documents: DocumentItem[] = range(12).map((i) => ({
  id: `documento-${i + 1}`, title: pick(['Acta de entrevista', 'Informe de cierre', 'Registro de medida', 'Citación a apoderado', 'Informe de derivación', 'Reglamento interno (extracto)'], i),
  category: pick(['Actas', 'Informes', 'Medidas', 'Citaciones', 'Derivaciones', 'Normativa interna'], i), caseFolio: i % 6 === 5 ? null : cases[i % cases.length]!.folio,
  format: pick(['PDF', 'PDF', 'DOCX'], i), status: pick(['publicado', 'borrador', 'publicado'], i), updatedAt: at(-(i * 2 + 1), 15)
}));

const templates: DocumentTemplate[] = [
  ['Acta de entrevista', 'Actas'], ['Citación a apoderado', 'Citaciones'], ['Registro de medida de resguardo', 'Medidas'],
  ['Informe de derivación', 'Derivaciones'], ['Informe de cierre de caso', 'Informes']
].map(([name, category], i) => ({ id: `plantilla-${i + 1}`, name: name!, category: category!, updatedAt: at(-(i * 15 + 30)) }));

const users: UserAccount[] = range(11).map((i) => ({
  id: `usuario-${i + 1}`, displayName: `Usuario demo ${pad(i + 1, 2)}`, email: `usuario${pad(i + 1, 2)}@demo.invalid`,
  roles: [pick(['CONVIVENCIA', 'DIRECTOR', 'PSICOLOGO', 'INSPECTOR', 'DOCENTE', 'ORIENTADOR', 'TRABAJADOR_SOCIAL', 'AUDITOR', 'INSPECTOR_GENERAL', 'SYSTEM_ADMIN'], i)],
  status: i === 3 ? 'inactivo' : i === 6 || i === 9 ? 'invitado' : 'activo', createdAt: at(-(i * 11 + 20)), lastLoginAt: i === 6 || i === 9 ? null : at(-(i % 4), 8 + i % 8)
}));

/** Matriz solo para previsualizar la pantalla. No define permisos reales. */
const roles: RoleItem[] = [
  ['SYSTEM_ADMIN', ['dashboard.read', 'users.read', 'users.create', 'users.update', 'users.disable', 'roles.read', 'roles.assign', 'audit.read'], 1],
  ['DIRECTOR', ['dashboard.read', 'users.read', 'roles.read', 'audit.read'], 1], ['CONVIVENCIA', ['dashboard.read'], 2], ['PSICOLOGO', ['dashboard.read'], 1],
  ['TRABAJADOR_SOCIAL', ['dashboard.read'], 1], ['INSPECTOR_GENERAL', ['dashboard.read'], 1], ['INSPECTOR', ['dashboard.read'], 1],
  ['DOCENTE', ['dashboard.read'], 1], ['ORIENTADOR', ['dashboard.read'], 1], ['AUDITOR', ['dashboard.read', 'audit.read'], 1]
].map(([name, permissions, count]) => ({ name: name as string, description: '', permissions: permissions as string[], users: count as number }));

const audit: AuditEvent[] = range(20).map((i) => {
  const [action, targetType, result] = pick([
    ['AUTH_LOGIN', 'session', 'exito'], ['AUTH_LOGIN_FAILED', 'session', 'denegado'], ['USER_CREATED', 'user', 'exito'], ['USER_ROLES_CHANGED', 'user', 'exito'],
    ['USER_DISABLED', 'user', 'exito'], ['AUTH_LOGOUT', 'session', 'exito'], ['USER_SESSIONS_REVOKED', 'user', 'exito'], ['ADMIN_ACCESS_DENIED', 'route', 'denegado']
  ] as const, i);
  return {
    id: `evento-${i + 1}`, createdAt: at(-Math.floor(i / 3), 18 - (i % 9), (i * 7) % 60), actor: i % 8 === 1 ? 'Sin sesión' : `Usuario demo ${pad((i % 5) + 1, 2)}`,
    action, targetType, targetId: `${targetType}-${pad(i + 1)}`, result, detail: 'Metadatos resumidos del evento (demostración).'
  };
});

const calendar: CalendarEvent[] = [
  ...interviews.map((e) => ({ id: e.id, title: `Entrevista ${e.caseFolio}`, type: 'entrevista' as const, start: e.scheduledAt, end: e.scheduledAt, place: 'Oficina de convivencia' })),
  ...citations.map((c) => ({ id: c.id, title: `Citación ${c.caseFolio}`, type: 'citacion' as const, start: c.scheduledAt, end: c.scheduledAt, place: 'Inspectoría' })),
  ...followUps.slice(4).map((f) => ({ id: f.id, title: f.type, type: 'seguimiento' as const, start: f.scheduledAt, end: f.scheduledAt, place: 'Oficina de convivencia' })),
  { id: 'reunion-1', title: 'Reunión del equipo de convivencia', type: 'reunion', start: at(2, 15), end: at(2, 16, 30), place: 'Sala de reuniones' }
];

const MONTHS = ['may', 'jun', 'jul', 'ago', 'sep', 'oct'];
const dashboard: DashboardData = {
  stats: { activeCases: 18, newCases: 5, criticalCases: 3, closedCases: 9, activeProtocols: 7, pendingMeasures: 4, overdueTasks: 2, upcomingInterviews: 6 },
  trend: MONTHS.map((label, i) => ({ label, value: [6, 9, 7, 12, 10, 8][i]! })),
  byType: CASE_TYPES.map((label, i) => ({ label, value: [7, 4, 3, 2, 1, 1][i]! })),
  activity: [
    { id: 'a1', text: `Se registró un seguimiento en ${cases[0]!.folio}`, at: at(0, 10, 12), kind: 'seguimiento' },
    { id: 'a2', text: `Se actualizó la medida ${measures[1]!.folio}`, at: at(0, 9, 3), kind: 'medida' },
    { id: 'a3', text: `Se ingresó la denuncia ${complaints[0]!.folio}`, at: at(-1, 16, 40), kind: 'denuncia' },
    { id: 'a4', text: `Se cerró el caso ${closedCases[0]!.folio}`, at: at(-1, 12, 5), kind: 'caso' },
    { id: 'a5', text: `Se programó una entrevista para ${cases[2]!.folio}`, at: at(-2, 11, 30), kind: 'entrevista' }
  ],
  alerts: [
    { id: 'al1', text: '2 tareas vencidas requieren reasignación o cierre.', tone: 'danger' },
    { id: 'al2', text: `La medida ${measures[4]!.folio} venció sin registro de evaluación.`, tone: 'warning' },
    { id: 'al3', text: '1 derivación sin respuesta de la institución receptora.', tone: 'info' }
  ]
};
export const demo: ResourceMap = {
  dashboard, cases, closedCases, complaints, measures, protocols, followUps, students, guardians, staff, courses, tasks,
  interviews, citations, referrals, documents, templates, calendar, users, roles, audit
};
