import { computed, type MaybeRefOrGetter } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import * as ops from '@/services/caseOperations';
import type { CaseDocument, CaseFollowUp, CaseMeasure, CaseRecord, CaseReport, CaseTask, Interview } from '@/types/api';

/**
 * Vistas globales (tareas, medidas, seguimientos, entrevistas, denuncias, documentos y calendario).
 *
 * La API entrega un listado global por tipo y aplica la misma autorización
 * contextual que en cada expediente. Así cada vista requiere una solicitud,
 * no una solicitud por cada caso visible.
 */

/** Resumen del expediente que acompaña a un ítem global. La API no transmite el expediente completo por cada fila. */
export type ScopedCase = Pick<CaseRecord, 'id' | 'folio' | 'title' | 'status'>;
export interface ScopedRow<T> { case: ScopedCase; item: T }
export interface ScopedResult<T> {
  rows: ScopedRow<T>[];
  /** Expedientes revisados. */
  scanned: number;
  /** Expedientes que cumplían el criterio (por ejemplo, no cerrados). */
  eligible: number;
  /** Total de expedientes autorizados que informa la API. */
  totalCases: number;
  truncated: boolean;
}

export interface ScopedOptions { includeClosed?: boolean; enabled?: MaybeRefOrGetter<boolean> }

export function useScoped<T>(kind: string, options: ScopedOptions = {}) {
  const globalFetchers: Record<string, (includeClosed: boolean, options?: { signal?: AbortSignal }) => Promise<ScopedResult<unknown>>> = {
    tasks: ops.listGlobalTasks, measures: ops.listGlobalMeasures, 'follow-ups': ops.listGlobalFollowUps,
    interviews: ops.listGlobalInterviews, reports: ops.listGlobalReports, documents: ops.listGlobalDocuments
  };
  return useQuery({
    queryKey: computed(() => ['scoped', kind, Boolean(options.includeClosed)]),
    enabled: options.enabled ?? true,
    staleTime: 2 * 60_000,
    queryFn: ({ signal }) => globalFetchers[kind]!(Boolean(options.includeClosed), { signal }) as Promise<ScopedResult<T>>
  });
}

export const useScopedTasks = (options?: ScopedOptions) => useScoped<CaseTask>('tasks', options);
export const useScopedMeasures = (options?: ScopedOptions) => useScoped<CaseMeasure>('measures', options);
export const useScopedFollowUps = (options?: ScopedOptions) => useScoped<CaseFollowUp>('follow-ups', options);
export const useScopedInterviews = (options?: ScopedOptions) => useScoped<Interview>('interviews', options);
export const useScopedReports = (options?: ScopedOptions) => useScoped<CaseReport>('reports', options);
export const useScopedDocuments = (options?: ScopedOptions) => useScoped<CaseDocument>('documents', options);

/** Resumen de trabajo del inicio: una solicitud para sus módulos pesados. */
export const useDashboardWorkItems = (enabled: MaybeRefOrGetter<boolean> = true) =>
  useQuery({ queryKey: ['dashboard', 'work-items'], queryFn: ({ signal }) => ops.getDashboardWorkItems({ signal }), enabled, staleTime: 2 * 60_000 });
