/**
 * Nombres visibles de los roles y permisos. Solo traducen códigos a etiquetas: no otorgan ni infieren permisos.
 * La matriz real proviene de `GET /api/roles` (requiere `roles.read`).
 */
export const ROLE_LABELS: Record<string, { label: string; description: string }> = {
  SYSTEM_ADMIN: { label: 'Administración del sistema', description: 'Gestiona cuentas, roles, instituciones y la configuración técnica del backoffice.' },
  DIRECTOR: { label: 'Dirección', description: 'Supervisa la convivencia escolar y revisa cuentas, roles y auditoría.' },
  CONVIVENCIA: { label: 'Encargado/a de convivencia', description: 'Coordina casos, protocolos, medidas y seguimientos.' },
  PSICOLOGO: { label: 'Psicólogo/a', description: 'Realiza entrevistas y acompañamiento psicoeducativo.' },
  TRABAJADOR_SOCIAL: { label: 'Trabajador/a social', description: 'Gestiona entrevistas y vínculo con redes externas.' },
  INSPECTOR_GENERAL: { label: 'Inspectoría general', description: 'Crea y actualiza casos y coordina inspectoría.' },
  INSPECTOR: { label: 'Inspector/a', description: 'Apoya el seguimiento diario con accesos concedidos por caso.' },
  DOCENTE: { label: 'Docente', description: 'Participa en medidas de su curso con accesos concedidos por caso.' },
  ORIENTADOR: { label: 'Orientador/a', description: 'Acompaña procesos formativos con accesos concedidos por caso.' },
  AUDITOR: { label: 'Auditoría', description: 'Consulta registros de auditoría y líneas de tiempo en modo solo lectura.' }
};

export const roleLabel = (code: string) => ROLE_LABELS[code]?.label ?? code;
export const roleOptions = Object.entries(ROLE_LABELS).map(([value, r]) => ({ value, label: r.label }));
/** Roles que se pueden asignar al crear una cuenta (la API no permite crear cuentas con SYSTEM_ADMIN). */
export const creatableRoleOptions = roleOptions.filter((o) => o.value !== 'SYSTEM_ADMIN');

/** Etiquetas de los permisos del backend, agrupadas por área para la matriz y el detalle de roles. */
export const PERMISSION_GROUPS: { area: string; permissions: { code: string; label: string }[] }[] = [
  { area: 'Inicio', permissions: [{ code: 'dashboard.read', label: 'Ver panel de inicio' }] },
  { area: 'Usuarios', permissions: [
    { code: 'users.read', label: 'Ver usuarios' }, { code: 'users.create', label: 'Crear e invitar usuarios' }, { code: 'users.update', label: 'Editar usuarios, revocar sesiones y reenviar invitaciones' }, { code: 'users.disable', label: 'Activar o desactivar cuentas' }
  ] },
  { area: 'Roles', permissions: [{ code: 'roles.read', label: 'Ver roles y permisos' }, { code: 'roles.assign', label: 'Asignar roles' }] },
  { area: 'Auditoría', permissions: [{ code: 'audit.read', label: 'Consultar auditoría' }] },
  { area: 'Instituciones', permissions: [{ code: 'institutions.read', label: 'Ver establecimientos' }, { code: 'institutions.manage', label: 'Administrar establecimientos, membresías y etapas' }, { code: 'case-grants.manage', label: 'Conceder y revocar accesos a expedientes' }] },
  { area: 'Expedientes', permissions: [
    { code: 'cases.read', label: 'Ver expedientes' }, { code: 'cases.create', label: 'Crear expedientes' }, { code: 'cases.update', label: 'Editar expedientes' }, { code: 'cases.assign', label: 'Asignar responsable' },
    { code: 'cases.transition', label: 'Cambiar el estado' }, { code: 'cases.close', label: 'Cerrar expedientes' }, { code: 'cases.reopen', label: 'Reabrir expedientes' }, { code: 'cases.timeline.read', label: 'Ver la línea de tiempo' }
  ] },
  { area: 'Denuncias e involucrados', permissions: [
    { code: 'reports.read', label: 'Ver denuncias' }, { code: 'reports.create', label: 'Registrar denuncias' }, { code: 'reports.update', label: 'Modificar denuncias' },
    { code: 'participants.read', label: 'Ver involucrados' }, { code: 'participants.manage', label: 'Gestionar involucrados' }
  ] },
  { area: 'Entrevistas', permissions: [
    { code: 'interviews.read', label: 'Ver entrevistas' }, { code: 'interviews.create', label: 'Registrar entrevistas' }, { code: 'interviews.update', label: 'Editar borradores' }, { code: 'interviews.finalize', label: 'Finalizar entrevistas' }, { code: 'interviews.correct', label: 'Corregir entrevistas finalizadas' }
  ] },
  { area: 'Documentos', permissions: [{ code: 'documents.read', label: 'Ver y descargar documentos' }, { code: 'documents.create', label: 'Cargar documentos y evidencias' }] },
  { area: 'Protocolos y medidas', permissions: [
    { code: 'protocols.read', label: 'Ver y aplicar protocolos' }, { code: 'protocols.manage', label: 'Administrar y publicar protocolos' }, { code: 'measures.read', label: 'Ver medidas' }, { code: 'measures.manage', label: 'Gestionar medidas' }
  ] },
  { area: 'Seguimientos, tareas y avisos', permissions: [
    { code: 'follow-ups.read', label: 'Ver seguimientos' }, { code: 'follow-ups.create', label: 'Registrar seguimientos' }, { code: 'tasks.read', label: 'Ver tareas' }, { code: 'tasks.manage', label: 'Gestionar tareas' }, { code: 'notifications.read', label: 'Recibir notificaciones' }
  ] }
];

const KNOWN_PERMISSIONS = new Set(PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.code)));
export const isKnownPermission = (code: string) => KNOWN_PERMISSIONS.has(code);
