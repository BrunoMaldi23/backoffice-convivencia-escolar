/**
 * Navegación lateral agrupada. `permission` indica el permiso que el backend debe declarar en la sesión
 * para mostrar el ítem; sin sesión con ese permiso, el ítem no se muestra (salvo en previsualización,
 * donde se marca como restringido).
 */
export interface NavItem { label: string; to: string; icon: string; permission?: string }
export interface NavGroup { label: string; items: NavItem[] }

export const NAVIGATION: NavGroup[] = [
  { label: 'Inicio', items: [{ label: 'Panel de inicio', to: '/', icon: 'dashboard' }] },
  {
    label: 'Convivencia escolar',
    items: [
      { label: 'Casos', to: '/casos', icon: 'folder' },
      { label: 'Denuncias', to: '/denuncias', icon: 'megaphone' },
      { label: 'Medidas de resguardo', to: '/medidas', icon: 'shield' },
      { label: 'Protocolos', to: '/protocolos', icon: 'list-checks' },
      { label: 'Seguimientos', to: '/seguimientos', icon: 'activity' }
    ]
  },
  {
    label: 'Comunidad educativa',
    items: [
      { label: 'Estudiantes', to: '/estudiantes', icon: 'student' },
      { label: 'Apoderados', to: '/apoderados', icon: 'users' },
      { label: 'Funcionarios', to: '/funcionarios', icon: 'briefcase' },
      { label: 'Cursos', to: '/cursos', icon: 'book' }
    ]
  },
  {
    label: 'Gestión',
    items: [
      { label: 'Tareas', to: '/tareas', icon: 'check-square' },
      { label: 'Entrevistas', to: '/entrevistas', icon: 'message' },
      { label: 'Citaciones', to: '/citaciones', icon: 'mail' },
      { label: 'Calendario', to: '/calendario', icon: 'calendar' },
      { label: 'Derivaciones', to: '/derivaciones', icon: 'referral' },
      { label: 'Documentos', to: '/documentos', icon: 'file' }
    ]
  },
  { label: 'Análisis', items: [{ label: 'Reportes', to: '/reportes', icon: 'chart' }] },
  {
    label: 'Administración',
    items: [
      { label: 'Usuarios', to: '/administracion/usuarios', icon: 'user', permission: 'users.read' },
      { label: 'Roles y permisos', to: '/administracion/roles', icon: 'key', permission: 'roles.read' },
      { label: 'Auditoría', to: '/administracion/auditoria', icon: 'history', permission: 'audit.read' },
      { label: 'Configuración', to: '/configuracion', icon: 'settings' }
    ]
  }
];
