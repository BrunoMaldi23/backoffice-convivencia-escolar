/**
 * Navegación lateral agrupada. `permission` indica el permiso que, según la matriz inicial de roles, habilita la opción
 * (solo orienta el menú; el servidor responde 403 si corresponde). `pending` marca módulos que todavía no tienen API: se
 * conservan en el menú con la etiqueta "Pendiente" y abren una pantalla que explica qué falta.
 */
export interface NavItem { label: string; to: string; icon: string; permission?: string; pending?: boolean }
export interface NavGroup { label: string; items: NavItem[] }

export const NAVIGATION: NavGroup[] = [
  { label: 'Inicio', items: [{ label: 'Panel de inicio', to: '/', icon: 'dashboard' }] },
  {
    label: 'Convivencia escolar',
    items: [
      { label: 'Casos', to: '/casos', icon: 'folder', permission: 'cases.read' },
      { label: 'Denuncias', to: '/denuncias', icon: 'megaphone', permission: 'reports.read' },
      { label: 'Medidas de resguardo', to: '/medidas', icon: 'shield', permission: 'measures.read' },
      { label: 'Protocolos', to: '/protocolos', icon: 'list-checks', permission: 'protocols.read' },
      { label: 'Seguimientos', to: '/seguimientos', icon: 'activity', permission: 'follow-ups.read' }
    ]
  },
  {
    label: 'Comunidad educativa',
    items: [
      { label: 'Estudiantes', to: '/estudiantes', icon: 'student', permission: 'students.read' },
      { label: 'Apoderados', to: '/apoderados', icon: 'users', permission: 'guardians.read' },
      { label: 'Funcionarios', to: '/funcionarios', icon: 'briefcase', permission: 'staff.read' },
      { label: 'Cursos', to: '/cursos', icon: 'book', permission: 'courses.read' }
    ]
  },
  {
    label: 'Gestión',
    items: [
      { label: 'Tareas', to: '/tareas', icon: 'check-square', permission: 'tasks.read' },
      { label: 'Entrevistas', to: '/entrevistas', icon: 'message', permission: 'interviews.read' },
      { label: 'Citaciones', to: '/citaciones', icon: 'mail', permission: 'summons.read' },
      { label: 'Calendario', to: '/calendario', icon: 'calendar', permission: 'cases.read' },
      { label: 'Derivaciones', to: '/derivaciones', icon: 'referral', permission: 'referrals.read' },
      { label: 'Documentos', to: '/documentos', icon: 'file', permission: 'documents.read' }
    ]
  },
  { label: 'Análisis', items: [{ label: 'Reportes', to: '/reportes', icon: 'chart', permission: 'cases.read' }] },
  {
    label: 'Administración',
    items: [
      { label: 'Usuarios', to: '/administracion/usuarios', icon: 'user', permission: 'users.read' },
      { label: 'Roles y permisos', to: '/administracion/roles', icon: 'key', permission: 'roles.read' },
      { label: 'Establecimientos', to: '/administracion/establecimientos', icon: 'building', permission: 'institutions.read' },
      { label: 'Auditoría', to: '/administracion/auditoria', icon: 'history', permission: 'audit.read' },
      { label: 'Configuración', to: '/configuracion', icon: 'settings' }
    ]
  }
];
