/** Contratos transversales reservados para las siguientes fases. */
export interface ApiHealthResponse {
  status: 'ok' | 'error';
  database: 'connected' | 'disconnected';
  timestamp: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
}
export interface AuthSessionResponse { user: AuthenticatedUser }
export interface AdminUser extends AuthenticatedUser {
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface Page<T> { items: T[]; total: number; page: number; limit: number }
export interface RoleSummary { id: string; name: string; description: string | null; permissions: string[] }
export interface PermissionSummary { id: string; code: string; description: string | null }
export interface AuditEntry {
  id: string; actorUserId: string | null; action: string; targetType: string;
  targetId: string | null; metadata: Record<string, unknown> | null; createdAt: string;
}
