import type { ColumnDef, FilterDef, Option } from '@/components/types';
import { ROLE_LABELS, roleOptions } from '@/lib/roles';
import { optionsFrom } from '@/lib/status';
import type { SessionUser, UserAccount } from '@/types/models';

export const userColumns: ColumnDef[] = [
  { field: 'displayName', header: 'Nombre', kind: 'strong' },
  { field: 'email', header: 'Correo', minScreen: 'md' },
  { field: 'roles', header: 'Rol', kind: 'roles', sortable: false, minScreen: 'lg' },
  { field: 'status', header: 'Estado', kind: 'status' },
  { field: 'createdAt', header: 'Creación', kind: 'date', minScreen: 'xl' }
];

export const userFilters: FilterDef[] = [
  { field: 'status', label: 'Estado', options: optionsFrom(['activo', 'inactivo', 'invitado']) }
];

/**
 * Roles que la sesión actual puede conceder. El servidor es quien valida; en la interfaz solo se evita ofrecer
 * `SYSTEM_ADMIN` a quien no lo tiene. Sin sesión (previsualización) ese rol aparece deshabilitado.
 */
export function assignableRoles(session: SessionUser | null): Option[] {
  const isAdmin = session?.roles.includes('SYSTEM_ADMIN') ?? false;
  return roleOptions.map((o) => (o.value === 'SYSTEM_ADMIN' && !isAdmin ? { ...o, disabled: true, label: `${o.label} (solo administración)` } : o));
}

export type UserAction = 'disable' | 'enable' | 'revoke' | 'resend';

export const USER_ACTIONS: Record<UserAction, { header: string; confirm: string; danger?: boolean; method: 'POST' | 'PATCH'; suffix: (id: string) => string; message: (u: UserAccount) => string; actionName: string }> = {
  disable: {
    header: 'Desactivar usuario', confirm: 'Desactivar', danger: true, method: 'PATCH', suffix: (id) => `/${id}/status`, actionName: 'la desactivación',
    message: (u) => `${u.displayName} no podrá iniciar sesión y se cerrarán sus sesiones activas. Su historial y auditoría se conservan.`
  },
  enable: {
    header: 'Reactivar usuario', confirm: 'Reactivar', method: 'PATCH', suffix: (id) => `/${id}/status`, actionName: 'la reactivación',
    message: (u) => `${u.displayName} podrá volver a iniciar sesión con sus roles actuales.`
  },
  revoke: {
    header: 'Revocar sesiones', confirm: 'Revocar sesiones', danger: true, method: 'POST', suffix: (id) => `/${id}/revoke-sessions`, actionName: 'la revocación de sesiones',
    message: (u) => `Se cerrarán todas las sesiones abiertas de ${u.displayName}. Deberá iniciar sesión nuevamente en todos sus dispositivos.`
  },
  resend: {
    header: 'Reenviar invitación', confirm: 'Reenviar invitación', method: 'POST', suffix: (id) => `/${id}/resend-invitation`, actionName: 'el reenvío de la invitación',
    message: (u) => `Se enviará un nuevo código de activación a ${u.email}. El código anterior dejará de ser válido.`
  }
};

export const roleDescription = (code: string) => ROLE_LABELS[code]?.description ?? '';
