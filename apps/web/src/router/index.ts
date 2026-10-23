import { createRouter, createWebHistory, type RouteLocationRaw, type RouteRecordRaw } from 'vue-router';
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
const ADMIN: Crumb = { label: 'Administración' };

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

      { path: 'casos', name: 'cases', component: () => import('@/modules/cases/CasesListView.vue'), meta: page('Casos', [], { permission: 'cases.read' }) },
      { path: 'casos/nuevo', name: 'cases-new', component: () => import('@/modules/cases/CaseCreateView.vue'), meta: page('Nuevo caso', [CASES], { permission: 'cases.create' }) },
      { path: 'casos/:id', name: 'cases-detail', component: () => import('@/modules/cases/CaseDetailView.vue'), props: true, meta: page('Expediente', [CASES], { permission: 'cases.read' }) },

      { path: 'denuncias', name: 'complaints', component: () => import('@/modules/complaints/ComplaintsView.vue'), meta: page('Denuncias', [], { permission: 'reports.read' }) },
      { path: 'denuncias/nueva', name: 'complaints-new', component: () => import('@/modules/cases/CaseCreateView.vue'), props: { withReport: true }, meta: page('Registrar denuncia', [{ label: 'Denuncias', to: '/denuncias' }], { permission: 'reports.create' }) },
      { path: 'medidas', name: 'measures', component: () => import('@/modules/measures/MeasuresView.vue'), meta: page('Medidas de resguardo', [], { permission: 'measures.read' }) },
      { path: 'protocolos', name: 'protocols', component: () => import('@/modules/protocols/ProtocolsView.vue'), meta: page('Protocolos', [], { permission: 'protocols.read' }) },
      { path: 'seguimientos', name: 'followups', component: () => import('@/modules/followups/FollowUpsView.vue'), meta: page('Seguimientos', [], { permission: 'follow-ups.read' }) },

      { path: 'tareas', name: 'tasks', component: () => import('@/modules/tasks/TasksView.vue'), meta: page('Tareas', [], { permission: 'tasks.read' }) },
      { path: 'entrevistas', name: 'interviews', component: () => import('@/modules/interviews/InterviewsView.vue'), meta: page('Entrevistas', [], { permission: 'interviews.read' }) },
      { path: 'calendario', name: 'calendar', component: () => import('@/modules/calendar/CalendarView.vue'), meta: page('Calendario', [], { permission: 'cases.read' }) },
      { path: 'documentos', name: 'documents', component: () => import('@/modules/documents/DocumentsView.vue'), meta: page('Documentos', [], { permission: 'documents.read' }) },
      { path: 'reportes', name: 'reports', component: () => import('@/modules/reports/ReportsView.vue'), meta: page('Reportes', [], { permission: 'cases.read' }) },
      { path: 'notificaciones', name: 'notifications', component: () => import('@/modules/notifications/NotificationsView.vue'), meta: page('Notificaciones', [], { permission: 'notifications.read' }) },

      { path: 'estudiantes', name: 'students', component: () => import('@/modules/community/StudentsView.vue'), meta: page('Estudiantes', [], { permission: 'students.read' }) },
      { path: 'estudiantes/:id', name: 'students-detail', component: () => import('@/modules/community/StudentDetailView.vue'), props: true, meta: page('Ficha del estudiante', [{ label: 'Estudiantes', to: '/estudiantes' }], { permission: 'students.read' }) },
      { path: 'apoderados', name: 'guardians', component: () => import('@/modules/community/GuardiansView.vue'), meta: page('Apoderados', [], { permission: 'guardians.read' }) },
      { path: 'apoderados/:id', name: 'guardians-detail', component: () => import('@/modules/community/GuardianDetailView.vue'), props: true, meta: page('Ficha del apoderado', [{ label: 'Apoderados', to: '/apoderados' }], { permission: 'guardians.read' }) },
      { path: 'funcionarios', name: 'staff', component: () => import('@/modules/community/StaffView.vue'), meta: page('Funcionarios', [], { permission: 'staff.read' }) },
      { path: 'cursos', name: 'courses', component: () => import('@/modules/community/CoursesView.vue'), meta: page('Cursos', [], { permission: 'courses.read' }) },
      { path: 'citaciones', name: 'summons', component: () => import('@/modules/summons/SummonsView.vue'), meta: page('Citaciones', [], { permission: 'summons.read' }) },
      { path: 'derivaciones', name: 'referrals', component: () => import('@/modules/referrals/ReferralsView.vue'), meta: page('Derivaciones', [], { permission: 'referrals.read' }) },

      { path: 'administracion/usuarios', name: 'users', component: () => import('@/modules/users/UsersView.vue'), meta: page('Usuarios', [ADMIN], { permission: 'users.read' }) },
      { path: 'administracion/usuarios/:id', name: 'users-detail', component: () => import('@/modules/users/UserDetailView.vue'), props: true, meta: page('Detalle de usuario', [ADMIN, { label: 'Usuarios', to: '/administracion/usuarios' }], { permission: 'users.read' }) },
      { path: 'administracion/roles', name: 'roles', component: () => import('@/modules/roles/RolesView.vue'), meta: page('Roles y permisos', [ADMIN], { permission: 'roles.read' }) },
      { path: 'administracion/establecimientos', name: 'establishments', component: () => import('@/modules/institutions/EstablishmentsView.vue'), meta: page('Establecimientos', [ADMIN], { permission: 'institutions.read' }) },
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

router.beforeEach(async (to) => {
  // Quien ya tiene sesión no vuelve al ingreso. Si la API no responde, se muestra el formulario igualmente.
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
