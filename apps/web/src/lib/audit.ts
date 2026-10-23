/** Etiquetas legibles para las acciones y recursos de auditoría que registra el backend. Un código desconocido se muestra tal cual. */
export const AUDIT_ACTIONS: Record<string, string> = {
  AUTH_LOGIN: 'Inicio de sesión', AUTH_LOGIN_FAILED: 'Intento de ingreso fallido', AUTH_LOGOUT: 'Cierre de sesión', ADMIN_ACCESS_DENIED: 'Acceso administrativo denegado',
  USER_CREATED: 'Usuario creado', USER_UPDATED: 'Usuario actualizado', USER_ACTIVATED: 'Usuario reactivado', USER_DISABLED: 'Usuario desactivado', USER_ROLES_CHANGED: 'Roles modificados',
  USER_SESSIONS_REVOKED: 'Sesiones revocadas', USER_INVITATION_SENT: 'Invitación enviada', INVITATION_ACCEPTED: 'Invitación aceptada', PASSWORD_RESET_REQUEST: 'Solicitud de recuperación de contraseña',
  PASSWORD_RESET: 'Contraseña restablecida', PASSWORD_RESET_DELIVERY_FAILED: 'Fallo en el envío de recuperación',
  ESTABLISHMENT_CREATED: 'Establecimiento creado', ESTABLISHMENT_UPDATED: 'Establecimiento modificado', ESTABLISHMENT_MEMBERSHIP_CHANGED: 'Membresía modificada', CASE_STAGE_CREATED: 'Etapa creada', CASE_STAGE_UPDATED: 'Etapa modificada',
  CASE_CREATED: 'Expediente creado', CASE_UPDATED: 'Expediente actualizado', CASE_ASSIGNED: 'Responsable asignado', CASE_PAUSED: 'Expediente pausado', CASE_RESUMED: 'Expediente reanudado',
  CASE_RESOLVED: 'Expediente resuelto', CASE_CLOSED: 'Expediente cerrado', CASE_REOPENED: 'Expediente reabierto', CASE_TRANSITIONED: 'Cambio de estado', CASE_ACCESS_GRANTED: 'Acceso concedido', CASE_ACCESS_REVOKED: 'Acceso revocado',
  REPORT_CREATED: 'Denuncia registrada', REPORT_UPDATED: 'Denuncia modificada', PARTICIPANT_CREATED: 'Involucrado creado', PARTICIPANT_LINKED: 'Involucrado asociado', PARTICIPANT_UNLINKED: 'Involucrado desvinculado',
  INTERVIEW_CREATED: 'Entrevista registrada', INTERVIEW_UPDATED: 'Entrevista modificada', INTERVIEW_FINALIZED: 'Entrevista finalizada', INTERVIEW_CORRECTED: 'Entrevista corregida',
  DOCUMENT_UPLOADED: 'Documento cargado', PROTOCOL_CREATED: 'Protocolo creado', PROTOCOL_PUBLISHED: 'Protocolo publicado', PROTOCOL_APPLIED: 'Protocolo aplicado', PROTOCOL_REVOKED: 'Aplicación de protocolo revocada',
  MEASURE_CREATED: 'Medida registrada', MEASURE_UPDATED: 'Medida actualizada', FOLLOW_UP_CREATED: 'Seguimiento registrado', TASK_CREATED: 'Tarea creada', TASK_COMPLETED: 'Tarea completada'
};

export const TARGET_TYPES: Record<string, string> = {
  session: 'Sesión', user: 'Usuario', route: 'Ruta administrativa', role: 'Rol', case: 'Expediente', interview: 'Entrevista', establishment: 'Establecimiento',
  establishment_membership: 'Membresía', case_stage: 'Etapa', case_report: 'Denuncia', case_participant: 'Involucrado', case_document: 'Documento', protocol_template: 'Protocolo',
  protocol_version: 'Versión de protocolo', case_protocol_application: 'Aplicación de protocolo', case_measure: 'Medida', case_follow_up: 'Seguimiento', case_task: 'Tarea'
};

/** El backend usa códigos en mayúsculas (`USER`); se aceptan ambas formas. */
export const targetTypeLabel = (code: string) => TARGET_TYPES[code.toLowerCase()] ?? code;
export const auditActionLabel = (code: string) => AUDIT_ACTIONS[code] ?? code.toLowerCase().replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
/** Resultado registrado por el backend en `metadata.result`; vacío si el evento no lo informa. */
export const auditResult = (metadata: Record<string, unknown> | null): string | null => (metadata && typeof metadata.result === 'string' ? metadata.result : null);
