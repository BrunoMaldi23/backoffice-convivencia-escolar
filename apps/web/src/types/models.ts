/**
 * Modelos de presentación del frontend.
 *
 * No son contratos de la API: describen lo que cada pantalla necesita mostrar. Cuando el backend publique
 * sus respuestas, los servicios las adaptarán a estos modelos (o se reemplazarán por tipos de `packages/shared`).
 */

export type Priority = 'baja' | 'media' | 'alta' | 'critica';
export type Id = string;

export interface CaseSummary { id: Id; folio: string; type: string; course: string; priority: Priority; status: string; responsible: string; createdAt: string; updatedAt: string }
export interface Complaint { id: Id; folio: string; channel: string; category: string; classification: string; status: string; assignedTo: string; receivedAt: string }
export interface Measure { id: Id; folio: string; caseFolio: string; type: string; responsible: string; priority: Priority; status: string; startDate: string; endDate: string | null }
export interface Protocol { id: Id; code: string; name: string; category: string; stages: number; activeCases: number; status: string; updatedAt: string }
export interface FollowUp { id: Id; caseFolio: string; type: string; responsible: string; scheduledAt: string; status: string }
export interface Student { id: Id; name: string; course: string; enrollment: string; status: string; activeCases: number }
export interface Guardian { id: Id; name: string; relation: string; students: number; contact: string; status: string }
export interface StaffMember { id: Id; name: string; position: string; area: string; email: string; status: string }
export interface Course { id: Id; name: string; level: string; headTeacher: string; students: number; year: number }
export interface Task { id: Id; title: string; caseFolio: string | null; responsible: string; priority: Priority; status: string; dueDate: string }
export interface Interview { id: Id; folio: string; caseFolio: string; participant: string; interviewer: string; mode: string; status: string; scheduledAt: string }
export interface Citation { id: Id; folio: string; caseFolio: string; recipient: string; channel: string; status: string; scheduledAt: string }
export interface Referral { id: Id; folio: string; caseFolio: string; institution: string; institutionType: string; responsible: string; status: string; sentAt: string }
export interface DocumentItem { id: Id; title: string; category: string; caseFolio: string | null; format: string; status: string; updatedAt: string }
export interface DocumentTemplate { id: Id; name: string; category: string; updatedAt: string }
export interface UserAccount { id: Id; displayName: string; email: string; roles: string[]; status: 'activo' | 'inactivo' | 'invitado'; createdAt: string; lastLoginAt: string | null }
export interface RoleItem { name: string; description: string; permissions: string[]; users: number }
export interface AuditEvent { id: Id; createdAt: string; actor: string; action: string; targetType: string; targetId: string; result: string; detail: string }
export interface CalendarEvent { id: Id; title: string; type: 'entrevista' | 'citacion' | 'seguimiento' | 'tarea' | 'reunion'; start: string; end: string; place: string }

export interface DashboardData {
  stats: Record<'activeCases' | 'newCases' | 'criticalCases' | 'closedCases' | 'activeProtocols' | 'pendingMeasures' | 'overdueTasks' | 'upcomingInterviews', number>;
  trend: { label: string; value: number }[];
  byType: { label: string; value: number }[];
  activity: { id: Id; text: string; at: string; kind: string }[];
  alerts: { id: Id; text: string; tone: 'warning' | 'danger' | 'info' }[];
}

/** Sesión vista por el frontend. Se completará con la respuesta real de `GET /api/auth/me`. */
export interface SessionUser { displayName: string; email: string; roles: string[]; permissions: string[] }

/** Qué modelo entrega cada recurso. Los servicios y los datos de previsualización deben respetar este mapa. */
export interface ResourceMap {
  dashboard: DashboardData; cases: CaseSummary[]; closedCases: CaseSummary[]; complaints: Complaint[]; measures: Measure[]; protocols: Protocol[];
  followUps: FollowUp[]; students: Student[]; guardians: Guardian[]; staff: StaffMember[]; courses: Course[]; tasks: Task[]; interviews: Interview[];
  citations: Citation[]; referrals: Referral[]; documents: DocumentItem[]; templates: DocumentTemplate[]; calendar: CalendarEvent[]; users: UserAccount[];
  roles: RoleItem[]; audit: AuditEvent[];
}

export type ResourceName = keyof ResourceMap;
export type ListResourceName = { [K in ResourceName]: ResourceMap[K] extends unknown[] ? K : never }[ResourceName];
export type ResourceItem<K extends ListResourceName> = ResourceMap[K] extends (infer T)[] ? T : never;
