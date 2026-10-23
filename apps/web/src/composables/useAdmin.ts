import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { keepPreviousData, useQuery } from '@tanstack/vue-query';
import * as admin from '@/services/admin';
import * as ops from '@/services/caseOperations';
import type { CaseAccessLevel } from '@/types/api';
import { useApiMutation } from './useApiMutation';

export const useUserList = (query: MaybeRefOrGetter<admin.UserListQuery>) =>
  useQuery({ queryKey: computed(() => ['users', 'list', toValue(query)]), queryFn: () => admin.listUsers(toValue(query)), placeholderData: keepPreviousData });
export const useUser = (id: MaybeRefOrGetter<string>) => useQuery({ queryKey: computed(() => ['users', 'detail', toValue(id)]), queryFn: () => admin.getUser(toValue(id)) });

const USERS: string[][] = [['users']];
export const useCreateUser = () => useApiMutation((input: { email: string; displayName: string; roles: string[]; establishmentId: string }) => admin.createUser(input), () => [...USERS, ['establishments', 'mine']]);
export const useUpdateUser = () => useApiMutation((input: { id: string; email?: string; displayName?: string }) => { const { id, ...body } = input; return admin.updateUser(id, body); }, () => USERS);
export const useSetUserStatus = () => useApiMutation((input: { id: string; isActive: boolean }) => admin.setUserStatus(input.id, input.isActive), () => [...USERS, ['audit']]);
export const useAssignUserRoles = () => useApiMutation((input: { id: string; roles: string[] }) => admin.assignUserRoles(input.id, input.roles), () => [...USERS, ['audit']]);
export const useRevokeSessions = () => useApiMutation((id: string) => admin.revokeUserSessions(id), () => [['audit']]);
export const useResendInvitation = () => useApiMutation((id: string) => admin.resendInvitation(id), () => [['audit']]);

export const useRoles = (enabled: MaybeRefOrGetter<boolean> = true) => useQuery({ queryKey: ['roles'], queryFn: admin.listRoles, enabled, staleTime: 5 * 60_000 });
export const usePermissions = (enabled: MaybeRefOrGetter<boolean> = true) => useQuery({ queryKey: ['permissions'], queryFn: admin.listPermissions, enabled, staleTime: 5 * 60_000 });

export const useAudit = (query: MaybeRefOrGetter<admin.AuditQuery>) =>
  useQuery({ queryKey: computed(() => ['audit', toValue(query)]), queryFn: () => admin.listAudit(toValue(query)), placeholderData: keepPreviousData });

const ESTABLISHMENTS: string[][] = [['establishments']];
export const useEstablishments = (enabled: MaybeRefOrGetter<boolean> = true) => useQuery({ queryKey: ['establishments'], queryFn: admin.listEstablishments, enabled, staleTime: 10 * 60_000, retry: false });
export const useCreateEstablishment = () => useApiMutation((input: { code: string; name: string; institutionalIdentifier?: string }) => admin.createEstablishment(input), () => ESTABLISHMENTS);
export const useUpdateEstablishment = () => useApiMutation((input: { id: string; name?: string; institutionalIdentifier?: string | null; isActive?: boolean }) => { const { id, ...body } = input; return admin.updateEstablishment(id, body); }, () => ESTABLISHMENTS);
export const useSetMembership = () => useApiMutation((input: { establishmentId: string; userId: string; isActive: boolean }) => admin.setMembership(input.establishmentId, { userId: input.userId, isActive: input.isActive }), () => [['audit'], ['establishments']]);
export const useCreateStage = () => useApiMutation((input: { establishmentId: string; code: string; name: string; displayOrder: number }) => { const { establishmentId, ...body } = input; return admin.createStage(establishmentId, body); }, () => [['audit']]);
export const useUpdateStage = () => useApiMutation((input: { establishmentId: string; stageId: string; name?: string; displayOrder?: number; isActive?: boolean }) => { const { establishmentId, stageId, ...body } = input; return admin.updateStage(establishmentId, stageId, body); }, () => [['audit']]);
export const useGrantCaseAccess = () => useApiMutation((input: { caseId: string; userId: string; accessLevel: CaseAccessLevel; expiresAt?: string; reason?: string }) => { const { caseId, ...body } = input; return admin.grantCaseAccess(caseId, body); }, (_d, v) => [['audit'], ['case', v.caseId]]);
export const useRevokeCaseAccess = () => useApiMutation((input: { caseId: string; userId: string }) => admin.revokeCaseAccess(input.caseId, input.userId), (_d, v) => [['audit'], ['case', v.caseId]]);

// Protocolos (catálogo institucional)
export const useProtocols = (establishmentId: MaybeRefOrGetter<string | null>, enabled: MaybeRefOrGetter<boolean> = true) =>
  useQuery({ queryKey: computed(() => ['protocols', toValue(establishmentId)]), queryFn: () => ops.listProtocols(toValue(establishmentId)!), enabled: computed(() => Boolean(toValue(establishmentId)) && toValue(enabled)) });
export const useCreateProtocol = () => useApiMutation((input: { establishmentId: string; code: string; name: string; title: string; content: unknown }) => ops.createProtocol(input), () => [['protocols']]);
export const usePublishProtocolVersion = () => useApiMutation((input: { versionId: string; establishmentId: string }) => ops.publishProtocolVersion(input.versionId, input.establishmentId), () => [['protocols']]);
