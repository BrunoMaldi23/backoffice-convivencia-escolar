import { createRouter, createWebHistory, START_LOCATION, type RouteLocationRaw, type RouteRecordRaw } from 'vue-router';
import { ensureSession } from '@/composables/useSession';
import { safeRedirect } from '@/lib/redirect';
import AppLayout from '@/layouts/AppLayout.vue';
import AuthLayout from '@/layouts/AuthLayout.vue';

declare module 'vue-router' {
  interface RouteMeta {
    title?: string;
    public?: boolean;
    breadcrumb?: { label: string; to?: RouteLocationRaw }[];
    permission?: string;
  }
}

type Crumb = { label: string; to?: RouteLocationRaw };
const page = (title: string, parents: Crumb[] = [], extra: Partial<RouteRecordRaw['meta']> = {}) => ({ title, breadcrumb: [...parents, { label: title }], ...extra });

const CASES: Crumb = { label: 'Casos', to: '/casos' };
const COMPLAINTS: Crumb = { label: 'Denuncias', to: '/denuncias' };
const MEASURES: Crumb = { label: 'Medidas de resguardo', to: '/medidas' };
const PROTOCOLS: Crumb = { label: 'Protocolos', to: '/protocolos' };
const FOLLOWUPS: Crumb = { label: 'Seguimientos', to: '/seguimientos' };
const TASKS: Crumb = { label: 'Tareas', to: '/tareas' };
const INTERVIEWS: Crumb = { label: 'Entrevistas', to: '/entrevistas' };
const CITATIONS: Crumb = { label: 'Citaciones', to: '/citaciones' };
const REFERRALS: Crumb = { label: 'Derivaciones', to: '/derivaciones' };
const DOCUMENTS: Crumb = { label: 'Documentos', to: '/documentos' };
const ADMIN: Crumb = { label: 'Administración' };
const USERS: Crumb = { label: 'Usuarios', to: '/administracion/usuarios' };
const ROLES: Crumb = { label: 'Roles y permisos', to: '/administracion/roles' };

/** Comunidad educativa: cuatro módulos que comparten vistas parametrizadas por entidad. */
const community = (['students', 'guardians', 'staff', 'courses'] as const).flatMap((entity) => {
  const base = { students: 'estudiantes', guardians: 'apoderados', staff: 'funcionarios', courses: 'cursos' }[entity];
  const label = { students: 'Estudiantes', guardians: 'Apoderados', staff: 'Funcionarios', courses: 'Cursos' }[entity];
  const parent: Crumb = { label, to: `/${base}` };
  return [
    { path: base, name: `${entity}`, component: () => import('@/modules/community/CommunityListView.vue'), props: { entity }, meta: page(label) },
    { path: `${base}/nuevo`, name: `${entity}-new`, component: () => import('@/modules/community/CommunityFormView.vue'), props: { entity }, meta: page('Nuevo registro', [parent]) },
    { path: `${base}/:id`, name: `${entity}-detail`, component: () => import('@/modules/community/CommunityDetailView.vue'), props: (r: { params: { id: string } }) => ({ entity, id: r.params.id }), meta: page('Detalle', [parent]) }
  ] satisfies RouteRecordRaw[];
});

/**
 * Cada pantalla pública tiene su propio padre con `AuthLayout`. Un padre común en `/` competiría con el
 * panel de inicio (también en `/`) y dejaría la raíz sin contenido.
 */
const authPage = (path: string, name: string, component: RouteRecordRaw['component'], title: string, props?: Record<string, unknown>): RouteRecordRaw => ({
  path, component: AuthLayout, meta: { public: true },
  children: [{ path: '', name, component: component!, props: props ?? false, meta: { title, public: true } }]
});

