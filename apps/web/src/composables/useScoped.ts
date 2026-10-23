import { computed, type MaybeRefOrGetter } from 'vue';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { mapLimit } from '@/lib/async';
import { httpStatus } from '@/lib/errors';
import * as cases from '@/services/cases';
import * as ops from '@/services/caseOperations';
import type { CaseDocument, CaseFollowUp, CaseMeasure, CaseRecord, CaseReport, CaseTask, Interview } from '@/types/api';
import { fetchAllCases } from './useCases';

/**
 * Vistas globales (tareas, medidas, seguimientos, entrevistas, denuncias, documentos y calendario).
 *
 * La API solo entrega estos datos por expediente (`/cases/:id/...`) y no ofrece listados globales. Por eso se consultan los
 * expedientes autorizados más recientemente actualizados y, de cada uno, su contenido, con pocas llamadas simultáneas. Es una
 * composición de endpoints reales y autorizados, no una estimación; el resultado indica cuántos expedientes se revisaron
 * (`scanned` de `eligible`) para que ninguna cifra parezca más completa de lo que es. Ver docs/frontend/api-integration.md.
 */
export const SCOPE_CASE_LIMIT = 60;
const CONCURRENCY = 5;

export interface ScopedRow<T> { case: CaseRecord; item: T }
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

/** Revisa el contenido de los expedientes elegibles (los más recientes primero) con la función `fetcher`. */
export async function scanCases<T>(all: { items: CaseRecord[]; total: number; truncated: boolean }, fetcher: (caseId: string) => Promise<T[]>, options: { includeClosed?: boolean } = {}): Promise<ScopedResult<T>> {
  const eligibleCases = all.items.filter((c) => options.includeClosed || c.status !== 'CERRADO');
  const selected = eligibleCases.slice(0, SCOPE_CASE_LIMIT);
  const parts = await mapLimit(selected, CONCURRENCY, async (record) => {
    try {
      return (await fetcher(record.id)).map((item): ScopedRow<T> => ({ case: record, item }));
    } catch (error) {
      // Sin permiso sobre el recurso: se propaga para mostrarlo como acceso denegado. Un 404 aislado se omite.
      if (httpStatus(error) === 404) return [];
      throw error;
    }
  });
  return { rows: parts.flat(), scanned: selected.length, eligible: eligibleCases.length, totalCases: all.total, truncated: all.truncated || eligibleCases.length > selected.length };
}

export function useScoped<T>(kind: string, fetcher: (caseId: string) => Promise<T[]>, options: ScopedOptions = {}) {
  const client = useQueryClient();
  return useQuery({
    queryKey: computed(() => ['scoped', kind, Boolean(options.includeClosed)]),
    enabled: options.enabled ?? true,
    staleTime: 30_000,
    queryFn: async (): Promise<ScopedResult<T>> => scanCases(await client.fetchQuery({ queryKey: ['cases', 'all'], queryFn: fetchAllCases, staleTime: 30_000 }), fetcher, options)
  });
}

export const useScopedTasks = (options?: ScopedOptions) => useScoped<CaseTask>('tasks', ops.listTasks, options);
export const useScopedMeasures = (options?: ScopedOptions) => useScoped<CaseMeasure>('measures', ops.listMeasures, options);
export const useScopedFollowUps = (options?: ScopedOptions) => useScoped<CaseFollowUp>('follow-ups', ops.listFollowUps, options);
export const useScopedInterviews = (options?: ScopedOptions) => useScoped<Interview>('interviews', cases.listInterviews, options);
export const useScopedReports = (options?: ScopedOptions) => useScoped<CaseReport>('reports', cases.listReports, options);
export const useScopedDocuments = (options?: ScopedOptions) => useScoped<CaseDocument>('documents', ops.listDocuments, options);
