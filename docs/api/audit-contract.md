# Auditoría de seguridad

`GET /api/audit` requiere sesión y permiso `audit.read`. Query: `page` desde 1, `limit` 1–100 (20 por defecto), `action` y `targetType` hasta 80 caracteres. Respuesta `{items,total,page,limit}`. Cada elemento contiene `{id,actorUserId,action,targetType,targetId,metadata,createdAt}`. Metadatos solo incluyen resultado, campos modificados o ruta administrativa; nunca contraseña, token ni cookie.

Acciones actuales incluyen `AUTH_LOGIN`, `AUTH_LOGIN_FAILED`, `AUTH_LOGOUT`, `ADMIN_ACCESS_DENIED`, `USER_CREATED`, `USER_UPDATED`, `USER_ACTIVATED`, `USER_DISABLED`, `USER_ROLES_CHANGED`, `USER_SESSIONS_REVOKED`, `USER_INVITATION_SENT`, `INVITATION_ACCEPTED`, `PASSWORD_RESET_REQUEST`, `PASSWORD_RESET`, `PASSWORD_RESET_DELIVERY_FAILED`.

No hay endpoints de modificación ni eliminación de auditoría. Errores: 400 filtros inválidos, 401 sin sesión, 403 sin permiso.
