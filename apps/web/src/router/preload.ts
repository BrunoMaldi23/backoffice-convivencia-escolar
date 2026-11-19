/**
 * Precarga bajo demanda las vistas del menú. No afecta la carga inicial: el
 * chunk se descarga sólo al enfocar o pasar por una opción que la persona está
 * a punto de abrir, reduciendo la espera del primer cambio de vista.
 */
const loaders: Record<string, () => Promise<unknown>> = {
  '/': () => import('@/modules/dashboard/DashboardView.vue'),
  '/casos': () => import('@/modules/cases/CasesListView.vue'),
  '/denuncias': () => import('@/modules/complaints/ComplaintsView.vue'),
  '/medidas': () => import('@/modules/measures/MeasuresView.vue'),
  '/protocolos': () => import('@/modules/protocols/ProtocolsView.vue'),
  '/seguimientos': () => import('@/modules/followups/FollowUpsView.vue'),
  '/tareas': () => import('@/modules/tasks/TasksView.vue'),
  '/entrevistas': () => import('@/modules/interviews/InterviewsView.vue'),
  '/citaciones': () => import('@/modules/summons/SummonsView.vue'),
  '/calendario': () => import('@/modules/calendar/CalendarView.vue'),
  '/derivaciones': () => import('@/modules/referrals/ReferralsView.vue'),
  '/documentos': () => import('@/modules/documents/DocumentsView.vue'),
  '/reportes': () => import('@/modules/reports/ReportsView.vue'),
  '/estudiantes': () => import('@/modules/community/StudentsView.vue'),
  '/apoderados': () => import('@/modules/community/GuardiansView.vue'),
  '/funcionarios': () => import('@/modules/community/StaffView.vue'),
  '/cursos': () => import('@/modules/community/CoursesView.vue'),
  '/administracion/usuarios': () => import('@/modules/users/UsersView.vue'),
  '/administracion/roles': () => import('@/modules/roles/RolesView.vue'),
  '/administracion/establecimientos': () => import('@/modules/institutions/EstablishmentsView.vue'),
  '/administracion/auditoria': () => import('@/modules/audit/AuditView.vue'),
  '/configuracion': () => import('@/modules/settings/SettingsView.vue')
};

const requested = new Set<string>();

export function preloadRoute(path: string): void {
  if (requested.has(path)) return;
  const load = loaders[path];
  if (!load) return;
  requested.add(path);
  void load().catch(() => requested.delete(path));
}
