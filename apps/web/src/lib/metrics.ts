import { priorityOf } from './status';
import type { CaseFollowUp, CaseMeasure, CaseRecord, CaseStatus, CaseSummons, CaseTask } from '@/types/api';
import { CASE_STATUSES } from '@/types/api';

/**
 * Indicadores calculados con datos reales y autorizados (la API no ofrece un endpoint de estadísticas). Cada función es pura:
 * recibe los registros ya consultados y la hora actual, y no inventa ni estima nada que no esté en los datos.
 */
/** Estados que requieren gestión activa. `RESUELTO` conserva trazabilidad y puede cerrarse, pero ya no se cuenta como trabajo en curso. */
export const CASES_IN_MANAGEMENT: readonly CaseStatus[] = ['ABIERTO', 'EN_EVALUACION', 'EN_PROCESO', 'PAUSADO'];

const time = (value: string | null | undefined) => (value ? new Date(value).getTime() : NaN);
export const isCaseInManagement = (record: CaseRecord) => CASES_IN_MANAGEMENT.includes(record.status);
const pastDue = (value: string | null | undefined, now: Date) => time(value) < now.getTime();

export interface CaseMetrics {
  total: number;
  /** Expedientes abiertos, en evaluación, en proceso o pausados. */
  inManagement: CaseRecord[];
  /** Expedientes resueltos que aún requieren cierre formal. */
  resolvedPendingClosure: CaseRecord[];
  closed: number;
  byStatus: Record<CaseStatus, number>;
  /** Activos con prioridad crítica. */
  critical: CaseRecord[];
  /** Activos con la próxima acción vencida. */
  overdueActions: CaseRecord[];
  /** Activos de prioridad alta o crítica, o con acción vencida; los más urgentes primero. */
  attention: CaseRecord[];
  /** Expedientes con cambios más recientes. */
  recent: CaseRecord[];
}

export function computeCaseMetrics(cases: CaseRecord[], now = new Date()): CaseMetrics {
  const inManagement = cases.filter(isCaseInManagement);
  const byStatus = Object.fromEntries(CASE_STATUSES.map((status) => [status, 0])) as Record<CaseStatus, number>;
  for (const record of cases) byStatus[record.status] += 1;
  const overdueActions = inManagement.filter((record) => pastDue(record.nextActionDueAt, now));
  const attention = inManagement
    .filter((record) => priorityOf(record.priority).rank >= 3 || pastDue(record.nextActionDueAt, now))
    .sort((a, b) => priorityOf(b.priority).rank - priorityOf(a.priority).rank || time(b.updatedAt) - time(a.updatedAt));
  return {
    total: cases.length, inManagement, resolvedPendingClosure: cases.filter((record) => record.status === 'RESUELTO'), closed: byStatus.CERRADO, byStatus,
    critical: inManagement.filter((record) => record.priority === 'CRITICA'), overdueActions, attention,
    recent: [...cases].sort((a, b) => time(b.updatedAt) - time(a.updatedAt)).slice(0, 6)
  };
}

/** Cantidad de expedientes recibidos por mes, en los últimos `months` meses (el actual incluido). */
export function casesByMonth(cases: CaseRecord[], now = new Date(), months = 6): { label: string; value: number }[] {
  const formatter = new Intl.DateTimeFormat('es-CL', { month: 'short' });
  const buckets = Array.from({ length: months }, (_, index) => {
    const start = new Date(now.getFullYear(), now.getMonth() - (months - 1 - index), 1);
    return { start, end: new Date(start.getFullYear(), start.getMonth() + 1, 1), label: formatter.format(start).replace('.', ''), value: 0 };
  });
  for (const record of cases) {
    const at = time(record.receivedAt);
    const bucket = buckets.find((b) => at >= b.start.getTime() && at < b.end.getTime());
    if (bucket) bucket.value += 1;
  }
  return buckets.map(({ label, value }) => ({ label, value }));
}

export const isPendingTask = (task: CaseTask) => task.status === 'PENDIENTE';
export const isOverdueTask = (task: CaseTask, now = new Date()) => isPendingTask(task) && pastDue(task.dueAt, now);
export const isPendingMeasure = (measure: CaseMeasure) => measure.status === 'PENDIENTE';
export const isOverdueMeasure = (measure: CaseMeasure, now = new Date()) => isPendingMeasure(measure) && pastDue(measure.dueAt, now);
/** Un seguimiento no tiene estado propio: la acción que deja registrada puede quedar pendiente, con o sin plazo. */
export const isPendingFollowUp = (followUp: CaseFollowUp) => Boolean(followUp.nextAction);
export const isOverdueFollowUp = (followUp: CaseFollowUp, now = new Date()) => isPendingFollowUp(followUp) && pastDue(followUp.nextActionDueAt, now);

export type DeadlineKind = 'task' | 'measure' | 'next-action' | 'follow-up' | 'summons';
export interface Deadline { id: string; kind: DeadlineKind; at: string; title: string; caseId: string; overdue: boolean }

/**
 * Plazos con fecha de todas las fuentes reales: tareas y medidas pendientes, próxima acción del expediente y próxima acción
 * registrada en seguimientos. Ordenados por fecha ascendente (los vencidos primero).
 */
export function collectDeadlines(input: { cases: CaseRecord[]; tasks: { caseId: string; item: CaseTask }[]; measures: { caseId: string; item: CaseMeasure }[]; followUps: { caseId: string; item: CaseFollowUp }[]; summons?: { caseId: string; item: CaseSummons }[] }, now = new Date()): Deadline[] {
  const result: Deadline[] = [];
  for (const record of input.cases) if (isCaseInManagement(record) && record.nextActionDueAt) result.push({ id: `case-${record.id}`, kind: 'next-action', at: record.nextActionDueAt, title: record.nextAction ?? 'Próxima acción del expediente', caseId: record.id, overdue: pastDue(record.nextActionDueAt, now) });
  for (const { caseId, item } of input.tasks) if (isPendingTask(item) && item.dueAt) result.push({ id: `task-${item.id}`, kind: 'task', at: item.dueAt, title: item.title, caseId, overdue: pastDue(item.dueAt, now) });
  for (const { caseId, item } of input.measures) if (isPendingMeasure(item) && item.dueAt) result.push({ id: `measure-${item.id}`, kind: 'measure', at: item.dueAt, title: item.title, caseId, overdue: pastDue(item.dueAt, now) });
  for (const { caseId, item } of input.followUps) if (item.nextActionDueAt) result.push({ id: `follow-up-${item.id}`, kind: 'follow-up', at: item.nextActionDueAt, title: item.nextAction ?? 'Próxima acción de seguimiento', caseId, overdue: pastDue(item.nextActionDueAt, now) });
  for (const { caseId, item } of input.summons ?? []) if (item.status === 'PROGRAMADA') result.push({ id: `summons-${item.id}`, kind: 'summons', at: item.scheduledAt, title: `Citación: ${item.recipientLabel}`, caseId, overdue: pastDue(item.scheduledAt, now) });
  return result.sort((a, b) => time(a.at) - time(b.at));
}
