import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { keepPreviousData, useQuery } from '@tanstack/vue-query';
import * as ops from '@/services/caseOperations';
import type { ReferralInput, ReferralStatus, SummonsInput, SummonsStatus, UpdateReferralInput, UpdateSummonsInput } from '@/types/api';
import { caseScope, useApiMutation } from './useApiMutation';

/** Citaciones y derivaciones, por expediente y en listados globales de los expedientes visibles. */
type Id = MaybeRefOrGetter<string>;
type Enabled = MaybeRefOrGetter<boolean>;

export const useCaseSummons = (caseId: Id, enabled: Enabled = true) =>
  useQuery({ queryKey: computed(() => ['case', toValue(caseId), 'summons']), queryFn: () => ops.listCaseSummons(toValue(caseId)), enabled });
export const useCaseReferrals = (caseId: Id, enabled: Enabled = true) =>
  useQuery({ queryKey: computed(() => ['case', toValue(caseId), 'referrals']), queryFn: () => ops.listCaseReferrals(toValue(caseId)), enabled });

export const useSummonsList = (query: MaybeRefOrGetter<ops.ActionListQuery<SummonsStatus> & { from?: string; to?: string }>, enabled: Enabled = true) =>
  useQuery({ queryKey: computed(() => ['summons', 'list', toValue(query)]), queryFn: () => ops.listSummons(toValue(query)), enabled, placeholderData: keepPreviousData });
export const useReferralsList = (query: MaybeRefOrGetter<ops.ActionListQuery<ReferralStatus>>, enabled: Enabled = true) =>
  useQuery({ queryKey: computed(() => ['referrals', 'list', toValue(query)]), queryFn: () => ops.listReferrals(toValue(query)), enabled, placeholderData: keepPreviousData });

const scope = (caseId: string) => [...caseScope(caseId), ['summons'], ['referrals'], ['audit']];

export const useCreateSummons = (caseId: string) => useApiMutation((input: SummonsInput) => ops.createSummons(caseId, input), () => scope(caseId));
export const useUpdateSummons = (caseId: string) => useApiMutation((input: { id: string } & UpdateSummonsInput) => { const { id, ...body } = input; return ops.updateSummons(caseId, id, body); }, () => scope(caseId));
export const useCreateReferral = (caseId: string) => useApiMutation((input: ReferralInput) => ops.createReferral(caseId, input), () => scope(caseId));
export const useUpdateReferral = (caseId: string) => useApiMutation((input: { id: string } & UpdateReferralInput) => { const { id, ...body } = input; return ops.updateReferral(caseId, id, body); }, () => scope(caseId));
