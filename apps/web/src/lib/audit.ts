/** Etiquetas legibles para las acciones de auditoría publicadas en el contrato del backend. */
export const AUDIT_ACTIONS: Record<string, string> = {
  AUTH_LOGIN: 'Inicio de sesión',
  AUTH_LOGIN_FAILED: 'Intento de ingreso fallido',
  AUTH_LOGOUT: 'Cierre de sesión',
  ADMIN_ACCESS_DENIED: 'Acceso administrativo denegado',
  USER_CREATED: 'Usuario creado',
  USER_UPDATED: 'Usuario actualizado',
  USER_ACTIVATED: 'Usuario reactivado',
  USER_DISABLED: 'Usuario desactivado',
  USER_ROLES_CHANGED: 'Roles modificados',
  USER_SESSIONS_REVOKED: 'Sesiones revocadas',
  USER_INVITATION_SENT: 'Invitación enviada',
  INVITATION_ACCEPTED: 'Invitación aceptada',
  PASSWORD_RESET_REQUEST: 'Solicitud de recuperación de contraseña',
  PASSWORD_RESET: 'Contraseña restablecida',
  PASSWORD_RESET_DELIVERY_FAILED: 'Fallo en el envío de recuperación'
};

/** El backend usa códigos en mayúsculas (`USER`); se aceptan ambas formas. */
export const TARGET_TYPES: Record<string, string> = { session: 'Sesión', user: 'Usuario', route: 'Ruta administrativa', role: 'Rol' };

export const targetTypeLabel = (code: string) => TARGET_TYPES[code.toLowerCase()] ?? code;

export const auditActionLabel = (code: string) => AUDIT_ACTIONS[code] ?? code;