const routes: RouteRecordRaw[] = [
  authPage('/login', 'login', () => import('@/modules/auth/LoginView.vue'), 'Iniciar sesión'),
  authPage('/recuperar-contrasena', 'forgot-password', () => import('@/modules/auth/ForgotPasswordView.vue'), 'Recuperar contraseña'),
  authPage('/restablecer-contrasena', 'reset-password', () => import('@/modules/auth/SetPasswordView.vue'), 'Restablecer contraseña', { mode: 'reset' }),
  authPage('/establecer-contrasena', 'accept-invitation', () => import('@/modules/auth/SetPasswordView.vue'), 'Activar cuenta', { mode: 'invite' }),
  authPage('/sesion-expirada', 'session-expired', () => import('@/modules/auth/SessionExpiredView.vue'), 'Sesión expirada'),
  authPage('/acceso-denegado', 'forbidden', () => import('@/modules/auth/ForbiddenView.vue'), 'Acceso denegado'),
  {
    path: '/',
    component: AppLayout,
    children: [
      { path: '', name: 'dashboard', component: () => import('@/modules/dashboard/DashboardView.vue'), meta: page('Panel de inicio') },

      { path: 'casos', name: 'cases', component: () => import('@/modules/cases/CasesListView.vue'), meta: page('Casos') },
      { path: 'casos/cerrados', name: 'cases-closed', component: () => import('@/modules/cases/ClosedCasesView.vue'), meta: page('Casos cerrados', [CASES]) },
      { path: 'casos/nuevo', name: 'cases-new', component: () => import('@/modules/cases/CaseFormView.vue'), meta: page('Nuevo caso', [CASES]) },
      { path: 'casos/:id', name: 'cases-detail', component: () => import('@/modules/cases/CaseDetailView.vue'), props: true, meta: page('Expediente', [CASES]) },
      { path: 'casos/:id/editar', name: 'cases-edit', component: () => import('@/modules/cases/CaseFormView.vue'), props: true, meta: page('Editar caso', [CASES]) },

      { path: 'denuncias', name: 'complaints', component: () => import('@/modules/complaints/ComplaintsListView.vue'), meta: page('Denuncias') },
      { path: 'denuncias/nueva', name: 'complaints-new', component: () => import('@/modules/complaints/ComplaintFormView.vue'), meta: page('Nueva denuncia', [COMPLAINTS]) },
      { path: 'denuncias/:id', name: 'complaints-detail', component: () => import('@/modules/complaints/ComplaintDetailView.vue'), props: true, meta: page('Detalle de denuncia', [COMPLAINTS]) },

      { path: 'medidas', name: 'measures', component: () => import('@/modules/measures/MeasuresListView.vue'), meta: page('Medidas de resguardo') },
      { path: 'medidas/nueva', name: 'measures-new', component: () => import('@/modules/measures/MeasureFormView.vue'), meta: page('Nueva medida', [MEASURES]) },
      { path: 'medidas/:id', name: 'measures-detail', component: () => import('@/modules/measures/MeasureDetailView.vue'), props: true, meta: page('Detalle de medida', [MEASURES]) },

      { path: 'protocolos', name: 'protocols', component: () => import('@/modules/protocols/ProtocolsView.vue'), meta: page('Protocolos') },
      { path: 'protocolos/:id', name: 'protocols-detail', component: () => import('@/modules/protocols/ProtocolDetailView.vue'), props: true, meta: page('Detalle de protocolo', [PROTOCOLS]) },

      { path: 'seguimientos', name: 'followups', component: () => import('@/modules/followups/FollowUpsView.vue'), meta: page('Seguimientos') },
      { path: 'seguimientos/:id', name: 'followups-detail', component: () => import('@/modules/followups/FollowUpDetailView.vue'), props: true, meta: page('Detalle de seguimiento', [FOLLOWUPS]) },

      ...community,

      { path: 'tareas', name: 'tasks', component: () => import('@/modules/tasks/TasksView.vue'), meta: page('Tareas') },
      { path: 'tareas/nueva', name: 'tasks-new', component: () => import('@/modules/tasks/TaskFormView.vue'), meta: page('Nueva tarea', [TASKS]) },
      { path: 'tareas/:id', name: 'tasks-detail', component: () => import('@/modules/tasks/TaskDetailView.vue'), props: true, meta: page('Detalle de tarea', [TASKS]) },

      { path: 'entrevistas', name: 'interviews', component: () => import('@/modules/interviews/InterviewsListView.vue'), meta: page('Entrevistas') },
      { path: 'entrevistas/nueva', name: 'interviews-new', component: () => import('@/modules/interviews/InterviewFormView.vue'), meta: page('Nueva entrevista', [INTERVIEWS]) },
      { path: 'entrevistas/:id', name: 'interviews-detail', component: () => import('@/modules/interviews/InterviewDetailView.vue'), props: true, meta: page('Detalle de entrevista', [INTERVIEWS]) },

      { path: 'citaciones', name: 'citations', component: () => import('@/modules/citations/CitationsListView.vue'), meta: page('Citaciones') },
      { path: 'citaciones/nueva', name: 'citations-new', component: () => import('@/modules/citations/CitationFormView.vue'), meta: page('Nueva citación', [CITATIONS]) },
      { path: 'citaciones/:id', name: 'citations-detail', component: () => import('@/modules/citations/CitationDetailView.vue'), props: true, meta: page('Detalle de citación', [CITATIONS]) },

      { path: 'calendario', name: 'calendar', component: () => import('@/modules/calendar/CalendarView.vue'), meta: page('Calendario') },

      { path: 'derivaciones', name: 'referrals', component: () => import('@/modules/referrals/ReferralsListView.vue'), meta: page('Derivaciones') },
      { path: 'derivaciones/nueva', name: 'referrals-new', component: () => import('@/modules/referrals/ReferralFormView.vue'), meta: page('Nueva derivación', [REFERRALS]) },
      { path: 'derivaciones/:id', name: 'referrals-detail', component: () => import('@/modules/referrals/ReferralDetailView.vue'), props: true, meta: page('Detalle de derivación', [REFERRALS]) },

      { path: 'documentos', name: 'documents', component: () => import('@/modules/documents/DocumentsView.vue'), meta: page('Documentos') },
      { path: 'documentos/:id', name: 'documents-detail', component: () => import('@/modules/documents/DocumentDetailView.vue'), props: true, meta: page('Detalle de documento', [DOCUMENTS]) },

      { path: 'reportes', name: 'reports', component: () => import('@/modules/reports/ReportsView.vue'), meta: page('Reportes') },

      { path: 'administracion/usuarios', name: 'users', component: () => import('@/modules/users/UsersListView.vue'), meta: page('Usuarios', [ADMIN], { permission: 'users.read' }) },
      { path: 'administracion/usuarios/nuevo', name: 'users-new', component: () => import('@/modules/users/UserFormView.vue'), meta: page('Nuevo usuario', [ADMIN, USERS], { permission: 'users.create' }) },
      { path: 'administracion/usuarios/:id', name: 'users-detail', component: () => import('@/modules/users/UserDetailView.vue'), props: true, meta: page('Detalle de usuario', [ADMIN, USERS], { permission: 'users.read' }) },
      { path: 'administracion/usuarios/:id/editar', name: 'users-edit', component: () => import('@/modules/users/UserFormView.vue'), props: true, meta: page('Editar usuario', [ADMIN, USERS], { permission: 'users.update' }) },
      { path: 'administracion/roles', name: 'roles', component: () => import('@/modules/roles/RolesView.vue'), meta: page('Roles y permisos', [ADMIN], { permission: 'roles.read' }) },
      { path: 'administracion/roles/:id', name: 'roles-detail', component: () => import('@/modules/roles/RoleDetailView.vue'), props: true, meta: page('Detalle de rol', [ADMIN, ROLES], { permission: 'roles.read' }) },
      { path: 'administracion/auditoria', name: 'audit', component: () => import('@/modules/audit/AuditView.vue'), meta: page('Auditoría', [ADMIN], { permission: 'audit.read' }) },
      { path: 'configuracion', name: 'settings', component: () => import('@/modules/settings/SettingsView.vue'), meta: page('Configuración') },
      { path: 'configuracion/estado-servicio', name: 'system-status', component: () => import('@/modules/HomeView.vue'), meta: page('Estado del servicio', [{ label: 'Configuración', to: '/configuracion' }]) }
    ]
  },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/modules/NotFoundView.vue'), meta: { title: 'Página no encontrada', public: true } }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: (_to, _from, saved) => saved ?? { top: 0 }
});

