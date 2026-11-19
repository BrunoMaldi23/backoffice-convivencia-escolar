import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { keepPreviousData, useQuery } from '@tanstack/vue-query';
import * as api from '@/services/cases';
import type { CaseListFilters, CaseRecord, CreateCaseInput, TimelineMode, TransitionInput, UpdateCaseInput } from '@/types/api';
import { caseScope, useApiMutation } from './useApiMutation';

/**
 * El panel y calendario requieren una visión reciente, no descargar todo el
 * historial al abrirlos. El límite coincide con una página de API y la UI
 * informa explícitamente cuando hay más expedientes.
 */
export const ALL_CASES_CAP = 100;

export function useCaseList(filters: MaybeRefOrGetter<CaseListFilters>) {
  return useQuery({ queryKey: computed(() => ['cases', 'list', toValue(filters)]), queryFn: ({ signal }) => api.listCases(toValue(filters), { signal }), placeholderData: keepPreviousData });
}

/** Todos los expedientes autorizados (hasta `ALL_CASES_CAP`), ordenados por última actualización. `truncated` avisa si hay más. */
export async function fetchAllCases(signal?: AbortSignal): Promise<{ items: CaseRecord[]; total: number; truncated: boolean }> {
  const first = await api.listCases({ page: 1, limit: 100 }, { signal });
  const maxPages = Math.ceil(Math.min(first.total, ALL_CASES_CAP) / 100);
  // Las páginas son independientes. Pedirlas en paralelo evita que una vista
  // global espere una latencia completa por cada página adicional.
  const remaining = await Promise.all(Array.from({ length: Math.max(0, maxPages - 1) }, (_, index) => api.listCases({ page: index + 2, limit: 100 }, { signal })));
  const items = [...first.items, ...remaining.flatMap((page) => page.items)];
  return { items: items.slice(0, ALL_CASES_CAP), total: first.total, truncated: first.total > ALL_CASES_CAP };
}
export const useAllCases = (enabled: MaybeRefOrGetter<boolean> = true) => useQuery({ queryKey: ['cases', 'all'], queryFn: ({ signal }) => fetchAllCases(signal), enabled, staleTime: 2 * 60_000 });

export const useCase = (id: MaybeRefOrGetter<string>) => useQuery({ queryKey: computed(() => ['case', toValue(id), 'detail']), queryFn: ({ signal }) => api.getCase(toValue(id), { signal }) });
export const useTimeline = (id: MaybeRefOrGetter<string>, page: MaybeRefOrGetter<number> = 1, limit = 12, mode: MaybeRefOrGetter<TimelineMode> = 'relevant') =>
  useQuery({ queryKey: computed(() => ['case', toValue(id), 'timeline', toValue(page), limit, toValue(mode)]), queryFn: () => api.getTimeline(toValue(id), toValue(page), limit, toValue(mode)), placeholderData: keepPreviousData });

export const useCreateCase = () => useApiMutation((input: CreateCaseInput) => api.createCase(input), (created) => caseScope(created.id));
export const useUpdateCase = (caseId: string) => useApiMutation((input: UpdateCaseInput) => api.updateCase(caseId, input), () => caseScope(caseId));
export const useAssignCase = (caseId: string) => useApiMutation((input: { responsibleUserId: string; expectedVersion: number; reason?: string }) => api.assignCase(caseId, input), () => caseScope(caseId));
export const useTransitionCase = (caseId: string) => useApiMutation((input: TransitionInput) => api.transitionCase(caseId, input), () => caseScope(caseId));
export const useArchiveCase = (caseId: string) => useApiMutation((input: { expectedVersion: number; reason: string }) => api.archiveCase(caseId, input), () => caseScope(caseId));
