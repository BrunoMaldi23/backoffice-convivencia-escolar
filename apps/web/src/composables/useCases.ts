import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { keepPreviousData, useQuery } from '@tanstack/vue-query';
import * as api from '@/services/cases';
import type { CaseListFilters, CaseRecord, CreateCaseInput, TimelineMode, TransitionInput, UpdateCaseInput } from '@/types/api';
import { caseScope, useApiMutation } from './useApiMutation';

/** Límite de expedientes que se traen para calcular indicadores y vistas globales (la API pagina de 100 en 100). */
export const ALL_CASES_CAP = 300;

export function useCaseList(filters: MaybeRefOrGetter<CaseListFilters>) {
  return useQuery({ queryKey: computed(() => ['cases', 'list', toValue(filters)]), queryFn: () => api.listCases(toValue(filters)), placeholderData: keepPreviousData });
}

/** Todos los expedientes autorizados (hasta `ALL_CASES_CAP`), ordenados por última actualización. `truncated` avisa si hay más. */
export async function fetchAllCases(): Promise<{ items: CaseRecord[]; total: number; truncated: boolean }> {
  const first = await api.listCases({ page: 1, limit: 100 });
  const items = [...first.items];
  for (let page = 2; items.length < Math.min(first.total, ALL_CASES_CAP); page += 1) items.push(...(await api.listCases({ page, limit: 100 })).items);
  return { items: items.slice(0, ALL_CASES_CAP), total: first.total, truncated: first.total > ALL_CASES_CAP };
}
export const useAllCases = (enabled: MaybeRefOrGetter<boolean> = true) => useQuery({ queryKey: ['cases', 'all'], queryFn: fetchAllCases, enabled, staleTime: 60_000 });

export const useCase = (id: MaybeRefOrGetter<string>) => useQuery({ queryKey: computed(() => ['case', toValue(id), 'detail']), queryFn: () => api.getCase(toValue(id)) });
export const useTimeline = (id: MaybeRefOrGetter<string>, page: MaybeRefOrGetter<number> = 1, limit = 12, mode: MaybeRefOrGetter<TimelineMode> = 'relevant') =>
  useQuery({ queryKey: computed(() => ['case', toValue(id), 'timeline', toValue(page), limit, toValue(mode)]), queryFn: () => api.getTimeline(toValue(id), toValue(page), limit, toValue(mode)), placeholderData: keepPreviousData });

export const useCreateCase = () => useApiMutation((input: CreateCaseInput) => api.createCase(input), (created) => caseScope(created.id));
export const useUpdateCase = (caseId: string) => useApiMutation((input: UpdateCaseInput) => api.updateCase(caseId, input), () => caseScope(caseId));
export const useAssignCase = (caseId: string) => useApiMutation((input: { responsibleUserId: string; expectedVersion: number; reason?: string }) => api.assignCase(caseId, input), () => caseScope(caseId));
export const useTransitionCase = (caseId: string) => useApiMutation((input: TransitionInput) => api.transitionCase(caseId, input), () => caseScope(caseId));

/**
 * Versiones de protocolo ya aplicadas al expediente. La API no tiene un listado de aplicaciones: se deducen de los eventos
 * `PROTOCOL_APPLIED` de la línea de tiempo (cuyo `relatedEntityId` es la versión aplicada).
 */
export const useAppliedProtocolVersions = (id: MaybeRefOrGetter<string>, enabled: MaybeRefOrGetter<boolean> = true) =>
  useQuery({
    queryKey: computed(() => ['case', toValue(id), 'applied-protocols']),
    enabled,
    queryFn: async () => {
      const applied = new Set<string>();
      for (let page = 1; ; page += 1) {
        const result = await api.getTimeline(toValue(id), page, 100, 'all');
        for (const event of result.items) if (event.eventType === 'PROTOCOL_APPLIED' && event.relatedEntityId) applied.add(event.relatedEntityId);
        if (page * 100 >= result.total) return applied;
      }
    }
  });