router.beforeEach(async (to, from) => {
  // Previsualización: la aplicación arranca en el ingreso, igual que en producción. Desde allí un enlace
  // exclusivo del modo de desarrollo permite entrar al panel sin sesión. En producción `__UI_PREVIEW__` es el
  // literal false: este bloque se elimina y ninguna ruta privada se abre sin sesión.
  if (__UI_PREVIEW__ && from === START_LOCATION && to.path === '/') return { name: 'login' };
  if (__UI_PREVIEW__) return true;

  // Quien ya tiene sesión no vuelve a ver el ingreso. Si la API no responde, se muestra el formulario igualmente.
  if (to.name === 'login') {
    try {
      if (await ensureSession()) return safeRedirect(to.query.redirect);
    } catch {
      /* el formulario informará el problema al intentar ingresar */
    }
    return true;
  }
  if (to.meta.public) return true;

  // Rutas privadas: solo exigen sesión. Los permisos los decide el servidor (403); `meta.permission` solo orienta el menú.
  let user;
  try {
    user = await ensureSession();
  } catch {
    return { name: 'login', query: { motivo: 'servidor' } };
  }
  if (!user) return { name: 'login', query: to.fullPath === '/' ? {} : { redirect: to.fullPath } };
  return true;
});

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} | Panel de Convivencia Escolar` : 'Panel de Convivencia Escolar';
});

export default router;
