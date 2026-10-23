/**
 * Nombres visibles de los roles y permisos previstos. Solo traducen códigos a etiquetas:
 * no otorgan ni infieren permisos. La matriz real proviene de `GET /api/roles`.
 */
export const ROLE_LABELS: Record<string, { label: string; description: string }> = {
  SYSTEM_ADMIN: { label: 'Administración del sistema', description: 'Gestiona cuentas, roles y la configuración técnica del backoffice.' },
  DIRECTOR: { label: 'Dirección', description: 'Supervisa la convivencia escolar y revisa reportes y auditoría.' },
  CONVIVENCIA: { label: 'Encargado/a de convivencia', description: 'Coordina casos, protocolos, medidas y seguimientos.' },
  PSICOLOGO: { label: 'Psicólogo/a', description: 'Realiza entrevistas y acompañamiento psicoeducativo.' },
  TRABAJADOR_SOCIAL: { label: 'Trabajador/a social', description: 'Gestiona derivaciones y vínculo con redes externas.' },
  INSPECTOR_GENERAL: { label: 'Inspectoría general', description: 'Coordina inspectoría y citaciones de apoderados.' },
  INSPECTOR: { label: 'Inspector/a', description: 'Registra antecedentes y apoya el seguimiento diario.' },
  DOCENTE: { label: 'Docente', description: 'Informa situaciones y participa en medidas de su curso.' },
  ORIENTADOR: { label: 'Orientador/a', description: 'Acompaña procesos formativos y medidas pedagógicas.' },
  AUDITOR: { label: 'Auditoría', description: 'Consulta registros de auditoría en modo solo lectura.' }
};

export const roleLabel = (code: string) => ROLE_LABELS[code]?.label ?? code;
export const roleOptions = Object.entries(ROLE_LABELS).map(([value, r]) => ({ value, label: r.label }));

/** Etiquetas de permisos conocidos, agrupadas por área para la matriz visual. */
export const PERMISSION_GROUPS: { area: string; permissions: { code: string; label: string }[] }[] = [
  { area: 'Inicio', permissions: [{ code: 'dashboard.read', label: 'Ver panel de inicio' }] },
  { area: 'Usuarios', permissions: [
    { code: 'users.read', label: 'Ver usuarios' }, { code: 'users.create', label: 'Crear e invitar usuarios' },
    { code: 'users.update', label: 'Editar usuarios y revocar sesiones' }, { code: 'users.disable', label: 'Activar o desactivar cuentas' }
  ] },
  { area: 'Roles', permissions: [{ code: 'roles.read', label: 'Ver roles y permisos' }, { code: 'roles.assign', label: 'Asignar roles' }] },
  { area: 'Auditoría', permissions: [{ code: 'audit.read', label: 'Consultar auditoría' }] }
];
