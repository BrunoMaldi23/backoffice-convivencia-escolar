import type { AdminUser, AuditEntry, Establishment, EstablishmentMember, CaseStage, Membership, CaseAccessGrant, CaseAccessLevel, Page, Permission, Role, Uuid } from '@/types/api';
import { api } from './api';

/** Usuarios, roles, auditoría e instituciones: docs/api/users-roles-contract.md, audit-contract.md y backend-contracts.md. */

export interface UserListQuery { page?: number; limit?: number; search?: string; role?: string; active?: boolean }

export const listUsers = async (query: UserListQuery = {}): Promise<Page<AdminUser>> =>
  (await api.get<Page<AdminUser>>('/users', { params: { page: query.page ?? 1, limit: query.limit ?? 20, search: query.search || undefined, role: query.role || undefined, active: query.active } })).data;
export const getUser = async (id: Uuid): Promise<AdminUser> => (await api.get<AdminUser>(`/users/${id}`)).data;
export const createUser = async (input: { email: string; displayName: string; roles: string[]; establishmentId: Uuid }): Promise<AdminUser> => (await api.post<AdminUser>('/users', input)).data;
export const updateUser = async (id: Uuid, input: { email?: string; displayName?: string }): Promise<AdminUser> => (await api.patch<AdminUser>(`/users/${id}`, input)).data;
export const setUserStatus = async (id: Uuid, isActive: boolean): Promise<AdminUser> => (await api.patch<AdminUser>(`/users/${id}/status`, { isActive })).data;
export const assignUserRoles = async (id: Uuid, roles: string[]): Promise<AdminUser> => (await api.patch<AdminUser>(`/users/${id}/roles`, { roles })).data;
export const revokeUserSessions = async (id: Uuid): Promise<void> => { await api.post(`/users/${id}/revoke-sessions`, {}); };
export const resendInvitation = async (id: Uuid): Promise<void> => { await api.post(`/users/${id}/resend-invitation`, {}); };

export const listRoles = async (): Promise<Role[]> => (await api.get<Role[]>('/roles')).data;
export const getRole = async (id: Uuid): Promise<Role> => (await api.get<Role>(`/roles/${id}`)).data;
export const listPermissions = async (): Promise<Permission[]> => (await api.get<Permission[]>('/permissions')).data;

export interface AuditQuery { page?: number; limit?: number; action?: string; targetType?: string }
export const listAudit = async (query: AuditQuery = {}): Promise<Page<AuditEntry>> =>
  (await api.get<Page<AuditEntry>>('/audit', { params: { page: query.page ?? 1, limit: query.limit ?? 20, action: query.action || undefined, targetType: query.targetType || undefined } })).data;

export const listEstablishments = async (): Promise<Establishment[]> => (await api.get<Establishment[]>('/establishments')).data;
export const createEstablishment = async (input: { code: string; name: string; institutionalIdentifier?: string }): Promise<Establishment> => (await api.post<Establishment>('/establishments', input)).data;
export const updateEstablishment = async (id: Uuid, input: { name?: string; institutionalIdentifier?: string | null; isActive?: boolean }): Promise<Establishment> => (await api.patch<Establishment>(`/establishments/${id}`, input)).data;
export const setMembership = async (establishmentId: Uuid, input: { userId: Uuid; isActive: boolean }): Promise<Membership> => (await api.post<Membership>(`/establishments/${establishmentId}/memberships`, input)).data;
export const createStage = async (establishmentId: Uuid, input: { code: string; name: string; displayOrder: number }): Promise<CaseStage> => (await api.post<CaseStage>(`/establishments/${establishmentId}/stages`, input)).data;
export const updateStage = async (establishmentId: Uuid, stageId: Uuid, input: { name?: string; displayOrder?: number; isActive?: boolean }): Promise<CaseStage> => (await api.patch<CaseStage>(`/establishments/${establishmentId}/stages/${stageId}`, input)).data;
export const grantCaseAccess = async (caseId: Uuid, input: { userId: Uuid; accessLevel: CaseAccessLevel; expiresAt?: string; reason?: string }): Promise<CaseAccessGrant> => (await api.post<CaseAccessGrant>(`/cases/${caseId}/access-grants`, input)).data;
export const revokeCaseAccess = async (caseId: Uuid, userId: Uuid): Promise<CaseAccessGrant> => (await api.post<CaseAccessGrant>(`/cases/${caseId}/access-grants/${userId}/revoke`, {})).data;

/** Lecturas que no exigen permisos administrativos: solo pertenecer al establecimiento. */
export const listMyEstablishments = async (): Promise<Establishment[]> => (await api.get<Establishment[]>('/me/establishments')).data;
export const listStages = async (establishmentId: Uuid): Promise<CaseStage[]> => (await api.get<CaseStage[]>(`/establishments/${establishmentId}/stages`)).data;
export const listMembers = async (establishmentId: Uuid): Promise<EstablishmentMember[]> => (await api.get<EstablishmentMember[]>(`/establishments/${establishmentId}/members`)).data;
