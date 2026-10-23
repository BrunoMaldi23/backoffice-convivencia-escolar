/**
 * Indicios de interfaz para mostrar u ocultar opciones según los roles de la sesión.
 *
 * `GET /auth/me` solo entrega roles ("informativos", según la guía de integración): los permisos efectivos los evalúa el
 * servidor en cada solicitud y responde 403 si corresponde, además del alcance por establecimiento y expediente.
 * Esta tabla refleja la matriz inicial del seed de roles (`apps/api/src/cli/seed-roles.ts`, versión rbac_seed_v4) y solo
 * decide qué botones y menús se muestran; nunca concede acceso. Si la matriz real se modificó en la base de datos,
 * el servidor sigue siendo la autoridad. Un permiso que ningún rol conoce no se oculta.
 */
const ALL_PERMISSIONS = [
  'dashboard.read', 'users.read', 'users.create', 'users.update', 'users.disable', 'roles.read', 'roles.assign', 'audit.read', 'cases.read', 'cases.create',
  'cases.update', 'cases.assign', 'cases.transition', 'cases.close', 'cases.reopen', 'cases.timeline.read', 'institutions.read', 'institutions.manage',
  'case-grants.manage', 'reports.read', 'reports.create', 'reports.update', 'participants.read', 'participants.manage', 'interviews.read', 'interviews.create',
  'interviews.update', 'interviews.finalize', 'interviews.correct', 'documents.read', 'documents.create', 'protocols.read', 'protocols.manage', 'measures.read',
  'measures.manage', 'follow-ups.read', 'follow-ups.create', 'tasks.read', 'tasks.manage', 'notifications.read', 'courses.read', 'courses.manage', 'students.read',
  'students.manage', 'guardians.read', 'guardians.manage', 'staff.read', 'staff.manage', 'summons.read', 'summons.manage', 'referrals.read', 'referrals.manage'
] as const;

const DIRECTORY_READ = ['courses.read', 'students.read', 'guardians.read', 'staff.read'];
const CLINICAL_READ = ['dashboard.read', 'cases.read', 'cases.update', 'cases.timeline.read', 'interviews.read', 'interviews.create', 'interviews.update', 'documents.read', 'documents.create', 'measures.read', 'follow-ups.read', 'follow-ups.create', 'tasks.read', ...DIRECTORY_READ, 'summons.read', 'referrals.read', 'referrals.manage'];

export const ROLE_PERMISSION_HINTS: Record<string, readonly string[]> = {
  SYSTEM_ADMIN: ALL_PERMISSIONS,
  DIRECTOR: ['dashboard.read', 'users.read', 'roles.read', 'audit.read', ...DIRECTORY_READ],
  CONVIVENCIA: [
    'dashboard.read', 'cases.read', 'cases.create', 'cases.update', 'cases.assign', 'cases.transition', 'cases.close', 'cases.reopen', 'cases.timeline.read', 'reports.read',
    'reports.create', 'reports.update', 'participants.read', 'participants.manage', 'interviews.read', 'interviews.create', 'interviews.update', 'interviews.finalize',
    'interviews.correct', 'documents.read', 'documents.create', 'protocols.read', 'protocols.manage', 'measures.read', 'measures.manage', 'follow-ups.read',
    'follow-ups.create', 'tasks.read', 'tasks.manage', 'notifications.read', 'courses.read', 'courses.manage', 'students.read', 'students.manage', 'guardians.read', 'guardians.manage',
    'staff.read', 'staff.manage', 'summons.read', 'summons.manage', 'referrals.read', 'referrals.manage'
  ],
  PSICOLOGO: CLINICAL_READ,
  TRABAJADOR_SOCIAL: CLINICAL_READ,
  INSPECTOR_GENERAL: ['dashboard.read', 'cases.read', 'cases.create', 'cases.update', 'cases.timeline.read', ...DIRECTORY_READ, 'summons.read', 'summons.manage'],
  INSPECTOR: ['dashboard.read', 'courses.read', 'students.read'],
  DOCENTE: ['dashboard.read', 'courses.read'],
  ORIENTADOR: ['dashboard.read', 'courses.read', 'students.read'],
  AUDITOR: ['dashboard.read', 'audit.read', 'cases.timeline.read']
};

const KNOWN = new Set<string>(ALL_PERMISSIONS);

export function roleHintAllows(roles: readonly string[], permission?: string): boolean {
  if (!permission || !KNOWN.has(permission)) return true;
  return roles.some((role) => ROLE_PERMISSION_HINTS[role]?.includes(permission));
}
